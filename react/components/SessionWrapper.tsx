import React, { FC } from 'react'
import { SessionSuccess, useRenderSession } from 'vtex.session-client'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { ToastConsumer } from 'vtex.styleguide'

import { CrossDeviceCart } from './CrossDeviceCart'
import { COMBINE, REPLACE } from '../utils/constants'

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
  // const [updateSession, mutationResult] = useUpdateSessionInline()

  if (error || loading || !session || orderLoading) {
    return null
  }

  const {
    namespaces: { profile },
  } = session as SessionSuccess

  const isAuthenticated = profile?.isAuthenticated.value === 'true'

  if (!isAuthenticated) {
    sessionStorage.setItem('isCombined', 'false')
    // updateSession({
    //   variables: {
    //     fields: {
    //       isCombined: 'false',
    //     },
    //   },
    // }).then(() => console.log({ mutationResult }))

    return null
  }

  const userId = profile?.id.value
  // const isCombined = publicFields?.isCombined?.value === 'true'
  const isCombined = Boolean(sessionStorage.getItem('isCombined'))

  if (isAutomatic && isAuthenticated !== isCombined) {
    mergeStrategy = COMBINE
  }

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
