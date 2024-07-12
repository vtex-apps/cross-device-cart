interface OrderFormContext {
  orderForm: PartialOrderForm
  setOrderForm: (orderForm: any) => void
  initialFetchComplete: boolean
}

interface ToastParam {
  message: string
  duration?: number
  horizontalPosition?: 'left' | 'right'
}

interface PartialOrderForm {
  id: string
  items: any[]
}

interface ReplaceCartVariables {
  savedCart: string
  currentCart: string
  strategy: Strategy,
  userType?: string
}

interface CrossCartData {
  id: string
}

interface CrossCartVars {
  userId: string
  salesChannel: string
  nullOnEmpty?: boolean
  userType?: string
}

interface NewCrossCart {
  userId: string
  userType?: string
  salesChannel: string
  orderFormId: string | null
}

type NewOrderForm = { [key: string]: any }

type Success = 'success'

interface AppSettings {
  isAutomatic: boolean
  strategy: Strategy
}

type Strategy = 'ADD' | 'COMBINE' | 'REPLACE'

interface AppSettingsData {
  settings: AppSettings
}
