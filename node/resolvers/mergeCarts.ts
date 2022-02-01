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
  { savedCart, currentCart, strategy = 'ADD' }: MergeCartsVariables,
  { clients: { checkoutIO, requestHub } }: Context
): Promise<PartialNewOrderForm | null> => {
  const savedItems = await checkoutIO.getOrderFormItems(savedCart)

  if (!savedItems.length) {
    return null
  }

  const currentItems = await checkoutIO.getOrderFormItems(currentCart)

  let items

  switch (strategy) {
    case 'COMBINE':
      items = mergeItems(currentItems, savedItems, true)
      break

    case 'REPLACE':
      await requestHub.clearCart(currentCart)
      items = savedItems
      break

    default:
    case 'ADD':
      items = mergeItems(currentItems, savedItems, false)
  }

  const updatedOrderForm = await checkoutIO.updateItems(currentCart, items)

  return updatedOrderForm
}
