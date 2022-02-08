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
  savedCart: string
  currentCart: string
  strategy: MergeStrategy
  userId: string
}

interface CrossCartData {
  crossCartData: {
    orderFormId: string
    isMerged: boolean
  }
}

interface CrossCartVars {
  userId: string
}

interface NewCrossCart {
  userId: string
  orderFormId: string | null
  isMerged: boolean
}

type NewOrderForm = { [key: string]: any }

type Success = 'success'
