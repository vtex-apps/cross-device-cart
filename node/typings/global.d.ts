type Scalars = import('vtex.checkout-graphql').Scalars
type AssemblyOptionType = import('vtex.checkout-graphql').AssemblyOptionType

interface ReplaceCartVariables {
  savedCart: Scalars['ID']
  currentCart: Scalars['ID']
  strategy: Strategy
  userType?: string
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
}

type Strategy = 'ADD' | 'COMBINE' | 'REPLACE'

interface AppSettings {
  settings: {
    isAutomatic: boolean
    strategy: Strategy
  }
}

interface OrderFormOwner {
  orderFormId: string
  userProfileId: string | null
  userType: string | null
  loggedIn: boolean
  /** presence of clientProfileData.email */
  hasClientProfile: boolean
  /** clientProfileData.email as returned (may be masked with `*`). In memory only, never logged. */
  email: string | null
}

type OwnershipVerdict =
  | 'OWNED'
  | 'ANONYMOUS'
  | 'FOREIGN'
  | 'UNVERIFIED_PROFILE'
  | 'CALL_CENTER'
  | 'NOT_FOUND'

/** Verdict, or a transient owner-lookup failure (the reference is kept). */
type VerdictOrFailure = OwnershipVerdict | 'LOOKUP_FAILED'

/** `verdict` field of `ownership_rejected` log lines */
type RejectionReason =
  | VerdictOrFailure
  | 'SAVED_CART_MISMATCH'
  | 'COOKIE_MISMATCH'

/** optional `reason` field (FR-D1, FR-D2) */
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

interface ShopperIdentity {
  userId: string
  /** VTEX ID `user` (login email). Used only for the FR-D1 comparison, never logged. */
  email: string | null
}

type CrossCartOperation = 'getSavedCart' | 'saveCurrentCart' | 'replaceCart'
