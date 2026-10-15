import { isValidOrderFormId } from './identity'

const ACCEPTABLE: VerdictOrFailure[] = ['OWNED', 'ANONYMOUS']

export function isCallCenterUserType(userType?: string | null): boolean {
  if (!userType) {
    return false
  }

  return userType.replace(/[_\s-]/g, '').toLowerCase() === 'callcenteroperator'
}

const isMaskedEmail = (email: string) => email.includes('*')

/**
 * Ownership by userProfileId (FR-B2). Rules are evaluated in order;
 * only OWNED and ANONYMOUS are acceptable. A cart with a client email or a
 * shipping address but no userProfileId is UNVERIFIED_PROFILE (refused).
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
    // Case-insensitive: Checkout and VTEX ID may return the same GUID in different case.
    return owner.userProfileId.toLowerCase() === shopper.userId.toLowerCase()
      ? 'OWNED'
      : 'FOREIGN'
  }

  // hasClientProfile: client email or shipping address present (PII).
  if (owner.hasClientProfile) {
    return 'UNVERIFIED_PROFILE'
  }

  return 'ANONYMOUS'
}

/**
 * FR-B2 plus FR-D1 (shared by all resolvers): an OWNED cart whose unmasked
 * email is not the VTEX ID login email is FOREIGN (email_mismatch). Masked or
 * unverifiable emails keep OWNED with a reason, so adoption can log the
 * residual risk. Emails are compared in memory only.
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

export function isAcceptable(verdict: VerdictOrFailure): boolean {
  return ACCEPTABLE.includes(verdict)
}

/** Owner lookup + classification. Never throws: lookup errors are LOOKUP_FAILED. */
export async function fetchOwnership(
  ctx: Context,
  orderFormId: string,
  shopper: ShopperIdentity,
  operation: CrossCartOperation
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
      status: (error as any)?.response?.status ?? null,
    })

    return { verdict: 'LOOKUP_FAILED' }
  }
}

/** PII-free: no userId, email, address or orderFormId. */
export function logOwnershipRejection(
  ctx: Context,
  operation: CrossCartOperation,
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
  operation: CrossCartOperation,
  reason: OwnershipReason
) {
  ctx.vtex.logger.info({
    message: 'cross-device-cart.adoption_residual_risk',
    operation,
    reason,
  })
}

export function logUnauthenticated(
  ctx: Context,
  operation: CrossCartOperation
) {
  ctx.vtex.logger.info({
    message: 'cross-device-cart.unauthenticated',
    operation,
  })
}
