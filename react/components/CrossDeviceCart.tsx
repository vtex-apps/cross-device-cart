import React, { FC, useCallback, useEffect, useState } from 'react'
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
  mergeStrategy: MergeStrategy
  isAutomatic: boolean
  advancedOptions: boolean
  userId: string
  toastHandler: (toast: ToastParam) => void
}

const CrossDeviceCart: FC<Props> = ({
  mergeStrategy,
  isAutomatic,
  userId,
  toastHandler,
  advancedOptions,
}) => {
  const { orderForm, setOrderForm } = useOrderForm() as OrderFormContext
  const [challengeActive, setChallenge] = useState(false)
  const [didMerge, setMergeStatus] = useState(false)
  const { push } = usePixel()
  const intl = useIntl()

  const [getSavedCart, { data, loading }] = useLazyQuery<
    CrossCartData | null,
    CrossCartVars
  >(GET_ID_BY_USER, {
    fetchPolicy: 'network-only',
  })

  const [saveCurrentCart] = useMutation<Success, NewCrossCart>(SAVE_ID_BY_USER)
  const [mergeCarts, { error, loading: mutationLoading }] = useMutation<
    NewOrderForm,
    MergeCartsVariables
  >(MUTATE_CART)

  const hasItems = Boolean(orderForm.items.length)

  const handleSaveCurrent = useCallback(async () => {
    challengeActive && setChallenge(false)

    if (hasItems) {
      await saveCurrentCart({
        variables: {
          userId,
          orderFormId: orderForm.id,
          isMerged: false,
        },
      })

      getSavedCart({
        variables: {
          userId,
        },
      })
    }
  }, [
    challengeActive,
    hasItems,
    getSavedCart,
    orderForm.id,
    saveCurrentCart,
    userId,
  ])

  const handleMerge = useCallback(
    async (showToast: (toast: ToastParam) => void, strategy: MergeStrategy) => {
      if (!data?.crossCartData || didMerge) return

      if (isAutomatic) {
        strategy = data.crossCartData.isMerged ? 'REPLACE' : 'COMBINE'
      }

      setMergeStatus(true)

      const mutationResult = await mergeCarts({
        variables: {
          savedCart: data.crossCartData.orderFormId,
          currentCart: orderForm.id,
          strategy,
          userId,
        },
      })

      if (error || !mutationResult.data || !mutationResult.data.newOrderForm) {
        error && console.error(error)

        !isAutomatic &&
          showToast({
            message: intl.formatMessage({ id: 'store/crossCart.toast.error' }),
          })

        return
      }

      const { newOrderForm } = mutationResult.data

      setOrderForm(newOrderForm)

      !isAutomatic &&
        showToast({
          message: intl.formatMessage({ id: 'store/crossCart.toast.success' }),
        })

      const skuItems = newOrderForm.items
      const pixelEventItems = skuItems.map(adjustSkuItemForPixelEvent)

      push({
        event: 'addToCart',
        items: pixelEventItems,
      })

      await saveCurrentCart({
        variables: {
          userId,
          orderFormId: orderForm.id,
          isMerged: true,
        },
      })

      getSavedCart({
        variables: {
          userId,
        },
      })
    },

    [
      data?.crossCartData,
      didMerge,
      error,
      getSavedCart,
      intl,
      isAutomatic,
      mergeCarts,
      orderForm.id,
      push,
      saveCurrentCart,
      setOrderForm,
      userId,
    ]
  )

  useEffect(() => {
    getSavedCart({
      variables: {
        userId,
      },
    })
  }, [getSavedCart, userId])

  useEffect(() => {
    if (loading || !data) return

    const crossCart = data?.crossCartData?.orderFormId

    if (!crossCart) {
      handleSaveCurrent()

      return
    }

    const equalCarts = crossCart === orderForm.id

    if (!equalCarts) {
      !isAutomatic && setChallenge(true)
      isAutomatic &&
        handleMerge(
          toastHandler,
          data.crossCartData.isMerged ? 'REPLACE' : 'COMBINE'
        )

      return
    }

    if (!hasItems && equalCarts) {
      saveCurrentCart({
        variables: {
          userId,
          orderFormId: null,
          isMerged: false,
        },
      })
    }
  }, [
    hasItems,
    data,
    handleMerge,
    handleSaveCurrent,
    isAutomatic,
    loading,
    mergeStrategy,
    orderForm.id,
    saveCurrentCart,
    toastHandler,
    userId,
  ])

  if (!challengeActive || isAutomatic) {
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
