type ChallengeType = 'actionBar' | 'notification' | 'floatingBar' | 'modal'

interface OrderFormContext {
  orderForm: any
  setOrderForm: (orderForm: any) => void
}

interface ToastParam {
  message: string
  duration?: number
  horizontalPosition?: 'left' | 'right'
}
