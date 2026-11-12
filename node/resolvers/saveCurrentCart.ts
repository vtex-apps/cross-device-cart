import { APP_NAME } from '../constants'
import {
  matchesCheckoutCookie,
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

const OPERATION = 'saveCurrentCart'

/**
 * Stores the caller's current orderForm id as their cross-device reference.
 * Only orderForms owned by the caller or fully anonymous are stored.
 * `userId`, `userType` and `salesChannel` arguments are ignored.
 */
export const saveCurrentCart = async (
  _: unknown,
  { orderFormId, userId }: SaveCurrentCartArgs,
  ctx: Context
): Promise<SaveCurrentCartResult> => {
  const {
    clients: { vbase },
    vtex: { logger },
  } = ctx

  // Authentication control: no valid store-user token -> 'unauthenticated' before any
  // VBase, Checkout or cookie access. The `@auth(scope: PUBLIC)` directive in
  // the schema allows everyone and enforces nothing. A VTEX ID outage is
  // 'rejected' (nothing written), not 'unauthenticated'.
  const auth = await resolveShopper(ctx, OPERATION)

  if (auth.authResult === 'unavailable') {
    return 'rejected'
  }

  if (auth.authResult !== 'ok') {
    return 'unauthenticated'
  }

  const { shopper } = auth

  warnOnIdentityArgMismatch(ctx, OPERATION, userId, shopper)

  const key = savedCartKey(shopper.userId, await resolveSalesChannel(ctx))

  const write = async (value: string | null): Promise<boolean> => {
    try {
      await vbase.saveJSON(APP_NAME, key, value)

      return true
    } catch (error) {
      logVbaseError(ctx, OPERATION, error)

      return false
    }
  }

  if (!orderFormId) {
    return (await write(null)) ? 'success' : 'rejected'
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

  return (await write(orderFormId)) ? 'success' : 'rejected'
}
