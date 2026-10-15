import { APP_NAME } from '../constants'
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
  logUnauthenticated,
} from '../utils/ownership'

const OPERATION = 'getSavedCart'

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
  // the schema allows everyone and enforces nothing.
  const shopper = await resolveShopper(ctx)

  if (!shopper) {
    logUnauthenticated(ctx, OPERATION)

    return null
  }

  warnOnIdentityArgMismatch(ctx, OPERATION, userId, shopper)

  const key = savedCartKey(shopper.userId, await resolveSalesChannel(ctx))
  const orderFormId = await vbase.getJSON<string | null>(APP_NAME, key, true)

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
    throw new Error('saved cart lookup unavailable')
  }

  if (!isAcceptable(verdict)) {
    await vbase.saveJSON(APP_NAME, key, null)
    logOwnershipRejection(ctx, OPERATION, verdict, reason)

    return null
  }

  if (nullOnEmpty) {
    const savedItems = await checkoutIO.getItems(orderFormId)

    if (!savedItems.length) {
      return null
    }
  }

  return orderFormId
}
