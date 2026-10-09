/* eslint-disable jest/no-expect-resolves */
import { CacheType } from '@vtex/api'

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
