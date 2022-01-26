import { eqBy, prop, unionWith } from 'ramda'
/**
 * Cross cart main feature.
 * @summary Resolves how the stored reference's items will be handled.
 * @returns {PartialNewOrderForm | null}
 * If null, the Storefront Block will react throwing an error
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
    const { data: savedItems } = (await checkoutIO.getOrderFormItems(
      savedCart
    )) as any

    const { data: currentItems } = (await checkoutIO.getOrderFormItems(
      currentCart
    )) as any

    if (!savedItems?.orderForm.items) {
      return null
    }

    let items

    switch (strategy) {
      case 'combine':
        break

      case 'replace':
        await requestHub.clearCart(currentCart)
        items = savedItems
        break

      default:
      case 'add': {
        const uniqueByID = eqBy(prop('id'))

        /* Combines two lists into a set; the ID property is used to
        determine duplicated items. If an element exists in both lists,
        the first element from the first list will be used. */
        items = unionWith(uniqueByID, currentItems, savedItems)
      }
    }

    items.forEach((element, index) => {
      element.index = index
    })

    const updatedOrderForm = await checkoutIO.updateItems(currentCart, items)

    return updatedOrderForm
  } catch (err) {
    throw err
  }
}
