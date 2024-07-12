import React, { FC, useState, useEffect } from 'react'
import { SessionSuccess, useRenderSession } from 'vtex.session-client'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { ToastConsumer } from 'vtex.styleguide'
import { useQuery } from 'react-apollo'

import { CrossCart } from './CrossCart'
import getAppSettings from '../graphql/getAppSettings.gql'

const SessionWrapper: FC = () => {
  const { loading, session, error } = useRenderSession()
  const { loading: orderLoading, orderForm: {userType} } = useOrderForm()
  const [settings, setAppSettings] = useState({} as AppSettings)
  const { data } = useQuery<AppSettingsData>(getAppSettings, {
    ssr: false,
  })

  useEffect(() => {
    if (!data) {
      return
    }

    setAppSettings(data.settings)
  }, [data])

  if (error || loading || !session || orderLoading || !data) {
    return null
  }

  const {
    namespaces: { profile, store },
  } = session as SessionSuccess

  const { isAutomatic, strategy } = settings

  const isAuthenticated = profile?.isAuthenticated.value === 'true'
  const salesChannel = store?.channel.value


  if (!isAuthenticated) {
    return null
  }

  const userId = profile?.id.value

  return (
    <ToastConsumer>
      {({ showToast }: { showToast: (toast: ToastParam) => void }) => (
        <CrossCart
          salesChannel = {salesChannel || "1"}
          showToast={showToast}
          userId={userId}
          isAutomatic={isAutomatic}
          userType={userType}
          strategy={strategy}
        />
      )}
    </ToastConsumer>
  )
}

export { SessionWrapper }
