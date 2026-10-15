/* eslint-disable jest/no-expect-resolves */
import {
  classifyOwnership,
  classifyOwnershipWithReason,
  fetchOwnership,
  isAcceptable,
  isCallCenterUserType,
} from '../utils/ownership'
import {
  EMAIL_A,
  mockContext,
  owners,
  OF_A,
  OF_A2,
  OF_A_GUEST_B,
  OF_A_MASKED,
  OF_ANON,
  OF_B,
  OF_CALL_CENTER,
  OF_ADDRESS_ONLY,
  OF_IDENTIFIED,
  SHOPPER_A,
} from '../testUtils/mockContext'

const shopper = { userId: SHOPPER_A, email: EMAIL_A }

describe('classifyOwnership', () => {
  it.each([
    [OF_A, 'OWNED'],
    [OF_B, 'FOREIGN'],
    [OF_ANON, 'ANONYMOUS'],
    [OF_IDENTIFIED, 'UNVERIFIED_PROFILE'],
    [OF_ADDRESS_ONLY, 'UNVERIFIED_PROFILE'],
    [OF_CALL_CENTER, 'CALL_CENTER'],
  ])('%s -> %s', (id, verdict) => {
    expect(classifyOwnership(owners[id], shopper)).toBe(verdict)
  })

  it('compares userProfileId case-insensitively', () => {
    expect(
      classifyOwnership(
        { ...owners[OF_A], userProfileId: SHOPPER_A.toUpperCase() },
        shopper
      )
    ).toBe('OWNED')
    expect(
      classifyOwnership(owners[OF_A], {
        ...shopper,
        userId: SHOPPER_A.toUpperCase(),
      })
    ).toBe('OWNED')
  })

  it('NOT_FOUND when the owner lookup returned null', () => {
    expect(classifyOwnership(null, shopper)).toBe('NOT_FOUND')
  })

  it('call-center wins even when the operator cart carries the shopper profile', () => {
    expect(
      classifyOwnership(
        { ...owners[OF_A], userType: 'CALL_CENTER_OPERATOR' },
        shopper
      )
    ).toBe('CALL_CENTER')
  })
})

describe('isAcceptable', () => {
  it('accepts only OWNED and ANONYMOUS', () => {
    expect(
      [
        'OWNED',
        'ANONYMOUS',
        'FOREIGN',
        'UNVERIFIED_PROFILE',
        'CALL_CENTER',
        'NOT_FOUND',
      ].filter((v) => isAcceptable(v as OwnershipVerdict))
    ).toEqual(['OWNED', 'ANONYMOUS'])
  })
})

describe('isCallCenterUserType', () => {
  it.each([
    ['callCenterOperator', true],
    ['CALL_CENTER_OPERATOR', true],
    ['StoreUser', false],
    ['STORE_USER', false],
    [null, false],
    [undefined, false],
  ])('%s -> %s', (value, expected) => {
    expect(isCallCenterUserType(value)).toBe(expected)
  })
})

describe('classifyOwnershipWithReason (FR-D1)', () => {
  it.each([
    [OF_A, { verdict: 'OWNED' }],
    [OF_A2, { verdict: 'OWNED' }], // case-insensitive
    [OF_A_GUEST_B, { verdict: 'FOREIGN', reason: 'email_mismatch' }],
    [OF_A_MASKED, { verdict: 'OWNED', reason: 'email_masked' }],
    [OF_B, { verdict: 'FOREIGN' }],
    [OF_ANON, { verdict: 'ANONYMOUS' }],
  ])('%s -> %j', (id, expected) => {
    expect(classifyOwnershipWithReason(owners[id], shopper)).toEqual(expected)
  })

  it('email_unverified when VTEX ID returned no user', () => {
    expect(
      classifyOwnershipWithReason(owners[OF_A], {
        userId: SHOPPER_A,
        email: null,
      })
    ).toEqual({
      verdict: 'OWNED',
      reason: 'email_unverified',
    })
  })
})

describe('fetchOwnership', () => {
  it('returns LOOKUP_FAILED and logs without ids on a lookup error', async () => {
    const { ctx, checkoutRest, logger } = mockContext()

    checkoutRest.getOrderFormOwner.mockRejectedValueOnce({
      response: { status: 503 },
    })

    await expect(
      fetchOwnership(ctx, OF_A, shopper, 'getSavedCart')
    ).resolves.toEqual({ verdict: 'LOOKUP_FAILED' })
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.owner_lookup_failed',
      operation: 'getSavedCart',
      status: 503,
    })
  })

  it('NOT_FOUND for an invalid id without calling Checkout', async () => {
    const { ctx, checkoutRest } = mockContext()

    await expect(
      fetchOwnership(ctx, 'default-order-form', shopper, 'replaceCart')
    ).resolves.toEqual({ verdict: 'NOT_FOUND' })
    expect(checkoutRest.getOrderFormOwner).not.toHaveBeenCalled()
  })
})
