import {
  CacheType,
  ExternalClient,
  InstanceOptions,
  IOContext,
} from '@vtex/api'

import { httpStatus } from '../utils/httpStatus'

export interface RawOrderFormOwnerFields {
  orderFormId?: string
  userProfileId?: string | null
  userType?: string | null
  loggedIn?: boolean
  clientProfileData?: { email?: string | null } | null
  salesChannel?: string | null
}

/**
 * Keeps only the fields needed for ownership decisions. The email is kept only
 * to compare it with the VTEX ID login email (FR-D1). It is never logged or
 * returned to the client, and it may be masked ("***") on Data Protection Plus accounts.
 */
export const toOrderFormOwner = (
  orderFormId: string,
  raw: RawOrderFormOwnerFields
): OrderFormOwner => ({
  orderFormId: raw.orderFormId ?? orderFormId,
  userProfileId: raw.userProfileId || null,
  userType: raw.userType || null,
  loggedIn: raw.loggedIn === true,
  hasClientProfile: Boolean(raw.clientProfileData?.email),
  email: raw.clientProfileData?.email || null,
  salesChannel: raw.salesChannel ?? null,
})

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

  /**
   * Returns the owner fields of an orderForm, or null when it does not exist (404).
   * Any other failure is thrown so callers never mistake an outage for "not found".
   */
  public async getOrderFormOwner(
    orderFormId: string
  ): Promise<OrderFormOwner | null> {
    try {
      const raw = await this.http.get<RawOrderFormOwnerFields>(
        `pub/orderForm/${encodeURIComponent(orderFormId)}`,
        { metric: 'checkout-orderform-owner', cacheable: CacheType.None }
      )

      // A response for another orderForm cannot be trusted as the owner of this one.
      if (raw?.orderFormId && raw.orderFormId !== orderFormId) {
        return null
      }

      return toOrderFormOwner(orderFormId, raw ?? {})
    } catch (error) {
      if (httpStatus(error) === 404) {
        return null
      }

      throw error
    }
  }

  public async removePaymentData(orderFormId: string): Promise<any> {
    return this.http.post(
      `pub/orderForm/${orderFormId}/attachments/paymentData`,
      {
        payments: [],
      }
    )
  }
}
