import type { OrderForm as CheckoutOrderForm } from 'vtex.checkout-graphql'

export const addXCartItems = async (
  _: any,
  { fromCart, toCart }: { fromCart: string; toCart: string },
  { clients: { checkout } }: Context
): Promise<CheckoutOrderForm> => {
  try {
    const { items } = await checkout.getOrderForm(fromCart)

    const newOrderForm = await checkout.addItems(toCart, items)

    return newOrderForm
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('------', err)

    throw err
  }
}
