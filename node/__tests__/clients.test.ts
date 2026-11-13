/* eslint-disable jest/no-expect-resolves */
import { CacheType } from '@vtex/api'

import VtexId from '../clients/vtexId'
import CheckoutRestClient from '../clients/checkoutRest'
import CheckoutIO from '../clients/checkout'

const ioContext: any = { account: 'testaccount', authToken: 'app-token' }

describe('VtexId.validateToken', () => {
  it('POSTs the token to the account-scoped credential/validate endpoint, never cached', async () => {
    const client = new VtexId(ioContext)
    const post = jest.fn().mockResolvedValue({ authStatus: 'Success', id: 'x' })

    ;(client as any).http = { post }

    await expect(client.validateToken('tkn')).resolves.toEqual({
      authStatus: 'Success',
      id: 'x',
    })
    expect(post).toHaveBeenCalledWith(
      '/api/vtexid/credential/validate',
      { token: 'tkn' },
      expect.objectContaining({
        params: { an: 'testaccount' },
        cacheable: CacheType.None,
      })
    )
  })

  it('returns null on 401', async () => {
    const client = new VtexId(ioContext)

    ;(client as any).http = {
      post: jest.fn().mockRejectedValue({ response: { status: 401 } }),
    }

    await expect(client.validateToken('bad')).resolves.toBeNull()
  })

  it('throws on 5xx', async () => {
    const client = new VtexId(ioContext)

    ;(client as any).http = {
      post: jest.fn().mockRejectedValue({ response: { status: 503 } }),
    }

    await expect(client.validateToken('tkn')).rejects.toEqual({
      response: { status: 503 },
    })
  })
})

