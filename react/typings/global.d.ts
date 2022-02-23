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

interface ReplaceCartVariables {
  savedCart: string
  currentCart: string
  hasToCombine: boolean
}

interface CrossCartData {
  id: string
}

interface CrossCartVars {
  userId: string
  nullOnEmpty?: boolean
}

interface NewCrossCart {
  userId: string
  orderFormId: string | null
}

type NewOrderForm = { [key: string]: any }

type Success = 'success'
