import type { InstanceOptions, IOContext, RequestConfig } from '@vtex/api'
import { JanusClient } from '@vtex/api'

import { statusToError } from '../utils'

export default class RequestHub extends JanusClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(context, {
      ...options,
      headers: {
        ...options?.headers,
        VtexIdclientAutCookie: context.authToken,
      },
    })
  }

  public getOrder = (orderId: string): Promise<Order> =>
    this.get(this.routes.orders(orderId))

  public clearCart = (orderFormId: string) =>
    this.get(this.routes.clearCart(orderFormId))

  protected get = <T>(url: string, config: RequestConfig = {}) => {
    return this.http.get<T>(url, config).catch(statusToError) as Promise<T>
  }

  protected post = async <T>(
    url: string,
    data?: any,
    config: RequestConfig = {}
  ) => {
    config.headers = {
      ...config.headers,
    }

    return this.http
      .post<T>(url, data, config)
      .catch(statusToError) as Promise<T>
  }

  private get routes() {
    return {
      orders: (orderId: string) => `/api/oms/pvt/orders/${orderId}`,
      clearCart: (orderFormId: string) =>
        `/api/checkout/pub/orderForm/${orderFormId}/items/removeAll`,
    }
  }
}
