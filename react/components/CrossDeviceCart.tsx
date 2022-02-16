import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useLazyQuery, useMutation } from 'react-apollo'
import { useIntl } from 'react-intl'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { usePixel } from 'vtex.pixel-manager/PixelContext'

import GET_ID_BY_USER from '../graphql/getSavedCart.gql'
import SAVE_ID_BY_USER from '../graphql/saveCurrentCart.gql'
import MUTATE_CART from '../graphql/mergeCarts.gql'
import { adjustSkuItemForPixelEvent } from '../utils'
import ChallengeBlock from './ChallengeBlock'
import { REPLACE } from '../utils/constants'
import { getSession, patchSession } from '../utils/patchSession'

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

  const hasItems = Boolean(orderForm.items.length)
  const hasAlreadyCombined = useRef('false')

  const [getSavedCart, { data, loading }] = useLazyQuery<
    CrossCartData,
    CrossCartVars
  >(GET_ID_BY_USER, {
    fetchPolicy: 'network-only',
  })

  const [saveCurrentCart] = useMutation<Success, NewCrossCart>(SAVE_ID_BY_USER)

  const [mergeCarts, { error, loading: mutationLoading }] = useMutation<
    NewOrderForm,
    MergeCartsVariables
  >(MUTATE_CART)

  const handleSaveCurrent = useCallback(async () => {
    challengeActive && setChallenge(false)

    if (hasItems || isAutomatic) {
      await saveCurrentCart({
        variables: {
          userId,
          orderFormId: orderForm.id,
        },
      })

      getSavedCart({
        variables: {
          userId,
          isAutomatic,
        },
      })
    }
  }, [
    challengeActive,
    hasItems,
    isAutomatic,
    saveCurrentCart,
    userId,
    orderForm.id,
    getSavedCart,
  ])

  const handleMerge = useCallback(
    async (showToast: (toast: ToastParam) => void, strategy: MergeStrategy) => {
      if (!data?.id || didMerge) return

      setMergeStatus(true)

      if (isAutomatic && hasAlreadyCombined.current === 'true') {
        strategy = REPLACE
      }

      const mutationResult = await mergeCarts({
        variables: {
          savedCart: data.id,
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

      patchSession('true')

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
        },
      })

      getSavedCart({
        variables: {
          userId,
          isAutomatic,
        },
      })
    },

    [
      data?.id,
      didMerge,
      error,
      getSavedCart,
      hasAlreadyCombined,
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
    const getUpdatedSession = async () => {
      const res = await getSession()

      hasAlreadyCombined.current = res
    }

    getUpdatedSession()
  }, [])

  useEffect(() => {
    getSavedCart({
      variables: {
        userId,
        isAutomatic,
      },
    })
  }, [getSavedCart, userId, isAutomatic])

  useEffect(() => {
    if (loading || !data) return

    const crossCart = data?.id

    if (!crossCart) {
      handleSaveCurrent()

      return
    }

    const equalCarts = crossCart === orderForm.id

    if (!equalCarts) {
      !isAutomatic && setChallenge(true)
      isAutomatic && handleMerge(toastHandler, 'COMBINE')

      return
    }

    if (!hasItems && !isAutomatic) {
      saveCurrentCart({
        variables: {
          userId,
          orderFormId: null,
        },
      })
    }
  }, [
    hasItems,
    data,
    handleMerge,
    handleSaveCurrent,
    loading,
    saveCurrentCart,
    orderForm.id,
    isAutomatic,
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
