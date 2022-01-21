import type { OrderForm as CheckoutOrderForm } from 'vtex.checkout-graphql'

export const mergeCarts = async (
  _: any,
  { savedCart, currentCart }: { savedCart: string; currentCart: string },
  ctx: Context
): Promise<CheckoutOrderForm | null> => {
  const {
    clients: { checkout },
  } = ctx

  try {
    const savedCartOrderForm = await checkout.getOrderForm(savedCart)

    if (!savedCartOrderForm.items.length) {
      return null
    }

    const updatedOrderForm = await checkout.addItems(
      currentCart,
      savedCartOrderForm.items
    )

    return updatedOrderForm
  } catch (err) {
    throw err
  }
}
