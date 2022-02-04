type MergeStrategy = 'COMBINE' | 'REPLACE' | 'ADD'

interface OrderFormContext {
  orderForm: PartialOrderForm
  setOrderForm: (orderForm: any) => void
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

interface MergeCartsVariables {
  savedCart: Scalars['ID']
  currentCart: Scalars['ID']
  strategy: MergeStrategy
  userId: string
}

interface CrossCartData {
  id: string
}

interface CrossCartVars {
  userId: string
}

interface NewCrossCart {
  userId: string
  orderFormId: string | null
}

type NewOrderForm = { [key: string]: any }

type Success = 'success'
