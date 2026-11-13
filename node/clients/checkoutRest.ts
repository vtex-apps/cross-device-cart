import type { InstanceOptions, IOContext } from '@vtex/api'
import { CacheType, JanusClient } from '@vtex/api'

import { isValidOrderFormId } from '../utils/identity'

interface RawAddress {
  receiverName?: unknown
  street?: unknown
  number?: unknown
  [key: string]: unknown
}

interface RawOrderFormOwnerFields {
  orderFormId?: string
  userProfileId?: string | null
  userType?: string | null
  loggedIn?: boolean
  clientProfileData?: {
    email?: string | null
    document?: string | null
    phone?: string | null
    firstName?: string | null
    lastName?: string | null
  } | null
  shippingData?: {
    address?: RawAddress | null
    selectedAddresses?: unknown[] | null
    availableAddresses?: unknown[] | null
  } | null
}

const isFilled = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0

/**
 * An address that identifies a person: an object with a non-empty
 * `receiverName`, `street` or `number`. Postal code, country, city, state,
 * neighborhood, geoCoordinates and addressType alone (e.g. from the shipping
 * simulator) are not identifying.
 */
function isIdentifyingAddress(address: unknown): boolean {
  if (typeof address !== 'object' || address === null) {
    return false
  }

  const { receiverName, street, number } = address as RawAddress

  return isFilled(receiverName) || isFilled(street) || isFilled(number)
}

/**
 * True when the orderForm carries client PII, i.e. any of:
 * - `clientProfileData` with a non-empty email, document, phone, firstName or lastName;
 * - `shippingData.address` that is an identifying address (see above);
 * - `shippingData.selectedAddresses` or `availableAddresses` with at least one
 *   identifying address.
 * A cart with only a postal code (shipping simulator) is not PII.
 */
function hasClientPii(orderForm: RawOrderFormOwnerFields): boolean {
  const profile = orderForm.clientProfileData
  const { address, selectedAddresses, availableAddresses } =
    orderForm.shippingData ?? {}

  return (
    isFilled(profile?.email) ||
    isFilled(profile?.document) ||
    isFilled(profile?.phone) ||
    isFilled(profile?.firstName) ||
    isFilled(profile?.lastName) ||
    isIdentifyingAddress(address) ||
    (Array.isArray(selectedAddresses) &&
      selectedAddresses.some(isIdentifyingAddress)) ||
    (Array.isArray(availableAddresses) &&
      availableAddresses.some(isIdentifyingAddress))
  )
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

      // Fail closed: an empty body, 204, HTML or array is not an orderForm, and
      // a response that does not echo the id cannot be trusted as this cart's owner.
      if (
        typeof orderForm !== 'object' ||
        orderForm === null ||
        Array.isArray(orderForm) ||
        !orderForm.orderFormId
      ) {
        throw new Error('unexpected orderForm response')
      }

      // A response for another orderForm cannot be trusted as the owner of this one.
      if (orderForm.orderFormId !== orderFormId) {
        return null
      }

      return {
        orderFormId,
        userProfileId: orderForm.userProfileId || null,
        userType: orderForm.userType ?? null,
        loggedIn: Boolean(orderForm.loggedIn),
        hasClientProfile: hasClientPii(orderForm),
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
