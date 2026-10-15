/* eslint-disable jest/no-expect-resolves, jest/no-mocks-import */
import { saveCurrentCart } from '../resolvers/saveCurrentCart'
import {
  OF_A,
  OF_ADDRESS_ONLY,
  OF_ANON,
  OF_B,
  OF_CALL_CENTER,
  OF_CURRENT_A,
  OF_IDENTIFIED,
  SHOPPER_A,
  SHOPPER_B,
  TOKEN_A,
  createContext,
  expectNoPiiInLogs,
  key,
  setCheckoutCookie,
} from '../__mocks__/testContext'

// The browser's checkout cookie normally holds the cart it saves (FR-D2).
const save = (args: SaveCurrentCartArgs, ctx: Context) => {
  if (args.orderFormId) {
    setCheckoutCookie(ctx, args.orderFormId)
  }

  return saveCurrentCart(undefined, args, ctx)
}

describe('saveCurrentCart', () => {
  it('saves an anonymous cart under the caller key', async () => {
    const { ctx, store } = createContext({ token: TOKEN_A })

    await expect(save({ orderFormId: OF_ANON }, ctx)).resolves.toBe('success')
    expect(store.get(key(SHOPPER_A))).toBe(OF_ANON)
  })

  it('saves the caller own cart', async () => {
    const { ctx, store } = createContext({ token: TOKEN_A })

    await expect(save({ orderFormId: OF_CURRENT_A }, ctx)).resolves.toBe(
      'success'
    )
    expect(store.get(key(SHOPPER_A))).toBe(OF_CURRENT_A)
  })

  it('clears only the caller key when orderFormId is null', async () => {
    const { ctx, store } = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_A)]: OF_A, [key(SHOPPER_B)]: OF_B },
    })

    await expect(
      save({ userId: SHOPPER_B, orderFormId: null }, ctx)
    ).resolves.toBe('success')
    expect(store.get(key(SHOPPER_A))).toBeNull()
    expect(store.get(key(SHOPPER_B))).toBe(OF_B)
  })

  it('shared browser: rejects a cart owned by another profile', async () => {
    const { ctx, store, logger } = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_A)]: OF_A },
    })

    await expect(save({ orderFormId: OF_B }, ctx)).resolves.toBe('rejected')
    expect(store.get(key(SHOPPER_A))).toBe(OF_A)
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.ownership_rejected',
      operation: 'saveCurrentCart',
      verdict: 'FOREIGN',
    })
    expectNoPiiInLogs(logger)
  })

  it('rejects an identified-but-not-owned cart', async () => {
    const { ctx, store } = createContext({ token: TOKEN_A })

    await expect(save({ orderFormId: OF_IDENTIFIED }, ctx)).resolves.toBe(
      'rejected'
    )
    expect(store.has(key(SHOPPER_A))).toBe(false)
  })

  it('rejects an anonymous cart that holds a shipping address (PII)', async () => {
    const { ctx, store, logger } = createContext({ token: TOKEN_A })

    await expect(save({ orderFormId: OF_ADDRESS_ONLY }, ctx)).resolves.toBe(
      'rejected'
    )
    expect(store.has(key(SHOPPER_A))).toBe(false)
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.ownership_rejected',
      operation: 'saveCurrentCart',
      verdict: 'UNVERIFIED_PROFILE',
    })
    expectNoPiiInLogs(logger)
  })

  it('call center: decides from server data, ignoring client userType', async () => {
    const { ctx, store } = createContext({ token: TOKEN_A })

    await expect(
      save({ userType: 'STORE_USER', orderFormId: OF_CALL_CENTER }, ctx)
    ).resolves.toBe('Not saved is call center operator')
    expect(store.has(key(SHOPPER_A))).toBe(false)
  })

  it('does nothing when unauthenticated', async () => {
    const { ctx, vbase } = createContext()

    await expect(
      save({ userId: SHOPPER_A, orderFormId: OF_ANON }, ctx)
    ).resolves.toBe('unauthenticated')
    expect(vbase.saveJSON).not.toHaveBeenCalled()
  })

  it('uses the server sales channel', async () => {
    const { ctx, store } = createContext({ token: TOKEN_A, channel: 3 })

    await save({ salesChannel: '1', orderFormId: OF_ANON }, ctx)
    expect(store.get(key(SHOPPER_A, '3'))).toBe(OF_ANON)
    expect(store.has(key(SHOPPER_A, '1'))).toBe(false)
  })

  it('does not write when the owner lookup fails', async () => {
    const { ctx, vbase } = createContext({
      token: TOKEN_A,
      ownerLookupStatus: 500,
    })

    await expect(save({ orderFormId: OF_ANON }, ctx)).resolves.toBe('rejected')
    expect(vbase.saveJSON).not.toHaveBeenCalled()
  })
})
