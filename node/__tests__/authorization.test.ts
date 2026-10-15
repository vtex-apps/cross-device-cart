/**
 * Authorization regressions. Written before the fix: on v1.5.1 every
 * test in this file fails; after the fix every test passes.
 * Caller = SHOPPER_A (valid webstore token). Other shopper = SHOPPER_B.
 */
import { getSavedCart } from '../resolvers/getSavedCart'
import { saveCurrentCart } from '../resolvers/saveCurrentCart'
import { replaceCart } from '../resolvers/replaceCart'
import {
  item,
  mockContext,
  SHOPPER_A,
  SHOPPER_B,
  OF_A,
  OF_ANON,
  OF_B,
  expectNoIdentifiersLogged,
} from '../testUtils/mockContext'

describe('authorization regressions', () => {
  it("getSavedCart ignores a forged userId (never reads another shopper's reference) and warns once", async () => {
    const { ctx, logger } = mockContext({
      shopper: SHOPPER_A,
      store: { [SHOPPER_B]: OF_B },
    })

    const result = await getSavedCart(
      {},
      { userId: SHOPPER_B, nullOnEmpty: false },
      ctx
    )

    expect(result).not.toBe(OF_B)
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.identity_arg_mismatch',
      operation: 'getSavedCart',
    })
    expectNoIdentifiersLogged(logger)
  })

  it("saveCurrentCart ignores a forged userId (never writes another shopper's key) and warns once", async () => {
    const { ctx, vbaseData, logger } = mockContext({
      shopper: SHOPPER_A,
      store: { [SHOPPER_B]: OF_B },
    })

    await saveCurrentCart({}, { userId: SHOPPER_B, orderFormId: OF_A }, ctx)

    expect(vbaseData[SHOPPER_B]).toBe(OF_B)
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.identity_arg_mismatch',
      operation: 'saveCurrentCart',
    })
    expect(
      logger.warn.mock.calls.filter(
        ([e]: any) => e.message === 'cross-device-cart.identity_arg_mismatch'
      )
    ).toHaveLength(1)
    expectNoIdentifiersLogged(logger)
  })

  it('a matching or absent userId logs no mismatch warning and keeps the result', async () => {
    const { ctx, logger } = mockContext({
      shopper: SHOPPER_A,
      store: { [SHOPPER_A]: OF_A },
    })

    expect(
      await getSavedCart({}, { userId: SHOPPER_A, nullOnEmpty: false }, ctx)
    ).toBe(OF_A)
    expect(await getSavedCart({}, { nullOnEmpty: false }, ctx)).toBe(OF_A)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('an unauthenticated request with a userId logs no mismatch warning', async () => {
    const { ctx, logger } = mockContext({ shopper: null })

    await getSavedCart({}, { userId: SHOPPER_B }, ctx)
    expect(
      logger.warn.mock.calls.some(
        ([e]: any) => e.message === 'cross-device-cart.identity_arg_mismatch'
      )
    ).toBe(false)
  })

  it('saveCurrentCart never stores a foreign orderForm under the caller key', async () => {
    const { ctx, vbaseData } = mockContext({ shopper: SHOPPER_A, cookie: OF_A })

    await saveCurrentCart({}, { userId: SHOPPER_A, orderFormId: OF_ANON }, ctx)

    expect(vbaseData[SHOPPER_A]).toBeUndefined()
  })

  it("replaceCart with another shopper's savedCart returns nothing, sets no cookie, touches nothing", async () => {
    const { ctx, response, checkoutIO, requestHub, logger } = mockContext({
      shopper: SHOPPER_A,
      store: { [SHOPPER_A]: OF_A, [SHOPPER_B]: OF_B },
    })

    const result = await replaceCart(
      {},
      { savedCart: OF_B, currentCart: OF_A, strategy: 'REPLACE', userType: '' },
      ctx
    )

    expect(result).toBeNull()
    expect(response.set).not.toHaveBeenCalled()
    expect(checkoutIO.getOrderForm).not.toHaveBeenCalledWith(OF_B)
    expect(checkoutIO.getItems).not.toHaveBeenCalled()
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(requestHub.clearCart).not.toHaveBeenCalled()
    expectNoIdentifiersLogged(logger)
  })

  it("replaceCart never adopts another shopper's cart stored under the caller key", async () => {
    const { ctx, response, checkoutIO, vbaseData } = mockContext({
      shopper: SHOPPER_A,
      store: { [SHOPPER_A]: OF_B },
      items: { [OF_B]: [item(1, 1)] },
    })

    const result = await replaceCart(
      {},
      { savedCart: OF_B, currentCart: OF_A, strategy: 'REPLACE', userType: '' },
      ctx
    )

    expect(result).toBeNull()
    expect(response.set).not.toHaveBeenCalled()
    expect(checkoutIO.getOrderForm).not.toHaveBeenCalled()
    expect(vbaseData[SHOPPER_A]).toBeNull()
  })

  it("replaceCart with COMBINE never clears nor writes another shopper's cart", async () => {
    const { ctx, checkoutIO, requestHub } = mockContext({
      shopper: SHOPPER_A,
      store: { [SHOPPER_B]: OF_B },
      items: { [OF_B]: [item(1, 1)], [OF_A]: [item(2, 1)] },
    })

    await replaceCart(
      {},
      { savedCart: OF_B, currentCart: OF_A, strategy: 'COMBINE', userType: '' },
      ctx
    )

    expect(requestHub.clearCart).not.toHaveBeenCalledWith(OF_B)
    expect(checkoutIO.addToCart).not.toHaveBeenCalledWith(
      OF_B,
      expect.anything()
    )
  })
})
