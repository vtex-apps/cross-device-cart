import React, { FC } from 'react'
import { SessionSuccess, useRenderSession } from 'vtex.session-client'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { ToastConsumer } from 'vtex.styleguide'

import { CrossDeviceCart } from './CrossDeviceCart'
import { REPLACE, SESSION_ITEM } from '../utils/constants'

interface Props {
  mergeStrategy: MergeStrategy
  isAutomatic: boolean
  advancedOptions: boolean
}

const SessionWrapper: FC<Props> = ({
  mergeStrategy = REPLACE,
  isAutomatic = true,
  advancedOptions = false,
}: Props) => {
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
    sessionStorage.setItem(SESSION_ITEM, 'false')

    return null
  }

  const userId = profile?.id.value

  return (
    <ToastConsumer>
      {({ showToast }: { showToast: (toast: ToastParam) => void }) => (
        <CrossDeviceCart
          isAutomatic={isAutomatic}
          mergeStrategy={mergeStrategy}
          userId={userId}
          toastHandler={showToast}
          advancedOptions={advancedOptions}
        />
      )}
    </ToastConsumer>
  )
}

export { SessionWrapper }
