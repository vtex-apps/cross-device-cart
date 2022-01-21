type ChallengeType = 'actionBar' | 'floatingBar' | 'modal'

interface OrderFormContext {
  orderForm: PartialOrderForm
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

interface PartialOrderForm {
  id: string
  items: any[]
}
