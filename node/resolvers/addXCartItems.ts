import type { OrderForm as CheckoutOrderForm } from 'vtex.checkout-graphql'

export const addXCartItems = async (
  _: any,
  { fromCart, toCart }: { fromCart: string; toCart: string },
  ctx: Context
): Promise<CheckoutOrderForm> => {
  try {
    // eslint-disable-next-line no-console
    console.log('-----------------NODE DEBUG-----------------------')

    const {
      clients: { checkout },
    } = ctx

    const XCartOrderForm = await checkout.getOrderForm(fromCart)

    // eslint-disable-next-line no-console
    console.log(XCartOrderForm.items)

    /* if (!XCartOrderForm.items.length) {
      return
    } */

    const OrderForm = await checkout.addItems(toCart, XCartOrderForm.items)

    // eslint-disable-next-line no-console
    console.log(OrderForm.items)

    return OrderForm
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('----------------------------------------', err)

    throw err
  }
}
