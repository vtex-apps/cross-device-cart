import type { InstanceOptions, IOContext, RequestConfig } from '@vtex/api'
import { JanusClient } from '@vtex/api'
import type { OrderForm as CheckoutOrderForm } from 'vtex.checkout-graphql'

import { statusToError } from '../utils'

export class Checkout extends JanusClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(ctx, {
      ...options,
      headers: {
        ...options?.headers,
        ...(ctx.storeUserAuthToken
          ? { VtexIdclientAutCookie: ctx.storeUserAuthToken }
          : null),
      },
    })
  }

  public getOrderForm = (orderFormId: string) => {
    return this.get<CheckoutOrderForm>(this.routes.getOrderForm(orderFormId), {
      metric: 'checkout-orderForm',
    })
  }

  public addItems = (orderFormId: string, items: CheckoutOrderForm['items']) =>
    this.post<CheckoutOrderForm, { orderItems: CheckoutOrderForm['items'] }>(
      this.routes.addItems(orderFormId),
      {
        orderItems: items,
      },
      { metric: 'checkout-AddItem' }
    )

  protected get = <T>(url: string, config: RequestConfig = {}) => {
    try {
      return this.http.get<T>(url, config)
    } catch (e) {
      return (statusToError(e) as unknown) as CheckoutOrderForm
    }
  }

  protected post = async <T, D>(
    url: string,
    data?: D,
    config: RequestConfig = {}
  ) => {
    config.headers = {
      ...config.headers,
    }
    try {
      return this.http.post<T>(url, data, config)
    } catch (e) {
      return (statusToError(e) as unknown) as CheckoutOrderForm
    }
  }

  private get routes() {
    const base = '/api/checkout/pub'

    return {
      addItems: (orderFormId: string) =>
        `${base}/orderForm/${orderFormId}/items`,
      getOrderForm: (orderFormId: string) => `${base}/orderForm/${orderFormId}`,
    }
  }
}
