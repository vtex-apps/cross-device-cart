import type { IOContext, InstanceOptions } from '@vtex/api'
import { AppGraphQLClient } from '@vtex/api'
import { ItemInput } from 'vtex.checkout-graphql'

import { GET_ORDERFORM_ITEMS_QUERY, UPDATE_ITEMS_MUTATION } from './queries'

export default class IOCheckout extends AppGraphQLClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super('vtex.checkout-graphql@0.x', context, {
      ...options,
      headers: {
        ...options?.headers,
      },
    })
  }

  public getOrderFormItems = (orderFormId: string) => {
    return this.graphql.query<PartialOrderFormItems, { orderFormId: string }>(
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
  }

  /**
    With the items update request you can:
    -Add items to the cart
    -Change the quantity of one or more items
    -Remove items from the cart (by changing their quantity to 0)
   */
  public updateItems = (orderFormId: string, items: ItemInput[]) => {
    return this.graphql.query<
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
  }
}
