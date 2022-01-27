import { addMissingItems, combineItems } from '../utils'
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
  { savedCart, currentCart, strategy = 'add' }: MergeCartsVariables,
  { clients: { checkoutIO, requestHub } }: Context
): Promise<PartialNewOrderForm | null> => {
  // eslint-disable-next-line no-console
  console.log(currentCart, strategy)

  try {
    const savedItems = await checkoutIO.getOrderFormItems(savedCart)

    if (!savedItems.length) {
      return null
    }

    const currentItems = await checkoutIO.getOrderFormItems(currentCart)

    let items

    switch (strategy) {
      case 'combine':
        items = combineItems(currentItems, savedItems)
        break

      case 'replace':
        await requestHub.clearCart(currentCart)
        items = savedItems
        break

      default:
      case 'add':
        items = addMissingItems(currentItems, savedItems)
    }

    const updatedOrderForm = await checkoutIO.updateItems(currentCart, items)

    return updatedOrderForm
  } catch (err) {
    throw err
  }
}
