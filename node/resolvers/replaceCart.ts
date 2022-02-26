import { serialize } from 'cookie'

import { mergeItems } from '../utils'

/**
 * Cross cart main feature
 * @returns {PartialOrderForm}
 * @typedef PartialOrderForm a partial orderform, fielded
 * to update Store Framework's context relevant data.
 */
export const replaceCart = async (
  _: any,
  { savedCart, currentCart, hasToCombine }: ReplaceCartVariables,
  context: Context
): Promise<any> => {
  const {
    clients: { checkoutIO, requestHub },
    response,
  } = context

  const host = context.get('x-forwarded-host')

  response.set(
    'set-cookie',
    serialize('checkout.vtex.com', `__ofid=${savedCart}`, {
      domain: host,
      maxAge: 86400,
    })
  )

  const orderForm = await checkoutIO.getOrderForm(savedCart)

  if (hasToCombine) {
    const savedItems = await checkoutIO.getItems(savedCart)
    const currentItems = await checkoutIO.getItems(currentCart)

    const items = mergeItems(currentItems, savedItems)

    if (!items.length) return orderForm

    await requestHub.clearCart(savedCart)

    items.forEach((element, index) => {
      element.id = Number(element.id)
      element.index = index
    })

    const newOrderForm = await checkoutIO.addToCart(savedCart, items)

    return newOrderForm
  }

  return orderForm
}
