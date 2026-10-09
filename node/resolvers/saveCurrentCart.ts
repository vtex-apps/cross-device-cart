import { APP_NAME } from '../constants'
import {
  matchesCheckoutCookie,
  resolveSalesChannel,
  resolveShopper,
  savedCartKey,
} from '../utils/identity'
import {
  fetchOwnership,
  isAcceptable,
  logOwnershipRejection,
  logUnauthenticated,
} from '../utils/ownership'

const OPERATION = 'saveCurrentCart'

/**
 * Stores the caller's current orderForm id as their cross-device reference.
 * Only orderForms owned by the caller or fully anonymous are stored.
 * `userId`, `userType` and `salesChannel` arguments are ignored.
 */
export const saveCurrentCart = async (
  _: unknown,
  { orderFormId }: SaveCurrentCartArgs,
  ctx: Context
): Promise<SaveCurrentCartResult> => {
  const {
    clients: { vbase },
    vtex: { logger },
  } = ctx

  const shopper = await resolveShopper(ctx)

  if (!shopper) {
    logUnauthenticated(ctx, OPERATION)

    return 'unauthenticated'
  }

  const key = savedCartKey(shopper.userId, await resolveSalesChannel(ctx))

  if (!orderFormId) {
    await vbase.saveJSON(APP_NAME, key, null)

    return 'success'
  }

  if (!matchesCheckoutCookie(ctx, orderFormId, OPERATION)) {
    logOwnershipRejection(ctx, OPERATION, 'COOKIE_MISMATCH', 'cookie_mismatch')

    return 'rejected'
  }

  const { verdict, reason } = await fetchOwnership(
    ctx,
    orderFormId,
    shopper,
    OPERATION
  )

  if (verdict === 'CALL_CENTER') {
    logger.info({
      message: 'cross-device-cart.call_center_skipped',
      operation: OPERATION,
    })

    return 'Not saved is call center operator'
  }

  if (!isAcceptable(verdict)) {
    if (verdict !== 'LOOKUP_FAILED') {
      logOwnershipRejection(ctx, OPERATION, verdict, reason)
    }

    return 'rejected'
  }

  await vbase.saveJSON(APP_NAME, key, orderFormId)

  return 'success'
}
