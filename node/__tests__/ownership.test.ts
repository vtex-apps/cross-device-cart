/* eslint-disable jest/no-expect-resolves, jest/no-mocks-import */
import { toOrderFormOwner } from '../clients/chekoutREST'
import {
  classifyOwnership,
  fetchOwnership,
  isAcceptable,
  isCallCenterUserType,
  logOwnershipRejection,
  logUnauthenticated,
} from '../utils/ownership'
import {
  OF_A,
  OF_B,
  OF_MISSING,
  SHOPPER_A,
  SHOPPER_B,
  createContext,
  expectNoPiiInLogs,
  owner,
} from '../__mocks__/testContext'

const shopperA: ShopperIdentity = { userId: SHOPPER_A }

describe('toOrderFormOwner', () => {
  it('projects only owner fields and treats a masked email as present', () => {
    expect(
      toOrderFormOwner(OF_A, {
        orderFormId: OF_A,
        userProfileId: SHOPPER_A,
        userType: null,
        loggedIn: true,
        clientProfileData: { email: '***' },
        salesChannel: '1',
      })
    ).toEqual({
      orderFormId: OF_A,
      userProfileId: SHOPPER_A,
      userType: null,
      loggedIn: true,
      hasClientProfile: true,
      email: '***',
      salesChannel: '1',
    })
  })

  it('classifies a cart with a shipping address but no email as UNVERIFIED_PROFILE', () => {
    const addressOnly = toOrderFormOwner(OF_B, {
      clientProfileData: { email: null },
      shippingData: { address: null, selectedAddresses: [{ street: 'x' }] },
    })

    expect(addressOnly.hasClientProfile).toBe(true)
    expect(addressOnly.email).toBeNull()
    expect(classifyOwnership(addressOnly, shopperA)).toBe('UNVERIFIED_PROFILE')
  })

  it('normalizes missing and empty fields', () => {
    expect(
      toOrderFormOwner(OF_A, { userProfileId: '', clientProfileData: null })
    ).toEqual({
      orderFormId: OF_A,
      userProfileId: null,
      userType: null,
      loggedIn: false,
      hasClientProfile: false,
      email: null,
      salesChannel: null,
    })
  })
})

describe('isCallCenterUserType', () => {
  it.each([
    ['callCenterOperator', true],
    ['CALL_CENTER_OPERATOR', true],
    ['STORE_USER', false],
    ['', false],
    [null, false],
    [undefined, false],
  ])('%p -> %p', (value, expected) => {
    expect(isCallCenterUserType(value)).toBe(expected)
  })
})

describe('classifyOwnership', () => {
  it.each<[string, OrderFormOwner | null, OwnershipVerdict]>([
    ['missing orderForm', null, 'NOT_FOUND'],
    [
      'call center wins over owner',
      owner(OF_A, {
        userProfileId: SHOPPER_A,
        userType: 'CALL_CENTER_OPERATOR',
      }),
      'CALL_CENTER',
    ],
    ['owned', owner(OF_A, { userProfileId: SHOPPER_A }), 'OWNED'],
    ['foreign', owner(OF_B, { userProfileId: SHOPPER_B }), 'FOREIGN'],
    [
      'identified, not owned',
      owner(OF_B, { hasClientProfile: true }),
      'UNVERIFIED_PROFILE',
    ],
    ['anonymous', owner(OF_B), 'ANONYMOUS'],
  ])('%s', (_label, input, expected) => {
    expect(classifyOwnership(input, shopperA)).toBe(expected)
  })

  it('compares userProfileId case-insensitively', () => {
    expect(
      classifyOwnership(
        owner(OF_A, { userProfileId: SHOPPER_A.toUpperCase() }),
        shopperA
      )
    ).toBe('OWNED')
  })
})

describe('isAcceptable', () => {
  it('accepts only OWNED and ANONYMOUS', () => {
    const all: VerdictOrFailure[] = [
      'OWNED',
      'ANONYMOUS',
      'FOREIGN',
      'UNVERIFIED_PROFILE',
      'CALL_CENTER',
      'NOT_FOUND',
      'LOOKUP_FAILED',
    ]

    expect(all.filter(isAcceptable)).toEqual(['OWNED', 'ANONYMOUS'])
  })
})

describe('fetchOwnership', () => {
  it('returns NOT_FOUND for an invalid id without calling Checkout', async () => {
    const { ctx, checkoutRest } = createContext()

    await expect(
      fetchOwnership(ctx, 'default-order-form', shopperA, 'test')
    ).resolves.toMatchObject({ verdict: 'NOT_FOUND' })
    expect(checkoutRest.getOrderFormOwner).not.toHaveBeenCalled()
  })

  it('returns NOT_FOUND when Checkout has no such orderForm', async () => {
    const { ctx } = createContext()

    await expect(
      fetchOwnership(ctx, OF_MISSING, shopperA, 'test')
    ).resolves.toMatchObject({ verdict: 'NOT_FOUND' })
  })

  it('returns LOOKUP_FAILED and logs the status when Checkout fails', async () => {
    const { ctx, logger } = createContext({ ownerLookupStatus: 403 })

    await expect(
      fetchOwnership(ctx, OF_A, shopperA, 'test')
    ).resolves.toMatchObject({ verdict: 'LOOKUP_FAILED' })
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.owner_lookup_failed',
      operation: 'test',
      status: 403,
    })
  })

  it('classifies the fetched owner', async () => {
    const { ctx } = createContext()

    await expect(
      fetchOwnership(ctx, OF_B, shopperA, 'test')
    ).resolves.toMatchObject({ verdict: 'FOREIGN' })
  })
})

describe('logging', () => {
  it('logs rejections and unauthenticated calls without PII', () => {
    const { ctx, logger } = createContext()

    logOwnershipRejection(ctx, 'getSavedCart', 'FOREIGN')
    logUnauthenticated(ctx, 'replaceCart')

    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.ownership_rejected',
      operation: 'getSavedCart',
      verdict: 'FOREIGN',
    })
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.unauthenticated',
      operation: 'replaceCart',
    })
    expectNoPiiInLogs(logger)
  })
})
