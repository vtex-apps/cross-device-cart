type Strategy = 'COMBINE' | 'REPLACE' | 'ADD'

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
