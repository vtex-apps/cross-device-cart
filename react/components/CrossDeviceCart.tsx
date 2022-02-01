import React, { FC, useEffect, useState } from 'react'
import { useLazyQuery, useMutation } from 'react-apollo'
import { useIntl } from 'react-intl'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { usePixel } from 'vtex.pixel-manager/PixelContext'

import GET_ID_BY_USER from '../graphql/getSavedCart.gql'
import SAVE_ID_BY_USER from '../graphql/saveCurrentCart.gql'
import MUTATE_CART from '../graphql/mergeCarts.gql'
import { adjustSkuItemForPixelEvent } from '../utils'
import ChallengeBlock from './ChallengeBlock'

interface Props {
  mergeStrategy: Strategy
  isAutomatic: boolean
  advancedOptions: boolean
  userId: string
  toastHandler: (toast: ToastParam) => void
}

/* eslint-disable react/prop-types */
const CrossDeviceCart: FC<Props> = ({
  mergeStrategy,
  isAutomatic,
  userId,
  toastHandler,
  advancedOptions,
}) => {
  const { orderForm, setOrderForm } = useOrderForm() as OrderFormContext
  const [crossCartDetected, setChallenge] = useState(false)
  const { push } = usePixel()
  const intl = useIntl()

  const [getSavedCart, { data, loading }] = useLazyQuery(GET_ID_BY_USER)
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

  const handleMerge = async (
    showToast: (toast: ToastParam) => void,
    strategy: Strategy
  ) => {
    const mutationResult = await mergeCarts({
      variables: {
        savedCart: data?.id,
        currentCart: orderForm.id,
        strategy,
      },
    })

    if (error || !mutationResult.data) {
      error && console.error(error)

      showToast({
        message: intl.formatMessage({ id: 'store/crossCart.toast.error' }),
      })

      return
    }

    const { newOrderForm } = mutationResult.data

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

    const crossCart = data?.id

    if (!crossCart) {
      handleSaveCurrent()

      return
    }

    if (crossCart !== orderForm.id) {
      !isAutomatic && setChallenge(true)
      isAutomatic && handleMerge(toastHandler, mergeStrategy)

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
  }, [data, loading, currentItemsQty])

  if (!crossCartDetected || isAutomatic) {
    return null
  }

  return (
    <ChallengeBlock
      mergeStrategy={mergeStrategy}
      handleAccept={handleMerge}
      handleDecline={handleSaveCurrent}
      mutationLoading={mutationLoading}
      advancedOptions={advancedOptions}
      // These need to be the XCART items
      /* items={orderForm.items} */
      toastHandler={toastHandler}
    />
  )
}

export { CrossDeviceCart }
