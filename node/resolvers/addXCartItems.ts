import type { OrderForm as CheckoutOrderForm } from 'vtex.checkout-graphql'

export const addXCartItems = async (
  _: any,
  { fromCart, toCart }: { fromCart: string; toCart: string },
  ctx: Context
): Promise<CheckoutOrderForm | null> => {
  const {
    clients: { checkout },
  } = ctx

  try {
    const XCartOrderForm = await checkout.getOrderForm(fromCart)

    if (!XCartOrderForm.items.length) {
      return null
    }

    const OrderForm = await checkout.addItems(toCart, XCartOrderForm.items)

    return OrderForm
  } catch (err) {
    throw err
  }
}
