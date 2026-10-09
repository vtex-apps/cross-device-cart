/* eslint-disable jest/no-expect-resolves */
import VtexId from '../clients/vtexId'
import CheckoutRestClient from '../clients/checkoutRest'

const ioContext: any = { account: 'testaccount', authToken: 'app-token' }

describe('VtexId.validateToken', () => {
  it('POSTs the token to the account-scoped credential/validate endpoint', async () => {
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
      expect.objectContaining({ params: { an: 'testaccount' } })
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
})
