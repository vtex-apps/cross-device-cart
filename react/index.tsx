import React, { FC, useEffect, useState } from 'react'
import { SessionSuccess, useRenderSession } from 'vtex.session-client'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { useMutation, useLazyQuery } from 'react-apollo'
import { usePixel } from 'vtex.pixel-manager/PixelContext'
import { ToastConsumer } from 'vtex.styleguide'
import { useIntl } from 'react-intl'

import GET_ID_BY_USER from './graphql/getSavedCart.gql'
import SAVE_ID_BY_USER from './graphql/saveCurrentCart.gql'
import MUTATE_CART from './graphql/mergeCarts.gql'
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

  const [getSavedCart, { data: crossCart, loading }] = useLazyQuery(
    GET_ID_BY_USER
  )

  const [saveCurrentCart] = useMutation(SAVE_ID_BY_USER)
  const [mergeCarts, { error, loading: mutationLoading }] = useMutation(
    MUTATE_CART
  )

  const currentItemsQty = orderForm.items.length

  const handleSaveCurrent = () => {
    currentItemsQty &&
      saveCurrentCart({
        variables: {
          userId,
          orderFormId: orderForm.id,
        },
      })

    crossCartDetected && setChallenge(false)
  }

  useEffect(() => {
    getSavedCart({
      variables: {
        userId,
      },
    })
  }, [getSavedCart, userId])

  useEffect(() => {
    if (loading || !crossCart) return

    if (!crossCart.id) {
      handleSaveCurrent()

      return
    }

    if (crossCart.id !== orderForm.id) {
      setChallenge(true)

      return
    }

    if (!currentItemsQty) {
      saveCurrentCart({
        variables: {
          userId,
          orderFormId: null,
        },
      })
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crossCart, loading, currentItemsQty])

  const handleMerge = async (showToast: (toast: ToastParam) => void) => {
    const variables = {
      savedCart: crossCart?.id,
      currentCart: orderForm.id,
      strategy: 'add',
    }

    const mutationResult = await mergeCarts({
      variables,
    })

    // eslint-disable-next-line no-console
    console.log(mutationResult.data)

    if (error || !mutationResult.data) {
      error && console.error(error)

      showToast({
        message: intl.formatMessage({ id: 'store/crossCart.toast.error' }),
      })

      return
    }

    const newOrderForm = mutationResult.data.orderForm

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
