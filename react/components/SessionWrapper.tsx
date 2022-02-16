import React, { FC } from 'react'
import { SessionSuccess, useRenderSession } from 'vtex.session-client'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { ToastConsumer } from 'vtex.styleguide'
import { useRuntime } from 'vtex.render-runtime'

import { CrossDeviceCart } from './CrossDeviceCart'
import { REPLACE } from '../utils/constants'
import { patchSession } from '../utils/patchSession'

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
  const { rootPath } = useRuntime()

  if (error || loading || !session || orderLoading) {
    return null
  }

  const {
    namespaces: { profile },
  } = session as SessionSuccess

  const isAuthenticated = profile?.isAuthenticated.value === 'true'

  if (!isAuthenticated) {
    patchSession('false', rootPath)

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
