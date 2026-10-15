import { httpStatus } from './httpStatus'
import { isValidOrderFormId } from './identity'

const ACCEPTABLE: VerdictOrFailure[] = ['OWNED', 'ANONYMOUS']

export const isCallCenterUserType = (userType?: string | null): boolean =>
  typeof userType === 'string' &&
  userType.replace(/[_\s-]/g, '').toLowerCase() === 'callcenteroperator'

const isMaskedEmail = (email: string) => email.includes('*')

/**
 * Ownership by userProfileId alone (FR-B2). A cart without userProfileId that
 * has a client email or a shipping address (`hasClientProfile`) is
 * UNVERIFIED_PROFILE and is refused; only a cart with neither is ANONYMOUS.
 */
export function classifyOwnership(
  owner: OrderFormOwner | null,
  shopper: ShopperIdentity
): OwnershipVerdict {
  if (!owner) {
    return 'NOT_FOUND'
  }

  if (isCallCenterUserType(owner.userType)) {
    return 'CALL_CENTER'
  }

  if (owner.userProfileId) {
    return owner.userProfileId.toLowerCase() === shopper.userId.toLowerCase()
      ? 'OWNED'
      : 'FOREIGN'
  }

  return owner.hasClientProfile ? 'UNVERIFIED_PROFILE' : 'ANONYMOUS'
}

/**
 * FR-B2 plus FR-D1: an OWNED cart whose unmasked email is not the VTEX ID
 * login email is FOREIGN (email_mismatch). Masked or unverifiable emails keep
 * OWNED, with a reason so that adoption can log the residual risk.
 */
export function classifyOwnershipWithReason(
  owner: OrderFormOwner | null,
  shopper: ShopperIdentity
): OwnershipResult {
  const verdict = classifyOwnership(owner, shopper)

  if (verdict !== 'OWNED' || !owner?.email) {
    return { verdict }
  }

  if (isMaskedEmail(owner.email)) {
    return { verdict, reason: 'email_masked' }
  }

  if (!shopper.email) {
    return { verdict, reason: 'email_unverified' }
  }

  return owner.email.trim().toLowerCase() === shopper.email
    ? { verdict }
    : { verdict: 'FOREIGN', reason: 'email_mismatch' }
}

export const isAcceptable = (verdict: VerdictOrFailure): boolean =>
  ACCEPTABLE.includes(verdict)

export async function fetchOwnership(
  ctx: Context,
  orderFormId: string,
  shopper: ShopperIdentity,
  operation: string
): Promise<OwnershipResult> {
  if (!isValidOrderFormId(orderFormId)) {
    return { verdict: 'NOT_FOUND' }
  }

  try {
    const owner = await ctx.clients.checkoutRest.getOrderFormOwner(orderFormId)

    return classifyOwnershipWithReason(owner, shopper)
  } catch (error) {
    ctx.vtex.logger.warn({
      message: 'cross-device-cart.owner_lookup_failed',
      operation,
      status: httpStatus(error) ?? null,
    })

    return { verdict: 'LOOKUP_FAILED' }
  }
}

export function logOwnershipRejection(
  ctx: Context,
  operation: string,
  verdict: RejectionReason,
  reason?: OwnershipReason
) {
  ctx.vtex.logger.warn({
    message: 'cross-device-cart.ownership_rejected',
    operation,
    verdict,
    ...(reason ? { reason } : {}),
  })
}

export function logResidualRisk(
  ctx: Context,
  operation: string,
  reason: OwnershipReason
) {
  ctx.vtex.logger.info({
    message: 'cross-device-cart.adoption_residual_risk',
    operation,
    reason,
  })
}

export function logUnauthenticated(ctx: Context, operation: string) {
  ctx.vtex.logger.info({
    message: 'cross-device-cart.unauthenticated',
    operation,
  })
}
