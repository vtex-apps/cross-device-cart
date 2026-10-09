type Scalars = import('vtex.checkout-graphql').Scalars
type AssemblyOptionType = import('vtex.checkout-graphql').AssemblyOptionType

interface ReplaceCartVariables {
  savedCart: Scalars['ID']
  currentCart: Scalars['ID']
  strategy: Strategy
  /** @deprecated ignored; call-center detection is server-side */
  userType?: string | null
}

interface PartialOrderFormItems {
  orderForm: { items: PartialItem[] }
}

interface PartialOrderForm {
  value: number
  totalizers: {
    id: string
    name: string
    value: number
  }
  items: PartialItem[]
  marketingData: any
}

interface PartialItem {
  id: number
  index?: number
  quantity: number
  seller: string
  uniqueId: string
  options?: AssemblyOptionInput[]
}

interface Order {
  origin: 'Marketplace' | 'Fulfillment'
  paymentData: any
  orderId: string
  affiliateId: string
  totals: any
  coupon: string
  items: any
  marketingData?: any
  storePreferencesData?: any
  clientProfileData: ClientProfileData
  orderFormId: string
}

interface ClientProfileData {
  userProfileId: string
}

interface CurrentCartProps {
  userId: string
  crossCartData: CrossCartData
}

interface CrossCartData {
  orderFormId: string | null
}

interface SaveCurrentCartData extends CrossCartData {
  userId: string
  salesChannel: string
}

type Strategy = 'ADD' | 'COMBINE' | 'REPLACE'

interface AppSettings {
  settings: {
    isAutomatic: boolean
    strategy: Strategy
  }
}

interface ShopperIdentity {
  userId: string
  /** lowercased VTEX ID login email; in memory only, never logged (FR-D1) */
  email?: string
}

interface OrderFormOwner {
  orderFormId: string
  userProfileId: string | null
  userType: string | null
  loggedIn: boolean
  hasClientProfile: boolean
  /** clientProfileData.email, in memory only for FR-D1 (never logged) */
  email?: string | null
  salesChannel: string | null
}

type OwnershipVerdict =
  | 'OWNED'
  | 'ANONYMOUS'
  | 'FOREIGN'
  | 'UNVERIFIED_PROFILE'
  | 'CALL_CENTER'
  | 'NOT_FOUND'

type VerdictOrFailure = OwnershipVerdict | 'LOOKUP_FAILED'

type RejectionReason =
  | VerdictOrFailure
  | 'NOT_REFERENCED'
  | 'INVALID_ID'
  | 'COOKIE_MISMATCH'

interface GetSavedCartArgs {
  /** @deprecated ignored; identity is derived from the VTEX ID token */
  userId?: string | null
  /** @deprecated ignored */
  userType?: string | null
  /** @deprecated ignored; derived from the segment */
  salesChannel?: string | null
  nullOnEmpty?: boolean | null
}

interface SaveCurrentCartArgs {
  /** @deprecated ignored */
  userId?: string | null
  /** @deprecated ignored */
  userType?: string | null
  /** @deprecated ignored */
  salesChannel?: string | null
  orderFormId?: string | null
}

type SaveCurrentCartResult =
  | 'success'
  | 'unauthenticated'
  | 'rejected'
  | 'Not saved is call center operator'

type OwnershipReason =
  | 'email_mismatch'
  | 'email_masked'
  | 'email_unverified'
  | 'cookie_mismatch'
  | 'cookie_conflict'

interface OwnershipResult {
  verdict: VerdictOrFailure
  reason?: OwnershipReason
}
