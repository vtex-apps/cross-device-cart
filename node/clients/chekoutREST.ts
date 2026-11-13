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
  clientProfileData?: {
    email?: string | null
    document?: string | null
    phone?: string | null
    firstName?: string | null
    lastName?: string | null
  } | null
  shippingData?: {
    address?: Record<string, unknown> | null
    selectedAddresses?: unknown[] | null
    availableAddresses?: unknown[] | null
  } | null
  salesChannel?: string | null
}

const isFilled = (value: unknown): boolean =>
  typeof value === 'string' && value.trim() !== ''

/**
 * An address that identifies a person: a non-empty `receiverName`, `street` or
 * `number`. A postal code, country, city, state, neighborhood, coordinates or
 * address type alone (e.g. from the shipping simulator) is not PII.
 */
const isIdentifyingAddress = (address: unknown): boolean => {
  if (
    typeof address !== 'object' ||
    address === null ||
    Array.isArray(address)
  ) {
    return false
  }

  const { receiverName, street, number } = address as Record<string, unknown>

  return isFilled(receiverName) || isFilled(street) || isFilled(number)
}

const hasIdentifyingAddress = (raw: RawOrderFormOwnerFields): boolean => {
  const { shippingData } = raw

  return (
    isIdentifyingAddress(shippingData?.address) ||
    [shippingData?.selectedAddresses, shippingData?.availableAddresses].some(
      (list) => Array.isArray(list) && list.some(isIdentifyingAddress)
    )
  )
}

const hasClientPii = (raw: RawOrderFormOwnerFields): boolean => {
  const profile = raw.clientProfileData

  return (
    [
      profile?.email,
      profile?.document,
      profile?.phone,
      profile?.firstName,
      profile?.lastName,
    ].some(isFilled) || hasIdentifyingAddress(raw)
  )
}

/**
 * Keeps only the fields needed for ownership decisions. The email is kept only
 * to compare it with the VTEX ID login email (FR-D1). It is never logged or
 * returned to the client, and it may be masked ("***") on Data Protection Plus accounts.
 * `hasClientProfile` is true when the cart holds client PII: a non-empty
 * `clientProfileData` email, document, phone, first name or last name, or an
 * identifying address (receiver name, street or number) in
 * `shippingData.address`, `selectedAddresses` or `availableAddresses`. An
 * address with only postal code, country, city, state, neighborhood,
 * coordinates or address type (shipping simulator) is not PII.
 */
export const toOrderFormOwner = (
  orderFormId: string,
  raw: RawOrderFormOwnerFields
): OrderFormOwner => ({
  orderFormId: raw.orderFormId ?? orderFormId,
  userProfileId: raw.userProfileId || null,
  userType: raw.userType || null,
  loggedIn: raw.loggedIn === true,
  hasClientProfile: hasClientPii(raw),
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

      // Fail closed: a body that is not an object echoing the orderForm id
      // (empty, 204, HTML, array) says nothing about the owner. Thrown inside
      // the try block, it is not an HTTP error and reaches the caller as such.
      if (
        typeof raw !== 'object' ||
        raw === null ||
        Array.isArray(raw) ||
        !raw.orderFormId
      ) {
        throw new Error('orderForm owner response without orderFormId')
      }

      // A response for another orderForm cannot be trusted as the owner of this one.
      if (raw.orderFormId !== orderFormId) {
        return null
      }

      return toOrderFormOwner(orderFormId, raw)
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
