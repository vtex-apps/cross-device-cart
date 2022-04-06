import { mergeItems } from '../utils'

/**
 * Cross cart main feature
 * @returns {PartialOrderForm}
 * @typedef PartialOrderForm a partial orderform, fielded
 * to update Store Framework's context relevant data.
 */
export const replaceCart = async (
  _: any,
  { savedCart, currentCart, strategy }: ReplaceCartVariables,
  context: Context
): Promise<PartialOrderForm | null> => {
  const {
    clients: { checkoutIO, requestHub },
    response,
  } = context

  const host = context.get('x-forwarded-host')

  response.set(
    'set-cookie',
    `checkout.vtex.com=__ofid=${savedCart}; Max-Age=86400; Domain=${host}`
  )

  const orderForm = await checkoutIO.getOrderForm(savedCart)

  if (strategy !== 'REPLACE') {
    /**
     * Add to cart has a specific graphql INPUT type.
     * These calls ensure handling correct types from start to finish.
     */
    const savedItems = await checkoutIO.getItems(savedCart)
    const currentItems = await checkoutIO.getItems(currentCart)

    const tally = strategy === 'COMBINE'

    const items = mergeItems(currentItems, savedItems, tally)

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
