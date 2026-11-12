/* eslint-disable jest/no-expect-resolves */
import { CacheType } from '@vtex/api'

import clientsConfig from '../clients'
import CheckoutIO from '../clients/checkout'
import VtexId from '../clients/vtexId'
import CheckoutRestClient from '../clients/chekoutREST'

const ioContext: any = { account: 'teststore', authToken: 'app-token' }

describe('VtexId.validateToken', () => {
  it('POSTs the token in the body to the account-scoped credential/validate endpoint', async () => {
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
        params: { an: 'teststore' },
        cacheable: CacheType.None,
      })
    )
  })

  it.each([400, 401, 403, 404])('returns null on %p', async (status) => {
    const client = new VtexId(ioContext)

    ;(client as any).http = {
      post: jest.fn().mockRejectedValue({ response: { status } }),
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

describe('VtexId client configuration', () => {
  it('targets the account host over http with the https proxy header', () => {
    const { options } = new VtexId(ioContext) as any

    expect(options.baseURL).toBe('http://teststore.vtexcommercestable.com.br')
    expect(options.headers['X-Vtex-Proxy-To']).toBe(
      'https://teststore.vtexcommercestable.com.br'
    )
  })

  it('keeps caller-provided headers', () => {
    const { options } = new VtexId(ioContext, {
      headers: { 'X-Extra': '1' },
    }) as any

    expect(options.headers['X-Extra']).toBe('1')
    expect(options.headers['X-Vtex-Proxy-To']).toBeDefined()
  })
})

describe('CheckoutRestClient.getOrderFormOwner', () => {
  const ID = 'a'.repeat(32)
  const make = (http: any) => {
    const client = new CheckoutRestClient(ioContext)

    ;(client as any).http = http

    return client
  }

  it('maps a 200 response to the owner fields', async () => {
    const get = jest.fn().mockResolvedValue({
      orderFormId: ID,
      userProfileId: 'profile-1',
      userType: null,
      loggedIn: true,
      clientProfileData: { email: 'x@example.test' },
      salesChannel: '1',
    })

    await expect(make({ get }).getOrderFormOwner(ID)).resolves.toEqual({
      orderFormId: ID,
      userProfileId: 'profile-1',
      userType: null,
      loggedIn: true,
      hasClientProfile: true,
      email: 'x@example.test',
      salesChannel: '1',
    })
    // an owner lookup must never be answered from a cache
    expect(get).toHaveBeenCalledWith(
      `pub/orderForm/${ID}`,
      expect.objectContaining({ cacheable: CacheType.None })
    )
  })

  it.each([
    ['shippingData.address', { address: { street: 'Rua Teste' } }],
    [
      'shippingData.address receiverName',
      { address: { receiverName: 'Synthetic Receiver' } },
    ],
    [
      'shippingData.selectedAddresses',
      { selectedAddresses: [{ street: 'Rua Teste' }] },
    ],
    [
      'shippingData.availableAddresses',
      { availableAddresses: [{ postalCode: '00000-000' }, { number: '1' }] },
    ],
  ])(
    'treats a cart with an identifying address in %s and no email as having a client profile',
    async (_label, shippingData) => {
      const get = jest.fn().mockResolvedValue({
        orderFormId: ID,
        userProfileId: null,
        clientProfileData: { email: null },
        shippingData,
      })

      await expect(make({ get }).getOrderFormOwner(ID)).resolves.toEqual(
        expect.objectContaining({ hasClientProfile: true, email: null })
      )
    }
  )

  it.each([
    [
      'only postalCode and country',
      { address: { postalCode: '1', country: 'BRA' } },
    ],
    [
      'only simulator fields in every address list',
      {
        address: { postalCode: '1', city: 'x', state: 'y', addressType: 'z' },
        selectedAddresses: [{ postalCode: '1', geoCoordinates: [1, 2] }],
        availableAddresses: [{ neighborhood: 'n', street: '' }],
      },
    ],
  ])(
    'does not treat a cart with %s as having a client profile',
    async (_label, shippingData) => {
      const get = jest.fn().mockResolvedValue({
        orderFormId: ID,
        userProfileId: null,
        clientProfileData: { email: null },
        shippingData,
      })

      await expect(make({ get }).getOrderFormOwner(ID)).resolves.toEqual(
        expect.objectContaining({ hasClientProfile: false })
      )
    }
  )

  it.each(['document', 'phone', 'firstName', 'lastName'])(
    'treats a non-empty clientProfileData.%s as having a client profile',
    async (field) => {
      const get = jest.fn().mockResolvedValue({
        orderFormId: ID,
        clientProfileData: { email: null, [field]: 'synthetic' },
      })

      await expect(make({ get }).getOrderFormOwner(ID)).resolves.toEqual(
        expect.objectContaining({ hasClientProfile: true })
      )
    }
  )

  it.each([
    ['null address', { address: null, selectedAddresses: [] }],
    ['no shippingData', undefined],
  ])('keeps an empty cart anonymous (%s)', async (_label, shippingData) => {
    const get = jest.fn().mockResolvedValue({ orderFormId: ID, shippingData })

    await expect(make({ get }).getOrderFormOwner(ID)).resolves.toEqual(
      expect.objectContaining({ hasClientProfile: false })
    )
  })

  it.each([
    ['an empty body', ''],
    ['no body (204)', undefined],
    ['an empty object', {}],
    ['an object without the echoed id', { loggedIn: true }],
    ['an HTML page', '<html>unavailable</html>'],
    ['an array', [{ orderFormId: ID }]],
    ['null', null],
  ])('throws (fails closed) on a 200 with %s', async (_label, body) => {
    const get = jest.fn().mockResolvedValue(body)

    await expect(make({ get }).getOrderFormOwner(ID)).rejects.toThrow(
      'without orderFormId'
    )
  })

  it('returns null on 404', async () => {
    const get = jest.fn().mockRejectedValue({ response: { status: 404 } })

    await expect(make({ get }).getOrderFormOwner(ID)).resolves.toBeNull()
  })

  it.each([401, 403, 500, 503])(
    'throws on %p instead of reporting not found',
    async (status) => {
      const get = jest.fn().mockRejectedValue({ response: { status } })

      await expect(make({ get }).getOrderFormOwner(ID)).rejects.toEqual({
        response: { status },
      })
    }
  )

  it('throws on network errors without a response', async () => {
    const get = jest.fn().mockRejectedValue(new Error('ECONNRESET'))

    await expect(make({ get }).getOrderFormOwner(ID)).rejects.toThrow(
      'ECONNRESET'
    )
  })

  it('treats a response for a different orderForm id as not found', async () => {
    const get = jest.fn().mockResolvedValue({
      orderFormId: 'b'.repeat(32),
      userProfileId: 'profile-1',
    })

    await expect(make({ get }).getOrderFormOwner(ID)).resolves.toBeNull()
  })
})

describe('client configuration', () => {
  it('sets per-client timeouts and retries on top of the defaults', () => {
    const config = clientsConfig

    expect(config.options.default).toEqual(
      expect.objectContaining({ retries: 2, timeout: 5000 })
    )
    expect(config.options.vtexId).toEqual({ timeout: 2000, retries: 1 })
    expect(config.options.checkoutRest).toEqual({ timeout: 3000, retries: 1 })
  })
})

describe('CheckoutIO reads', () => {
  it.each(['getItems', 'getOrderForm'] as const)(
    '%s is never served from the memory cache',
    async (method) => {
      const client = new CheckoutIO(ioContext)
      const query = jest.fn().mockResolvedValue({
        data: { orderForm: { items: [] } },
      })

      ;(client as any).graphql = { query }

      await client[method]('a'.repeat(32))
      expect(query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ cacheable: CacheType.None })
      )
    }
  )
})
