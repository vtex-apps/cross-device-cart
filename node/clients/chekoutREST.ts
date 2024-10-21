import { ExternalClient, InstanceOptions, IOContext } from "@vtex/api"

export default class CheckoutRestClient extends ExternalClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    const { account } = context

    super(
      `http://${account}.vtexcommercestable.com.br/api/checkout/`,
      context,
      {
        ...options,
        headers: {
          ...options?.headers,
          'Content-Type': 'application/json',
          'X-Vtex-Use-Https': 'true',
          VtexIdclientAutCookie: context.authToken,
        },
      }
    )
  }

  public async removePaymentData(orderFormId: string): Promise<any> {
    return this.http.post(`pub/orderForm/${orderFormId}/attachments/paymentData`, {
      payments: []
    })
  }
}
