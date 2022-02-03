import { mergeItems } from '../utils'

/**
 * Cross cart main feature.
 * Resolves how the stored reference's items will be handled
 *
 * @returns {PartialNewOrderForm | null}
 * If null, the Storefront Block should react throwing an error
 * @typedef PartialNewOrderForm a partial orderform, fielded
 * enough to update Store Framework's context relevant data.
 */
export const mergeCarts = async (
  _: any,
  { savedCart, currentCart, strategy = 'COMBINE' }: MergeCartsVariables,
  { clients: { checkoutIO, requestHub } }: Context
): Promise<PartialNewOrderForm | null> => {
  const savedItems = await checkoutIO.getOrderFormItems(savedCart)

  if (!savedItems.length) {
    return null
  }

  const currentItems = await checkoutIO.getOrderFormItems(currentCart)

  await requestHub.clearCart(currentCart)

  let items

  switch (strategy) {
    case 'REPLACE':
      items = savedItems
      break

    case 'ADD':
      items = mergeItems(currentItems, savedItems, false)
      break

    default:
    case 'COMBINE':
      items = mergeItems(currentItems, savedItems, true)
  }

  items.forEach((element, index) => {
    element.id = Number(element.id)
    element.index = index
  })

  const updatedOrderForm = await checkoutIO.updateCart(currentCart, items)

  return updatedOrderForm
}
