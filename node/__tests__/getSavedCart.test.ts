/* eslint-disable jest/no-expect-resolves, jest/no-mocks-import */
import { getSavedCart } from '../resolvers/getSavedCart'
import {
  OF_A,
  OF_ANON,
  OF_B,
  OF_CALL_CENTER,
  OF_MISSING,
  SHOPPER_A,
  SHOPPER_B,
  TOKEN_A,
  createContext,
  expectNoPiiInLogs,
  item,
  key,
} from '../__mocks__/testContext'

const args = (overrides: Partial<GetSavedCartArgs> = {}): GetSavedCartArgs => ({
  nullOnEmpty: false,
  ...overrides,
})

describe('getSavedCart', () => {
  it('returns the caller own saved cart', async () => {
    const { ctx } = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_A)]: OF_A },
    })

    await expect(getSavedCart(undefined, args(), ctx)).resolves.toBe(OF_A)
  })

  it('ignores client userId and salesChannel', async () => {
    const { ctx, vbase } = createContext({
      token: TOKEN_A,
      channel: 2,
      vbase: { [key(SHOPPER_A, '2')]: OF_A, [key(SHOPPER_B, '9')]: OF_B },
    })

    await expect(
      getSavedCart(
        undefined,
        args({ userId: SHOPPER_B, salesChannel: '9' }),
        ctx
      )
    ).resolves.toBe(OF_A)
    expect(vbase.getJSON).toHaveBeenCalledWith(
      'vtex.cross-device-cart',
      key(SHOPPER_A, '2'),
      true
    )
  })

  it('returns null without touching VBase when unauthenticated', async () => {
    const { ctx, vbase, logger } = createContext({
      vbase: { [key(SHOPPER_A)]: OF_A },
    })

    await expect(
      getSavedCart(undefined, args({ userId: SHOPPER_A }), ctx)
    ).resolves.toBeNull()
    expect(vbase.getJSON).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.unauthenticated',
      operation: 'getSavedCart',
    })
  })

  it('shared-browser contamination: clears a reference to a foreign orderForm', async () => {
    const { ctx, store, logger } = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_A)]: OF_B },
    })

    await expect(getSavedCart(undefined, args(), ctx)).resolves.toBeNull()
    expect(store.get(key(SHOPPER_A))).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.ownership_rejected',
      operation: 'getSavedCart',
      verdict: 'FOREIGN',
    })
    expectNoPiiInLogs(logger)
  })

  it('clears a reference to an orderForm that no longer exists', async () => {
    const { ctx, store } = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_A)]: OF_MISSING },
    })

    await expect(getSavedCart(undefined, args(), ctx)).resolves.toBeNull()
    expect(store.get(key(SHOPPER_A))).toBeNull()
  })

  it('clears a legacy non-orderForm value', async () => {
    const { ctx, store, checkoutRest } = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_A)]: 'default-order-form' },
    })

    await expect(getSavedCart(undefined, args(), ctx)).resolves.toBeNull()
    expect(store.get(key(SHOPPER_A))).toBeNull()
    expect(checkoutRest.getOrderFormOwner).not.toHaveBeenCalled()
  })

  it('clears a reference to a call-center cart', async () => {
    const { ctx, store } = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_A)]: OF_CALL_CENTER },
    })

    await expect(getSavedCart(undefined, args(), ctx)).resolves.toBeNull()
    expect(store.get(key(SHOPPER_A))).toBeNull()
  })

  it('keeps the key and signals a GraphQL error (not null) when the owner lookup fails', async () => {
    const { ctx, store } = createContext({
      token: TOKEN_A,
      ownerLookupStatus: 503,
      vbase: { [key(SHOPPER_A)]: OF_A },
    })

    // null would make every storefront bundle overwrite the preserved reference
    await expect(getSavedCart(undefined, args(), ctx)).rejects.toThrow(
      'saved cart lookup unavailable'
    )
    expect(store.get(key(SHOPPER_A))).toBe(OF_A)
  })

  it('returns an anonymous saved cart', async () => {
    const { ctx } = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_A)]: OF_ANON },
    })

    await expect(getSavedCart(undefined, args(), ctx)).resolves.toBe(OF_ANON)
  })

  it('honours nullOnEmpty without clearing the key', async () => {
    const empty = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_A)]: OF_A },
    })

    await expect(
      getSavedCart(undefined, args({ nullOnEmpty: true }), empty.ctx)
    ).resolves.toBeNull()
    expect(empty.store.get(key(SHOPPER_A))).toBe(OF_A)

    const filled = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_A)]: OF_A },
      items: { [OF_A]: [item(1)] },
    })

    await expect(
      getSavedCart(undefined, args({ nullOnEmpty: true }), filled.ctx)
    ).resolves.toBe(OF_A)
  })
})
