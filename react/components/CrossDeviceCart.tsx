import React, { FC, useEffect, useState } from 'react'
import { useLazyQuery, useMutation } from 'react-apollo'
import { useIntl } from 'react-intl'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { usePixel } from 'vtex.pixel-manager/PixelContext'
import { ToastConsumer } from 'vtex.styleguide'

import GET_ID_BY_USER from '../graphql/getSavedCart.gql'
import SAVE_ID_BY_USER from '../graphql/saveCurrentCart.gql'
import MUTATE_CART from '../graphql/mergeCarts.gql'
import { adjustSkuItemForPixelEvent } from '../utils'
import ChallengeBlock from './ChallengeBlock'

interface Props {
  challengeType: ChallengeType
  strategies: Strategy[]
  isAutomatic: boolean
  userId: string
}

/* eslint-disable react/prop-types */
const CrossDeviceCart: FC<Props> = ({
  challengeType,
  strategies,
  isAutomatic,
  userId,
}) => {
  const { orderForm, setOrderForm } = useOrderForm() as OrderFormContext
  const [crossCartDetected, setChallenge] = useState(false)
  const { push } = usePixel()
  const intl = useIntl()

  const [getSavedCart, { data, loading }] = useLazyQuery(GET_ID_BY_USER)
  const [saveCurrentCart] = useMutation(SAVE_ID_BY_USER)
  const [mergeCart, { error, loading: mutationLoading }] = useMutation(
    MUTATE_CART
  )

  const currentItemsQty = orderForm.items.length

  const handleSaveCurrent = () => {
    currentItemsQty &&
      saveCurrentCart({
        variables: {
          userId,
          orderformId: orderForm.id,
        },
      })

    crossCartDetected && setChallenge(false)
  }

  const handleMerge = async (showToast: (toast: ToastParam) => void) => {
    const mutationResult = await mergeCart({
      variables: { savedCart: data?.getSavedCart, currentCart: orderForm.id },
    })

    if (error || !mutationResult.data) {
      error && console.error(error)

      showToast({
        message: intl.formatMessage({ id: 'store/crossCart.toast.error' }),
      })

      return
    }

    const newOrderForm = mutationResult.data.mergeCarts

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

  useEffect(() => {
    getSavedCart({
      variables: {
        userId,
      },
    })
  }, [getSavedCart, userId])

  useEffect(() => {
    if (loading || !data) return

    const XCart = data?.getSavedCart

    if (!XCart) {
      handleSaveCurrent()

      return
    }

    if (XCart !== orderForm.id) {
      setChallenge(true)

      return
    }

    if (!currentItemsQty) {
      saveCurrentCart({
        variables: {
          userId,
          orderformId: null,
        },
      })
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading, currentItemsQty])

  if (!crossCartDetected) {
    return null
  }

  return (
    <ToastConsumer>
      {({ showToast }: { showToast: (toast: ToastParam) => void }) => (
        <ChallengeBlock
          challengeType={challengeType}
          strategies={strategies}
          isAutomatic={isAutomatic}
          handleAccept={handleMerge}
          handleDecline={handleSaveCurrent}
          mutationLoading={mutationLoading}
          toastHandler={showToast}
          items={orderForm.items}
        />
      )}
    </ToastConsumer>
  )
}

export { CrossDeviceCart }
