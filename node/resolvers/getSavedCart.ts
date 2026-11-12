import { APP_NAME } from '../constants'
import { httpStatus } from '../utils/httpStatus'
import {
  resolveSalesChannel,
  resolveShopper,
  savedCartKey,
  warnOnIdentityArgMismatch,
} from '../utils/identity'
import {
  fetchOwnership,
  isAcceptable,
  logOwnershipRejection,
  logVbaseError,
} from '../utils/ownership'

const OPERATION = 'getSavedCart'
const LOOKUP_UNAVAILABLE = 'saved cart lookup unavailable'

/**
 * Returns the caller's saved orderForm id, or null.
 * Identity and sales channel are derived server-side; `userId`, `userType`
 * and `salesChannel` arguments are accepted for compatibility and ignored.
 * References to orderForms the caller does not own are deleted on read.
 */
export const getSavedCart = async (
  _: unknown,
  { nullOnEmpty, userId }: GetSavedCartArgs,
  ctx: Context
): Promise<string | null> => {
  const {
    clients: { vbase, checkoutIO },
  } = ctx

  // Authentication control: no valid store-user token -> null before any
  // VBase, Checkout or cookie access. The `@auth(scope: PUBLIC)` directive in
  // the schema allows everyone and enforces nothing. A VTEX ID outage throws
  // like a failed owner lookup, so the storefront does not overwrite the
  // reference with the current cart.
  const auth = await resolveShopper(ctx, OPERATION)

  if (auth.authResult === 'unavailable') {
    throw new Error(LOOKUP_UNAVAILABLE)
  }

  if (auth.authResult !== 'ok') {
    return null
  }

  const { shopper } = auth

  warnOnIdentityArgMismatch(ctx, OPERATION, userId, shopper)

  const key = savedCartKey(shopper.userId, await resolveSalesChannel(ctx))
  let orderFormId: string | null

  try {
    orderFormId = await vbase.getJSON<string | null>(APP_NAME, key, true)
  } catch (error) {
    // The platform logs the query variables of a throwing resolver, so the
    // VBase failure is logged here without ids. Never null: it would make the
    // storefront overwrite the reference.
    logVbaseError(ctx, OPERATION, error)
    throw new Error(LOOKUP_UNAVAILABLE)
  }

  if (!orderFormId) {
    return null
  }

  const { verdict, reason } = await fetchOwnership(
    ctx,
    orderFormId,
    shopper,
    OPERATION
  )

  if (verdict === 'LOOKUP_FAILED') {
    // Transient failure: the key is kept (FR-B4). A GraphQL error, unlike null,
    // makes every storefront bundle (old or new) skip saveCurrentCart, so the
    // preserved reference is not overwritten by the current cart.
    throw new Error(LOOKUP_UNAVAILABLE)
  }

  if (!isAcceptable(verdict)) {
    try {
      await vbase.saveJSON(APP_NAME, key, null)
    } catch (error) {
      logVbaseError(ctx, OPERATION, error)
      throw new Error(LOOKUP_UNAVAILABLE)
    }

    logOwnershipRejection(ctx, OPERATION, verdict, reason)

    return null
  }

  if (nullOnEmpty) {
    let savedItems: PartialItem[]

    try {
      savedItems = await checkoutIO.getItems(orderFormId)
    } catch (error) {
      ctx.vtex.logger.warn({
        message: 'cross-device-cart.checkout_error',
        operation: OPERATION,
        status: httpStatus(error) ?? null,
      })
      throw new Error(LOOKUP_UNAVAILABLE)
    }

    if (!savedItems.length) {
      return null
    }
  }

  return orderFormId
}
