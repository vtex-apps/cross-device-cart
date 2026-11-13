/* eslint-disable jest/no-expect-resolves, jest/no-mocks-import */
import CheckoutRestClient, {
  RawOrderFormOwnerFields,
  toOrderFormOwner,
} from '../clients/chekoutREST'
import {
  classifyOwnership,
  fetchOwnership,
  isAcceptable,
  isCallCenterUserType,
  logCurrentCartIgnored,
  logOwnershipRejection,
  logVbaseError,
} from '../utils/ownership'
import {
  OF_A,
  OF_B,
  OF_CEP_ONLY,
  OF_MISSING,
  SHOPPER_A,
  SHOPPER_B,
  createContext,
  expectNoPiiInLogs,
  owner,
} from '../__mocks__/testContext'

const shopperA: ShopperIdentity = { userId: SHOPPER_A }

/** Runs the real client against a stubbed 200 body. */
const realOwnerLookup = (id: string, body: unknown) => {
  const client = new CheckoutRestClient({ account: 'teststore' } as any)

  ;(client as any).http = { get: jest.fn().mockResolvedValue(body) }

  return client.getOrderFormOwner(id)
}

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

  it('does not treat a postal-code-only (shipping simulator) cart as PII', () => {
    const cepOnly = toOrderFormOwner(OF_CEP_ONLY, {
      clientProfileData: { email: null },
      shippingData: {
        address: {
          postalCode: '00000-000',
          country: 'BRA',
          city: 'Synthetic City',
          state: 'SC',
          neighborhood: 'Centro',
          addressType: 'residential',
          geoCoordinates: [1, 2],
        },
        selectedAddresses: [{ postalCode: '00000-000', country: 'BRA' }],
        availableAddresses: [{ postalCode: '00000-000', street: ' ' }],
      },
    })

    expect(cepOnly.hasClientProfile).toBe(false)
    expect(classifyOwnership(cepOnly, shopperA)).toBe('ANONYMOUS')
  })

  it.each<[string, RawOrderFormOwnerFields]>([
    [
      'address.receiverName',
      { shippingData: { address: { receiverName: 'Synthetic Receiver' } } },
    ],
    ['address.street', { shippingData: { address: { street: 'Rua X' } } }],
    ['address.number', { shippingData: { address: { number: '10' } } }],
    [
      'selectedAddresses with a street',
      {
        shippingData: { selectedAddresses: [{ postalCode: '1', street: 'x' }] },
      },
    ],
    [
      'availableAddresses with an identifying address',
      {
        shippingData: {
          availableAddresses: [{ postalCode: '1' }, { receiverName: 'x' }],
        },
      },
    ],
    ['clientProfileData.document', { clientProfileData: { document: '123' } }],
    ['clientProfileData.phone', { clientProfileData: { phone: '+000' } }],
    ['clientProfileData.firstName', { clientProfileData: { firstName: 'A' } }],
    ['clientProfileData.lastName', { clientProfileData: { lastName: 'B' } }],
  ])('treats %s as client PII (UNVERIFIED_PROFILE)', (_label, raw) => {
    const result = toOrderFormOwner(OF_B, raw)

    expect(result.hasClientProfile).toBe(true)
    expect(classifyOwnership(result, shopperA)).toBe('UNVERIFIED_PROFILE')
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
    [
      'loggedIn without userProfileId is never anonymous',
      owner(OF_B, { loggedIn: true }),
      'UNVERIFIED_PROFILE',
    ],
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

  it.each([
    ['an empty body', ''],
    ['no body (204)', undefined],
    ['an empty object', {}],
    ['an HTML page', '<html><body>Service unavailable</body></html>'],
    ['an array', []],
    ['null', null],
  ])('returns LOOKUP_FAILED for a 200 with %s', async (_label, body) => {
    const { ctx, checkoutRest, logger } = createContext()

    checkoutRest.getOrderFormOwner.mockImplementationOnce(
      (id: string) => realOwnerLookup(id, body) as any
    )

    await expect(
      fetchOwnership(ctx, OF_A, shopperA, 'test')
    ).resolves.toMatchObject({ verdict: 'LOOKUP_FAILED' })
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.owner_lookup_failed',
      operation: 'test',
      status: null,
    })
    expectNoPiiInLogs(logger)
  })

  it('returns UNVERIFIED_PROFILE for an echoed id, loggedIn and no profile', async () => {
    const { ctx, checkoutRest } = createContext()

    checkoutRest.getOrderFormOwner.mockImplementationOnce(
      (id: string) =>
        realOwnerLookup(id, { orderFormId: id, loggedIn: true }) as any
    )

    await expect(
      fetchOwnership(ctx, OF_A, shopperA, 'test')
    ).resolves.toMatchObject({ verdict: 'UNVERIFIED_PROFILE' })
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
    logCurrentCartIgnored(ctx, 'replaceCart', 'FOREIGN')
    logCurrentCartIgnored(ctx, 'replaceCart', 'NOT_FOUND', 'email_masked')
    logVbaseError(ctx, 'saveCurrentCart', { response: { status: 500 } })

    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.ownership_rejected',
      operation: 'getSavedCart',
      verdict: 'FOREIGN',
    })
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.current_cart_ignored',
      operation: 'replaceCart',
      verdict: 'FOREIGN',
    })
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.current_cart_ignored',
      operation: 'replaceCart',
      verdict: 'NOT_FOUND',
      reason: 'email_masked',
    })
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.vbase_error',
      operation: 'saveCurrentCart',
      status: 500,
    })
    expectNoPiiInLogs(logger)
  })
})
