import type { ItemInput } from 'vtex.checkout-graphql'

/**
 * @returns {PartialNewOrderForm | null}
 * If null, the Storefront Block will react with throw error
 * @typedef PartialNewOrderForm a partial orderform, fielded
 * enough for the Store Framework context to update cart's items
 * relevancy data.
 */
export const mergeCarts = async (
  _: any,
  variables: MergeCartsVariables,
  ctx: Context
): Promise<PartialNewOrderForm | null> => {
  const { savedCart, currentCart, strategy } = variables
  const {
    clients: { checkout },
  } = ctx

  // eslint-disable-next-line no-console
  console.log(currentCart, strategy)

  try {
    const { data } = await checkout.getOrderFormItems(savedCart)

    // eslint-disable-next-line no-console
    console.log('========', data?.orderForm.items)

    if (!data?.orderForm.items) {
      return null
    }

    const itemsToUpdate = [] as ItemInput[]

    const updatedOrderForm = await checkout.updateItems(
      currentCart,
      itemsToUpdate
    )

    return updatedOrderForm
  } catch (err) {
    throw err
  }
}
