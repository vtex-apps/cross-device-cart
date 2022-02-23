import React, { FC } from 'react'
import { SessionSuccess, useRenderSession } from 'vtex.session-client'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { ToastConsumer } from 'vtex.styleguide'

import { CrossCart } from './CrossCart'
import { patchSessionFlag } from '../utils/patchSessionFlag'

interface Props {
  isAutomatic: boolean
}

const SessionWrapper: FC<Props> = ({ isAutomatic = true }: Props) => {
  const { loading, session, error } = useRenderSession()
  const { loading: orderLoading } = useOrderForm()

  if (error || loading || !session || orderLoading) {
    return null
  }

  const {
    namespaces: { profile },
  } = session as SessionSuccess

  const isAuthenticated = profile?.isAuthenticated.value === 'true'

  if (!isAuthenticated) {
    patchSessionFlag('false')

    return null
  }

  const userId = profile?.id.value

  return (
    <ToastConsumer>
      {({ showToast }: { showToast: (toast: ToastParam) => void }) => (
        <CrossCart
          toastHandler={showToast}
          userId={userId}
          isAutomatic={isAutomatic}
        />
      )}
    </ToastConsumer>
  )
}

export { SessionWrapper }
