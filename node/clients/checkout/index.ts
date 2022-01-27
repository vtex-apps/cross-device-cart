import type { IOContext, InstanceOptions } from '@vtex/api'
import { AppGraphQLClient } from '@vtex/api'
import { ItemInput } from 'vtex.checkout-graphql'

import { GET_ORDERFORM_ITEMS_QUERY, UPDATE_ITEMS_MUTATION } from './queries'

export default class CheckoutIO extends AppGraphQLClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super('vtex.checkout-graphql@0.x', context, {
      ...options,
      headers: {
        ...options?.headers,
      },
    })
  }

  /**
   * This request gets all Items associated to a given shopping cart
   *
   * @func getOrderFormItems
   * @public
   * @param {string} orderFormId OrderForm ID
   * @return {PartialItem[]} List of partial Items
   */
  public getOrderFormItems = (orderFormId: string) => {
    return this.graphql
      .query<PartialOrderFormItems, { orderFormId: string }>(
        {
          query: GET_ORDERFORM_ITEMS_QUERY,
          variables: {
            orderFormId,
          },
        },
        {
          metric: 'checkout-orderform',
        }
      )
      .then((res) => res.data?.orderForm.items) as Promise<PartialItem[]>
  }

  /**
   * With the items update request you can:
   *
   * - Add items to the cart
   *
   * - Change the quantity of one or more items
   *
   * - Remove items from the cart (by changing their quantity to 0)
   *
   * @func updateItems
   * @public
   * @param {string} orderFormId OrderForm ID
   * @param {ItemInput[]} items Input list of Items
   * @return {PartialNewOrderForm} New partial OrderForm
   * @see {@link https://developers.vtex.com/vtex-rest-api/reference/orders}
   */
  public updateItems = (orderFormId: string, items: ItemInput[]) => {
    return this.graphql
      .query<
        PartialNewOrderForm,
        { orderFormId: string; orderItems: ItemInput[] }
      >(
        {
          query: UPDATE_ITEMS_MUTATION,
          variables: {
            orderFormId,
            orderItems: items,
          },
        },
        {
          metric: 'checkout-update-items',
        }
      )
      .then((res) => res.data) as Promise<PartialNewOrderForm>
  }
}
