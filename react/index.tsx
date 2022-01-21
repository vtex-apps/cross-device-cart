import React, { FC, useEffect, useState } from 'react'
import { SessionSuccess, useRenderSession } from 'vtex.session-client'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { useMutation, useLazyQuery } from 'react-apollo'
import { usePixel } from 'vtex.pixel-manager/PixelContext'
import { ToastConsumer } from 'vtex.styleguide'
import { useIntl } from 'react-intl'

import GET_ID_BY_USER from './graphql/getXCart.gql'
import SAVE_ID_BY_USER from './graphql/saveXCart.gql'
import MUTATE_CART from './graphql/addXCartItems.gql'
import ChallengeBlock from './components/ChallengeBlock'
import { adjustSkuItemForPixelEvent } from './utils'

/**
 * To accomplish this we store and read orderform Ids for comparison.
 * If we find that the user has a different orderform from another session
 * we challenge them to add their items to the current orderform.
 */
// eslint-disable-next-line react/prop-types
const CrossDeviceCart: FC<ExtendedCrossCart> = ({ challengeType, userId }) => {
  const { orderForm, setOrderForm } = useOrderForm() as OrderFormContext
  const [crossCartDetected, setChallenge] = useState(false)
  const { push } = usePixel()
  const intl = useIntl()

  const [getXCart, { data, loading }] = useLazyQuery(GET_ID_BY_USER)

  const [saveXCart] = useMutation(SAVE_ID_BY_USER)
  const [mergeCart, { error, loading: mutationLoading }] = useMutation(
    MUTATE_CART
  )

  const currentItemsQty = orderForm.items.length

  const handleSaveCurrent = () => {
    currentItemsQty &&
      saveXCart({
        variables: {
          userId,
          orderformId: orderForm.id,
        },
      })

    crossCartDetected && setChallenge(false)
  }

  useEffect(() => {
    getXCart({
      variables: {
        userId,
      },
    })
  }, [getXCart, userId])

  useEffect(() => {
    if (loading || !data) return

    const XCart = data?.getXCart

    if (!XCart) {
      handleSaveCurrent()

      return
    }

    if (XCart !== orderForm.id) {
      setChallenge(true)

      return
    }

    if (!currentItemsQty) {
      saveXCart({
        variables: {
          userId,
          orderformId: null,
        },
      })
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading, currentItemsQty])

  const handleMerge = async (showToast: (toast: ToastParam) => void) => {
    const mutationResult = await mergeCart({
      variables: { fromCart: data?.getXCart, toCart: orderForm.id },
    })

    if (error || !mutationResult.data) {
      error && console.error(error)

      showToast({
        message: intl.formatMessage({ id: 'store/crossCart.toast.error' }),
      })

      return
    }

    const newOrderForm = mutationResult.data.addXCartItems

    setOrderForm(newOrderForm)

    showToast({
      message: intl.formatMessage({ id: 'store/crossCart.toast.success' }),
    })

    const skuItems = newOrderForm.items
    const pixelEventItems = skuItems.map(adjustSkuItemForPixelEvent)

    push({
      event: 'addToCart',
      items: pixelEventItems,
    })

    handleSaveCurrent()
  }

  if (!crossCartDetected) return null

  return (
    <ToastConsumer>
      {({ showToast }: { showToast: (toast: ToastParam) => void }) => (
        <ChallengeBlock
          type={challengeType}
          handleAccept={handleMerge}
          handleDecline={handleSaveCurrent}
          mutationLoading={mutationLoading}
          toastHandler={showToast}
        />
      )}
    </ToastConsumer>
  )
}

const SessionWrapper: FC<CrossCartProps> = ({
  challengeType = 'actionBar',
}) => {
  const { loading, session, error } = useRenderSession()
  const { loading: orderLoading } = useOrderForm()

  if (error || loading || !session || orderLoading) return null

  try {
    const {
      namespaces: { profile },
    } = session as SessionSuccess

    const isAuthenticated = profile?.isAuthenticated.value === 'true'

    if (!isAuthenticated) throw 'User not authenticated'

    const userId = profile?.id.value

    return <CrossDeviceCart challengeType={challengeType} userId={userId} />
  } catch (err) {
    return null
  }
}

export default SessionWrapper