describe('CheckoutRestClient.getOrderFormOwner', () => {
  const ID = 'a'.repeat(32)

  it('projects owner fields only (no address)', async () => {
    const client = new CheckoutRestClient(ioContext)
    const get = jest.fn().mockResolvedValue({
      orderFormId: ID,
      userProfileId: 'p1',
      userType: 'callCenterOperator',
      loggedIn: true,
      clientProfileData: { email: 'masked***' },
      shippingData: { address: { street: 'should not leak' } },
    })

    ;(client as any).http = { get }

    await expect(client.getOrderFormOwner(ID)).resolves.toEqual({
      orderFormId: ID,
      userProfileId: 'p1',
      userType: 'callCenterOperator',
      loggedIn: true,
      hasClientProfile: true,
      email: 'masked***',
    })
    expect(get).toHaveBeenCalledWith(
      `/api/checkout/pub/orderForm/${ID}`,
      expect.objectContaining({ metric: 'checkout-orderform-owner' })
    )
  })

  const ownerFor = async (body: Record<string, unknown>) => {
    const client = new CheckoutRestClient(ioContext)

    ;(client as any).http = {
      get: jest.fn().mockResolvedValue({
        orderFormId: ID,
        userProfileId: null,
        clientProfileData: null,
        shippingData: null,
        ...body,
      }),
    }

    return client.getOrderFormOwner(ID)
  }

  it.each([
    ['email', { email: 'x@example.test' }],
    ['document', { document: '123' }],
    ['phone', { phone: '+1555' }],
    ['firstName', { firstName: 'A' }],
    ['lastName', { lastName: 'B' }],
  ])(
    'hasClientProfile is true for clientProfileData.%s',
    async (_n, profile) => {
      await expect(
        ownerFor({ clientProfileData: profile })
      ).resolves.toMatchObject({ hasClientProfile: true })
    }
  )

  it.each([
    ['address.receiverName', { address: { receiverName: 'R' } }],
    ['address.street', { address: { street: 'S' } }],
    ['address.number', { address: { number: '10' } }],
    [
      'selectedAddresses',
      { selectedAddresses: [{ postalCode: '1', street: 'x' }] },
    ],
    [
      'availableAddresses',
      {
        selectedAddresses: [{ postalCode: '1' }],
        availableAddresses: [{ postalCode: '1' }, { receiverName: 'R' }],
      },
    ],
  ])(
    'hasClientProfile is true without email for an identifying address (%s)',
    async (_n, shippingData) => {
      await expect(ownerFor({ shippingData })).resolves.toEqual({
        orderFormId: ID,
        userProfileId: null,
        userType: null,
        loggedIn: false,
        hasClientProfile: true,
        email: null,
      })
    }
  )

  it.each([
    ['CEP only', { address: { postalCode: '22000000', country: 'BRA' } }],
    [
      'simulator address with city/state/neighborhood/geo/addressType',
      {
        address: {
          postalCode: '1',
          country: 'BRA',
          city: 'C',
          state: 'S',
          neighborhood: 'N',
          geoCoordinates: [1, 2],
          addressType: 'residential',
          street: '',
          receiverName: '  ',
        },
        selectedAddresses: [{ postalCode: '1', country: 'BRA' }],
        availableAddresses: [{ postalCode: '1', country: 'BRA' }],
      },
    ],
    ['empty arrays and null address', { address: null, selectedAddresses: [] }],
  ])('hasClientProfile stays false for %s', async (_n, shippingData) => {
    await expect(
      ownerFor({ clientProfileData: null, shippingData })
    ).resolves.toMatchObject({ hasClientProfile: false })
  })

  it('returns null for invalid ids without calling Checkout', async () => {
    const client = new CheckoutRestClient(ioContext)
    const get = jest.fn()

    ;(client as any).http = { get }

    await expect(client.getOrderFormOwner('../../x')).resolves.toBeNull()
    expect(get).not.toHaveBeenCalled()
  })

  it('returns null on 404 and throws on any other error (LOOKUP_FAILED)', async () => {
    const client = new CheckoutRestClient(ioContext)

    ;(client as any).http = {
      get: jest
        .fn()
        .mockRejectedValueOnce({ response: { status: 404 } })
        .mockRejectedValueOnce({ response: { status: 403 } })
        .mockRejectedValueOnce({ response: { status: 500 } }),
    }

    await expect(client.getOrderFormOwner(ID)).resolves.toBeNull()
    await expect(client.getOrderFormOwner(ID)).rejects.toEqual({
      response: { status: 403 },
    })
    await expect(client.getOrderFormOwner(ID)).rejects.toEqual({
      response: { status: 500 },
    })
  })

  it('treats a response for a different orderForm id as not found', async () => {
    const client = new CheckoutRestClient(ioContext)

    ;(client as any).http = {
      get: jest.fn().mockResolvedValue({
        orderFormId: 'b'.repeat(32),
        userProfileId: null,
        clientProfileData: null,
        shippingData: null,
      }),
    }

    await expect(client.getOrderFormOwner(ID)).resolves.toBeNull()
  })

  it.each([
    ['empty string', ''],
    ['undefined (204)', undefined],
    ['null', null],
    ['empty object', {}],
    ['HTML string', '<html><body>Bad gateway</body></html>'],
    ['array', [{ orderFormId: ID }]],
    ['object without orderFormId', { userProfileId: null, loggedIn: true }],
  ])(
    'throws (LOOKUP_FAILED) on a response that does not echo the id: %s',
    async (_n, body) => {
      const client = new CheckoutRestClient(ioContext)

      ;(client as any).http = { get: jest.fn().mockResolvedValue(body) }

      await expect(client.getOrderFormOwner(ID)).rejects.toThrow()
    }
  )
})

describe('CheckoutIO reads', () => {
  it.each(['getItems', 'getOrderForm'] as const)(
    '%s is never memory-cached',
    async (method) => {
      const client = new CheckoutIO(ioContext)
      const query = jest.fn().mockResolvedValue({
        data: { orderForm: { items: [] } },
      })

      ;(client as any).graphql = { query }

      await (client as any)[method]('a'.repeat(32))

      expect(query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ cacheable: CacheType.None })
      )
    }
  )
})

describe('clients config', () => {
  it('sets per-client timeouts and keeps the defaults', () => {
    ;(global as any).metrics = { trackCache: jest.fn() }

    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const config = require('../clients').default

    expect(config.options.default).toMatchObject({ retries: 2, timeout: 5000 })
    expect(config.options.vtexId).toEqual({ timeout: 2000, retries: 1 })
    expect(config.options.checkoutRest).toEqual({ timeout: 3000, retries: 1 })
  })
})
