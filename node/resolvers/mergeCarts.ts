import type { ItemInput } from 'vtex.checkout-graphql'

/**
 * Cross cart main feature.
 * @summary Resolves how the stored reference's items will be handled.
 * @param {string} savedCart - Unique reference orderForm identification string
 * @param {string} currentCart - Unique current orderForm identification string
 * @param {MergeStrategy} strategy - Cart's items merge logic
 * @returns {PartialNewOrderForm | null}
 * If null, the Storefront Block will react throwing an error
 * @typedef PartialNewOrderForm a partial orderform, fielded
 * enough to update Store Framework's context relevant data.
 */
export const mergeCarts = async (
  _: any,
  { savedCart, currentCart, strategy }: MergeCartsVariables,
  { clients: { checkout } }: Context
): Promise<PartialNewOrderForm | null> => {
  // eslint-disable-next-line no-console
  console.log(currentCart, strategy)

  try {
    const { data } = await checkout.getOrderFormItems(savedCart)

    // eslint-disable-next-line no-console
    console.log('========', data?.orderForm.items)

    if (!data?.orderForm.items) {
      return null
    }

    let itemsToUpdate: PartialItem[]

    if (strategy === 'add') {
      itemsToUpdate = data.orderForm.items
    }

    const updatedOrderForm = await checkout.updateItems(
      currentCart,
      itemsToUpdate
    )

    return updatedOrderForm
  } catch (err) {
    throw err
  }
}
