/* eslint-disable jest/no-mocks-import */
import { getSavedCart } from '../resolvers/getSavedCart'
import { saveCurrentCart } from '../resolvers/saveCurrentCart'
import { replaceCart } from '../resolvers/replaceCart'
import {
  OF_A,
  OF_B,
  OF_CURRENT_A,
  SHOPPER_A,
  SHOPPER_B,
  TOKEN_A,
  createContext,
  expectNoPiiInLogs,
  item,
  key,
} from '../__mocks__/testContext'

// Caller = shopper A (holds TOKEN_A). Other shopper = shopper B.
describe('authorization regressions', () => {
  const mismatchWarnings = (logger: { warn: jest.Mock }, operation: string) =>
    logger.warn.mock.calls.filter(
      ([entry]) =>
        entry.message === 'cross-device-cart.identity_arg_mismatch' &&
        entry.operation === operation
    )

  it("getSavedCart ignores a forged userId: it cannot read another shopper's reference and warns once", async () => {
    const { ctx, logger } = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_B)]: OF_B },
    })

    const result = await getSavedCart(
      undefined,
      {
        userId: SHOPPER_B,
        userType: 'STORE_USER',
        salesChannel: '1',
        nullOnEmpty: false,
      },
      ctx
    )

    expect(result).not.toBe(OF_B)
    expect(result).toBeNull()
    expect(mismatchWarnings(logger, 'getSavedCart')).toHaveLength(1)
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expectNoPiiInLogs(logger)
  })

  it("saveCurrentCart ignores a forged userId: it cannot write another shopper's key and warns once", async () => {
    const { ctx, store, logger } = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_B)]: OF_B },
    })

    await saveCurrentCart(
      undefined,
      {
        userId: SHOPPER_B,
        userType: 'STORE_USER',
        salesChannel: '1',
        orderFormId: OF_CURRENT_A,
      },
      ctx
    )

    expect(store.get(key(SHOPPER_B))).toBe(OF_B)
    expect(mismatchWarnings(logger, 'saveCurrentCart')).toHaveLength(1)
    expectNoPiiInLogs(logger)
  })

  it('a userId matching the authenticated shopper logs no warning', async () => {
    const { ctx, logger } = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_A)]: OF_A },
    })

    await getSavedCart(undefined, { userId: SHOPPER_A }, ctx)
    await saveCurrentCart(
      undefined,
      { userId: SHOPPER_A, orderFormId: null },
      ctx
    )
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('no warning when unauthenticated (it is logged as unauthenticated instead)', async () => {
    const { ctx, logger } = createContext()

    await getSavedCart(undefined, { userId: SHOPPER_B }, ctx)
    await saveCurrentCart(undefined, { userId: SHOPPER_B }, ctx)
    expect(mismatchWarnings(logger, 'getSavedCart')).toHaveLength(0)
    expect(mismatchWarnings(logger, 'saveCurrentCart')).toHaveLength(0)
  })

  it('saveCurrentCart never stores a foreign orderForm under the caller key', async () => {
    const { ctx, store } = createContext({ token: TOKEN_A })

    await saveCurrentCart(
      undefined,
      {
        userId: SHOPPER_A,
        userType: 'STORE_USER',
        salesChannel: '1',
        orderFormId: OF_B,
      },
      ctx
    )

    expect(store.get(key(SHOPPER_A))).toBeUndefined()
  })

  it("replaceCart with another shopper's savedCart returns nothing, sets no cookie, touches nothing", async () => {
    const {
      ctx,
      response,
      checkoutRest,
      checkoutIO,
      requestHub,
    } = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_A)]: OF_A, [key(SHOPPER_B)]: OF_B },
      items: { [OF_B]: [item(1)], [OF_CURRENT_A]: [item(2)] },
    })

    const result = await replaceCart(
      undefined,
      {
        savedCart: OF_B,
        currentCart: OF_CURRENT_A,
        strategy: 'REPLACE',
        userType: 'STORE_USER',
      },
      ctx
    )

    expect(result).toBeNull()
    expect(response.set).not.toHaveBeenCalled()
    expect(checkoutRest.removePaymentData).not.toHaveBeenCalled()
    expect(checkoutIO.getOrderForm).not.toHaveBeenCalledWith(OF_B)
    expect(checkoutIO.getItems).not.toHaveBeenCalledWith(OF_B)
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(requestHub.clearCart).not.toHaveBeenCalled()
  })
})
