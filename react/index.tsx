/* eslint-disable no-console */
import React, { FC, useEffect, useState } from 'react'
import { SessionSuccess, useRenderSession } from 'vtex.session-client'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
/* import type { OrderForm as OrderFormType } from 'vtex.checkout-graphql' */
import { useMutation, useLazyQuery } from 'react-apollo'

import GET_ID_BY_USER from './graphql/getXCart.gql'
import SAVE_ID_BY_USER from './graphql/saveXCart.gql'
import MUTATE_CART from './graphql/addXCartItems.gql'
import DebugBlock from './components/debug/DebugBlock'
import ChallengeBlock from './components/ChallengeBlock'

interface Props {
  challengeType: ChallengeType
  debug: boolean
}

interface OrderFormContext {
  loading: boolean
  orderForm: any
  setOrderForm: (orderForm: any) => void
}

const CrossDeviceCart: FC<Props> = ({
  debug = true,
  challengeType = 'actionBar',
}) => {
  const { loading: sessionLoading, session } = useRenderSession()
  const {
    loading: orderLoading,
    orderForm,
    setOrderForm,
  } = useOrderForm() as OrderFormContext

  const [loggedIn, setLogStatus] = useState(false)
  const [crossCartDetected, setChallenge] = useState(false)

  const [getCrossCart, { data: crossCart }] = useLazyQuery(GET_ID_BY_USER)
  const [saveXCart] = useMutation(SAVE_ID_BY_USER)

  const [
    mergeCart,
    { error: mutationError, loading: mutationLoading },
  ] = useMutation(MUTATE_CART)

  useEffect(() => {
    if (session && !sessionLoading) {
      setLogStatus(
        (session as SessionSuccess).namespaces?.profile?.isAuthenticated
          .value === 'true'
      )
    }
  }, [session, sessionLoading])

  useEffect(() => {
    if (loggedIn) {
      getCrossCart({
        variables: {
          userId: (session as SessionSuccess)?.namespaces?.profile?.id.value,
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn])

  useEffect(() => {
    console.log('%c crossCart ', 'background: #fff; color: #333', crossCart)
    console.log('%c orderForm ', 'background: #fff; color: #333', orderForm)

    const XorderformId = crossCart?.getXCart
    const userId = (session as SessionSuccess)?.namespaces?.profile?.id.value

    if (!XorderformId && userId) {
      saveXCart({
        variables: {
          userId,
          orderForm: orderForm.id,
        },
      })
    }

    if (XorderformId && XorderformId !== orderForm.id) {
      setChallenge(true)
    }

    // If equals... do we store a reference in session-storage to stop querying?

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crossCart])

  const handleAccept = async () => {
    // Mutate cart
    console.log('ACCEPTED')

    const mutationResult = await mergeCart({
      variables: { fromCart: crossCart?.getXCart, toCart: orderForm.id },
    })

    if (mutationError) {
      console.error(mutationError)

      /* toast? */
      return
    }

    if (mutationResult.data) {
      /* toast? */
      console.log(
        '%c mutationResult.data ',
        'background: red; color: white',
        mutationResult.data
      )
    }

    // Update OrderForm from the context
    mutationResult.data && setOrderForm(mutationResult.data.addXCartItems)

    // Send event to pixel-manager
    /* const pixelEventItems = skuItems.map(adjustSkuItemForPixelEvent)
    push({
      event: 'addToCart',
      items: pixelEventItems,
    }) */

    saveXCart({
      variables: {
        userId: (session as SessionSuccess)?.namespaces?.profile?.id.value,
        orderForm: orderForm.id,
      },
    })

    setChallenge(false)
  }

  const handleDecline = () => {
    // Mutate VBASE, delete old record and add new one
    console.log('DECLINED')
  }

  console.log(session)

  if (sessionLoading || orderLoading) {
    return null
  }

  return (
    <>
      {crossCartDetected && (
        <ChallengeBlock
          type={challengeType}
          handleAccept={handleAccept}
          handleDecline={handleDecline}
          mutationLoading={mutationLoading}
        />
      )}
      {debug && (
        <DebugBlock>
          <span>XCART DEBUG</span>
          <span>
            <b>User id</b>:{' '}
            {(session as SessionSuccess)?.namespaces?.profile?.id.value}
          </span>
          <span>
            <b>Authenticated</b>: {String(loggedIn)}
          </span>
          <span>
            <b>X Cart id</b>: {String(crossCart?.getXCart)}
          </span>
          <span>
            <b>Current id</b>: {orderForm.id}
          </span>
        </DebugBlock>
      )}
    </>
  )
}

export default CrossDeviceCart
