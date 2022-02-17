import { APP_NAME } from '../constants'
import { mergeItems } from '../utils'

/**
 * Cross cart main feature.
 * Resolves how the stored reference's items will be handled
 *
 * @returns {PartialOrderForm | null}
 * If null, the Storefront Block will react showing an error Toast
 * @typedef PartialOrderForm a partial orderform, fielded
 * to update Store Framework's context relevant data.
 */
export const mergeCarts = async (
  _: any,
  { savedCart, currentCart, strategy = 'REPLACE', userId }: MergeCartsVariables,
  { clients: { checkoutIO, requestHub, vbase } }: Context
): Promise<PartialOrderForm | null> => {
  await vbase.saveJSON(APP_NAME, userId, currentCart)

  const savedItems = await checkoutIO.getOrderFormItems(savedCart)

  if (!savedItems.length && strategy === 'REPLACE') {
    await requestHub.clearCart(currentCart)
    const emptyOrderForm = await checkoutIO.getOrderForm(currentCart)

    return emptyOrderForm
  }

  const currentItems = await checkoutIO.getOrderFormItems(currentCart)

  await requestHub.clearCart(currentCart)

  let items

  switch (strategy) {
    default:
    case 'REPLACE':
      items = savedItems
      break

    case 'ADD':
      items = mergeItems(currentItems, savedItems, false)
      break

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
