import { mergeItems } from '../utils'

/**
 * Cross cart main feature
 * @returns {PartialOrderForm}
 * @typedef PartialOrderForm a partial orderform, fielded
 * to update Store Framework's context relevant data.
 */
export const replaceCart = async (
  _: any,
  { savedCart, currentCart, strategy, userType }: ReplaceCartVariables,
  context: Context
): Promise<PartialOrderForm | null> => {
  const {
    clients: { checkoutIO, checkoutRest, requestHub },
    response,
  } = context

  if( userType != "CALL_CENTER_OPERATOR") {
    const host = context.get('x-forwarded-host')

    response.set(
      'set-cookie',
      `checkout.vtex.com=__ofid=${savedCart}; Max-Age=15552000; Domain=${host}; path=/; secure; samesite=lax; httponly`
    )

    await checkoutRest.removePaymentData(savedCart)

    const savedOrderForm = await checkoutIO.getOrderForm(savedCart)
    const savedItems = await checkoutIO.getItems(savedCart)

    if (strategy === 'REPLACE') {
      if (!savedItems.length) {
        return await checkoutIO.getOrderForm(currentCart)
      }

      return savedOrderForm
    }
    else {
      /**
       * Add to cart has a specific graphql INPUT type.
       * These calls ensure handling correct types from start to finish.
       */
      const currentItems = await checkoutIO.getItems(currentCart)

      const tally = strategy === 'COMBINE'

      const items = mergeItems(currentItems, savedItems, tally)

      if (!items.length) {
        return await checkoutIO.getOrderForm(currentCart)
      }

      await requestHub.clearCart(savedCart)

      items.forEach((element, index) => {
        element.id = Number(element.id)
        element.index = index
      })

      const newOrderForm = await checkoutIO.addToCart(savedCart, items)

      return newOrderForm
    }


  } else {
    return null

  }
}
