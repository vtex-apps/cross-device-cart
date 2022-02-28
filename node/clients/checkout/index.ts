import type {
  IOContext,
  InstanceOptions,
  Serializable,
  GraphQLResponse,
} from '@vtex/api'
import { AppGraphQLClient } from '@vtex/api'
import { ItemInput } from 'vtex.checkout-graphql'

import {
  GET_ORDERFORM_ITEMS_QUERY,
  GET_ORDERFORM_QUERY,
  ADD_ITEMS_MUTATION,
} from './queries'

class CustomGraphQLError extends Error {
  public graphQLErrors: any

  constructor(message: string, graphQLErrors: any[]) {
    super(message)
    this.graphQLErrors = graphQLErrors
  }
}

function throwOnGraphQLErrors<T extends Serializable>(message: string) {
  return function maybeGraphQLResponse(response: GraphQLResponse<T>) {
    if (response && response.errors && response.errors.length > 0) {
      throw new CustomGraphQLError(message, response.errors)
    }

    return response
  }
}

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
   * Retrieves the Items associated to a given shopping cart
   *
   * @func getItems
   * @public
   * @param {string} orderFormId OrderForm ID
   * @return {PartialItem[]} List of partial Items
   */
  public getItems = async (orderFormId: string): Promise<PartialItem[]> => {
    const partialItems = await this.graphql
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
      .then(
        throwOnGraphQLErrors(
          'Error getting items data from vtex.checkout-graphql'
        )
      )
      .then((query) => {
        return query.data!.orderForm.items
      })

    return partialItems
  }

  /**
   * Retrieves data associated to a given shopping cart
   *
   * @func getOrderForm
   * @public
   * @param {string} orderFormId OrderForm ID
   * @return {PartialOrderForm} New partial OrderForm
   */
  public getOrderForm = async (
    orderFormId: string
  ): Promise<PartialOrderForm> => {
    const partialOrderForm = await this.graphql
      .query<{ orderForm: PartialOrderForm }, { orderFormId: string }>(
        {
          query: GET_ORDERFORM_QUERY,
          variables: {
            orderFormId,
          },
        },
        {
          metric: 'checkout-orderform',
        }
      )
      .then(
        throwOnGraphQLErrors('Error getting data from vtex.checkout-graphql')
      )
      .then((query) => {
        return query.data!.orderForm
      })

    return partialOrderForm
  }

  /**
   * @func addToCart
   * @public
   * @param {string} orderFormId OrderForm ID
   * @param {ItemInput[]} items Input list of Items
   * @return {PartialOrderForm} New partial OrderForm
   */
  public addToCart = async (
    orderFormId: string,
    items: ItemInput[]
  ): Promise<PartialOrderForm> => {
    const partialOrderForm = await this.graphql
      .mutate<
        { orderForm: PartialOrderForm },
        { orderFormId: string; items: ItemInput[] }
      >(
        {
          mutate: ADD_ITEMS_MUTATION,
          variables: {
            orderFormId,
            items,
          },
        },
        {
          metric: 'checkout-add-items',
        }
      )
      .then(
        throwOnGraphQLErrors('Error adding items with vtex.checkout-graphql')
      )
      .then((query) => {
        return query.data!.orderForm
      })

    return partialOrderForm
  }
}
