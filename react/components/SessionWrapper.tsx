import React, { FC } from 'react'
import { SessionSuccess, useRenderSession } from 'vtex.session-client'
import { useOrderForm } from 'vtex.order-manager/OrderForm'

import { CrossDeviceCart } from './CrossDeviceCart'

interface Props {
  challengeType: ChallengeType
  strategies: Strategy[]
  isAutomatic: boolean
}

const SessionWrapper: FC<Props> = ({
  challengeType = 'actionBar',
  strategies = ['add', 'combine', 'replace'],
  isAutomatic = false,
}) => {
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
    console.error('User not authenticated')

    return null
  }

  const userId = profile?.id.value

  return (
    <CrossDeviceCart
      isAutomatic={isAutomatic}
      challengeType={challengeType}
      strategies={strategies}
      userId={userId}
    />
  )
}

export { SessionWrapper }
