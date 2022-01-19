type ChallengeType = 'actionBar' | 'floatingBar' | 'modal'

interface OrderFormContext {
  orderForm: any
  setOrderForm: (orderForm: any) => void
}

interface ToastParam {
  message: string
  duration?: number
  horizontalPosition?: 'left' | 'right'
}

interface CrossCartProps {
  challengeType: ChallengeType
}

interface ExtendedCrossCart extends CrossCartProps {
  userId: string
}
