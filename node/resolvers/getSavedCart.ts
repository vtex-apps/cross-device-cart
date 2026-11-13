import { APP_NAME } from '../constants'
import { resolveShopper, warnOnIdentityArgMismatch } from '../utils/identity'
import {
  fetchOwnership,
  isAcceptable,
  logOwnershipRejection,
  logAuthResult,
  logVbaseError,
} from '../utils/ownership'

/**
 * Retrieve the caller's own saved OrderForm ID.
 * The identity comes only from the VTEX ID-validated store token;
 * `userId` and `userType` arguments are accepted for compatibility and ignored.
 * A transient owner-lookup failure keeps the key and throws, so the storefront
 * (old and new bundles alike) sees a query error and does not overwrite it.
 * @param {boolean} nullOnEmpty - Return null if the orderForm doesn't have items
 * @returns {string | null} orderFormId
 */
export const getSavedCart = async (
  _: unknown,
  {
    nullOnEmpty,
    userId,
  }: { userId?: string; nullOnEmpty?: boolean; userType?: string },
  ctx: Context
): Promise<string | null> => {
  // Authentication control: this early return is the gate. The `@auth(scope: PUBLIC)`
  // directive in the schema allows anyone and enforces nothing.
  const auth = await resolveShopper(ctx)

  logAuthResult(ctx, 'getSavedCart', auth)

  if (auth.authResult !== 'ok') {
    if (auth.authResult === 'unavailable') {
      // VTEX ID outage is not "logged out": surface an error so the storefront
      // does not overwrite the reference.
      throw new Error('saved cart lookup unavailable')
    }

    return null
  }

  const { shopper } = auth

  warnOnIdentityArgMismatch(ctx, 'getSavedCart', userId, shopper)

  const {
    clients: { vbase, checkoutIO },
  } = ctx

  let orderFormId: string | null

  try {
    orderFormId = await vbase.getJSON<string | null>(
      APP_NAME,
      shopper.userId,
      true
    )
  } catch (error) {
    logVbaseError(ctx, 'getSavedCart', error)

    // Never null: the storefront would overwrite the reference.
    throw new Error('saved cart lookup unavailable')
  }

  if (!orderFormId) {
    return null
  }

  const { verdict, reason } = await fetchOwnership(
    ctx,
    orderFormId,
    shopper,
    'getSavedCart'
  )

  if (verdict === 'LOOKUP_FAILED') {
    // Transient Checkout failure: keep the key and surface an error.
    throw new Error('saved cart lookup unavailable')
  }

  if (!isAcceptable(verdict)) {
    // Includes FR-D1 email_mismatch (shared classifier).
    try {
      await vbase.saveJSON(APP_NAME, shopper.userId, null)
    } catch (error) {
      logVbaseError(ctx, 'getSavedCart', error)

      throw new Error('saved cart lookup unavailable')
    }

    logOwnershipRejection(ctx, 'getSavedCart', verdict, reason)

    return null
  }

  if (nullOnEmpty) {
    let savedItems: PartialItem[]

    try {
      savedItems = await checkoutIO.getItems(orderFormId)
    } catch (error) {
      ctx.vtex.logger.warn({
        message: 'cross-device-cart.checkout_error',
        operation: 'getSavedCart',
        status: (error as any)?.response?.status ?? null,
      })

      throw new Error('saved cart lookup unavailable')
    }

    if (!savedItems.length) {
      return null
    }
  }

  return orderFormId
}
