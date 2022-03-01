import type { InstanceOptions, IOContext, RequestConfig } from '@vtex/api'
import { JanusClient } from '@vtex/api'

import { statusToError } from '../utils'

export default class RequestHub extends JanusClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(context, {
      ...options,
      headers: {
        ...options?.headers,
        VtexIdclientAutCookie:
          context.storeUserAuthToken ?? context.adminUserAuthToken ?? '',
      },
    })
  }

  /**
   * This request removes all items from a given cart, leaving it empty
   *
   * @func clearCart
   * @public
   * @param {string} orderFormId OrderForm ID
   * @see {@link https://developers.vtex.com/vtex-rest-api/reference/shopping-cart#removeallitems-1}
   */
  public clearCart = (orderFormId: string) =>
    this.post(this.routes.clearCart(orderFormId), {})

  protected get = <T>(url: string, config: RequestConfig = {}) => {
    config.headers = {
      ...config.headers,
    }

    return this.http
      .get<T>(url, config)
      .catch((err) => statusToError(err)) as Promise<T>
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
      .catch((err) => statusToError(err)) as Promise<T>
  }

  private get routes() {
    return {
      clearCart: (orderFormId: string) =>
        `/api/checkout/pub/orderForm/${orderFormId}/items/removeAll`,
    }
  }
}
