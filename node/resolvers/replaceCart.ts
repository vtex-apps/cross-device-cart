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
    cookies,
  } = context

  const host = context.get('x-forwarded-host')

  cookies.set('checkout.vtex.com', `__ofid=${savedCart}`, {
    domain: host,
    overwrite: true,
    maxAge: 86400,
  })

  const orderForm = await checkoutIO.getOrderForm(savedCart)

  if (hasToCombine) {
    const savedItems = await checkoutIO.getItems(savedCart)
    const currentItems = await checkoutIO.getItems(currentCart)

    await requestHub.clearCart(savedCart)

    const items = mergeItems(currentItems, savedItems)

    items.forEach((element, index) => {
      element.id = Number(element.id)
      element.index = index
    })

    const newOrderForm = await checkoutIO.updateCart(savedCart, items)

    return newOrderForm
  }

  return orderForm
}
