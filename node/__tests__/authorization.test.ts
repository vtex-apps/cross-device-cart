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
  item,
  key,
} from '../__mocks__/testContext'

// Caller = shopper A (holds TOKEN_A). Other shopper = shopper B.
describe('authorization regressions', () => {
  it("getSavedCart cannot read another shopper's reference", async () => {
    const { ctx } = createContext({
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
  })

  it("saveCurrentCart cannot write another shopper's key", async () => {
    const { ctx, store } = createContext({
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
