type Scalars = import('vtex.checkout-graphql').Scalars
type AssemblyOptionType = import('vtex.checkout-graphql').AssemblyOptionType

interface MergeCartsVariables {
  savedCart: Scalars['ID']
  currentCart: Scalars['ID']
  strategy: MergeStrategy
}

type MergeStrategy = 'add' | 'combine' | 'replace'

interface PartialOrderFormItems {
  orderForm: { items: PartialItem[] }
}

interface PartialNewOrderForm extends PartialItem {
  value: number
  totalizers: {
    id: string
    name: string
    value: number
  }
}

interface PartialItem {
  items: {
    id: string
    quantity: number
    seller: string
    uniqueId: string
    options: {
      assemblyId: string
      id: string
      quantity: number
      seller: string
      inputValues: AssemblyOptionType[]
    } | null
  }
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
