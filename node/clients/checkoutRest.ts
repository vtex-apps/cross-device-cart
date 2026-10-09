import type { InstanceOptions, IOContext } from '@vtex/api'
import { CacheType, JanusClient } from '@vtex/api'

import { isValidOrderFormId } from '../utils/identity'

interface RawOrderFormOwnerFields {
  orderFormId?: string
  userProfileId?: string | null
  userType?: string | null
  loggedIn?: boolean
  clientProfileData?: { email?: string | null } | null
}

/**
 * Checkout REST calls made with the app's own credentials.
 * Only used to READ owner fields; never to mutate a cart.
 */
export default class CheckoutRestClient extends JanusClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(context, {
      ...options,
      headers: {
        ...options?.headers,
        VtexIdclientAutCookie: context.authToken,
      },
    })
  }

  /**
   * Returns the owner projection of an orderForm, or null when the id is
   * invalid or Checkout answers 404 (NOT_FOUND). Any other error is thrown
   * (LOOKUP_FAILED: callers keep the reference).
   */
  public async getOrderFormOwner(
    orderFormId: string
  ): Promise<OrderFormOwner | null> {
    if (!isValidOrderFormId(orderFormId)) {
      return null
    }

    try {
      const orderForm = await this.http.get<RawOrderFormOwnerFields>(
        `/api/checkout/pub/orderForm/${orderFormId}`,
        {
          metric: 'checkout-orderform-owner',
          cacheable: CacheType.None,
        }
      )

      return {
        orderFormId,
        userProfileId: orderForm.userProfileId || null,
        userType: orderForm.userType ?? null,
        loggedIn: Boolean(orderForm.loggedIn),
        hasClientProfile: Boolean(orderForm.clientProfileData?.email),
        email: orderForm.clientProfileData?.email ?? null,
      }
    } catch (error) {
      const status = (error as any)?.response?.status

      if (status === 404) {
        return null
      }

      throw error
    }
  }
}
