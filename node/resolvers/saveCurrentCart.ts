import { APP_NAME } from '../constants'
import {
  isValidOrderFormId,
  matchesCheckoutCookie,
  resolveShopper,
} from '../utils/identity'
import {
  fetchOwnership,
  isAcceptable,
  logOwnershipRejection,
  logUnauthenticated,
} from '../utils/ownership'

export const SAVE_RESULT = {
  success: 'success',
  unauthenticated: 'unauthenticated',
  rejected: 'rejected',
  callCenter: 'Not saved is call center operator',
} as const

/**
 * Store an OrderForm ID reference for the caller (identity from the store token).
 * `userId` and `userType` arguments are accepted for compatibility and ignored.
 * @param {string | null} orderFormId - null clears the caller's own reference
 */
export const saveCurrentCart = async (
  _: unknown,
  {
    orderFormId,
  }: { userId?: string; orderFormId?: string | null; userType?: string },
  ctx: Context
): Promise<string> => {
  const shopper = await resolveShopper(ctx)

  if (!shopper) {
    logUnauthenticated(ctx, 'saveCurrentCart')

    return SAVE_RESULT.unauthenticated
  }

  const {
    clients: { vbase },
  } = ctx

  if (!orderFormId) {
    await vbase.saveJSON(APP_NAME, shopper.userId, null)

    return SAVE_RESULT.success
  }

  if (!isValidOrderFormId(orderFormId)) {
    logOwnershipRejection(ctx, 'saveCurrentCart', 'NOT_FOUND')

    return SAVE_RESULT.rejected
  }

  // FR-D2: only the cart this browser actually holds can be saved.
  if (!matchesCheckoutCookie(ctx, orderFormId, 'saveCurrentCart')) {
    logOwnershipRejection(
      ctx,
      'saveCurrentCart',
      'COOKIE_MISMATCH',
      'cookie_mismatch'
    )

    return SAVE_RESULT.rejected
  }

  const { verdict, reason } = await fetchOwnership(
    ctx,
    orderFormId,
    shopper,
    'saveCurrentCart'
  )

  if (verdict === 'LOOKUP_FAILED') {
    return SAVE_RESULT.rejected
  }

  if (verdict === 'CALL_CENTER') {
    return SAVE_RESULT.callCenter
  }

  if (!isAcceptable(verdict)) {
    logOwnershipRejection(ctx, 'saveCurrentCart', verdict, reason)

    return SAVE_RESULT.rejected
  }

  await vbase.saveJSON(APP_NAME, shopper.userId, orderFormId)

  return SAVE_RESULT.success
}
