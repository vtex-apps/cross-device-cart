import React, { FC, useState, useEffect } from 'react'
import { SessionSuccess, useRenderSession } from 'vtex.session-client'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { ToastConsumer } from 'vtex.styleguide'
import { useQuery } from 'react-apollo'

import { CrossCart } from './CrossCart'
import getAppSettings from '../graphql/getAppSettings.gql'

const SessionWrapper: FC = () => {
  const { loading, session, error } = useRenderSession()
  const { loading: orderLoading } = useOrderForm()
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
    namespaces: { profile },
  } = session as SessionSuccess

  const isAuthenticated = profile?.isAuthenticated.value === 'true'

  if (!isAuthenticated) {
    return null
  }

  const { isAutomatic, strategy } = settings

  // The profile id is only used as a React key, so that a change of session
  // user remounts the block. Identity is never sent to the server.
  const sessionKey = profile?.id?.value ?? 'anonymous'

  return (
    <ToastConsumer>
      {({ showToast }: { showToast: (toast: ToastParam) => void }) => (
        <CrossCart
          key={sessionKey}
          showToast={showToast}
          isAutomatic={isAutomatic}
          strategy={strategy}
        />
      )}
    </ToastConsumer>
  )
}

export { SessionWrapper }
