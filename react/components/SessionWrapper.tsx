import React, { FC, useState, useEffect } from 'react'
import { SessionSuccess, useRenderSession } from 'vtex.session-client'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { ToastConsumer } from 'vtex.styleguide'
import { useQuery } from 'react-apollo'

import { CrossCart } from './CrossCart'
import { patchSessionFlag } from '../utils/patchSessionFlag'
import getAppSettings from '../graphql/getAppSettings.gql'

const SessionWrapper: FC = () => {
  const { loading, session, error } = useRenderSession()
  const { loading: orderLoading } = useOrderForm()
  const [appSettings, setAppSettings] = useState({} as AppSettings)

  const { data } = useQuery(getAppSettings, { ssr: false })

  useEffect(() => {
    if (!data) {
      return
    }

    setAppSettings(data.appSettings)
  }, [data])

  if (error || loading || !session || orderLoading || !data) {
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
          isAutomatic={appSettings.isAutomatic}
        />
      )}
    </ToastConsumer>
  )
}

export { SessionWrapper }
