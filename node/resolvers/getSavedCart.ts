import { APP_NAME } from '../constants'
import { resolveShopper, warnOnIdentityArgMismatch } from '../utils/identity'
import {
  fetchOwnership,
  isAcceptable,
  logOwnershipRejection,
  logUnauthenticated,
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
  const shopper = await resolveShopper(ctx)

  if (!shopper) {
    logUnauthenticated(ctx, 'getSavedCart')

    return null
  }

  warnOnIdentityArgMismatch(ctx, 'getSavedCart', userId, shopper)

  const {
    clients: { vbase, checkoutIO },
  } = ctx

  const orderFormId: string | null = await vbase.getJSON(
    APP_NAME,
    shopper.userId,
    true
  )

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
    await vbase.saveJSON(APP_NAME, shopper.userId, null)
    logOwnershipRejection(ctx, 'getSavedCart', verdict, reason)

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
