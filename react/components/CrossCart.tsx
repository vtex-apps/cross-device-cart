import React, { FC, useEffect, useState } from 'react'
import { useLazyQuery, useMutation } from 'react-apollo'
import { useIntl } from 'react-intl'
import { useRuntime } from 'vtex.render-runtime'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import axios from 'axios'

import GET_ID_BY_USER from '../graphql/getSavedCart.gql'
import SAVE_ID_BY_USER from '../graphql/saveCurrentCart.gql'
import MUTATE_CART from '../graphql/replaceCart.gql'
import ChallengeBlock from './ChallengeBlock'
import insertRootPath from '../utils/insertRootPath'

interface Props {
  isAutomatic: boolean
  showToast: (toast: ToastParam) => void
  strategy: Strategy
}

const CrossCart: FC<Props> = ({ isAutomatic, strategy, showToast }) => {
  const {
    orderForm,
    initialFetchComplete,
    setOrderForm,
  } = useOrderForm() as OrderFormContext

  const { rootPath = '' } = useRuntime()

  const [hasMerged, setMergeStatus] = useState(false)
  const [challengeActive, setChallenge] = useState(false)
  const intl = useIntl()

  const hasItems = orderForm.items.length
  const savedCartVariables: CrossCartVars = { nullOnEmpty: !isAutomatic }

  const [getSavedCart, { data, loading, error: queryError }] = useLazyQuery<
    CrossCartData,
    CrossCartVars
  >(GET_ID_BY_USER, {
    fetchPolicy: 'no-cache',
  })

  const [saveCurrentCart] = useMutation<Success, NewCrossCart>(SAVE_ID_BY_USER)

  const [replaceCart, { loading: mutationLoading }] = useMutation<
    ReplaceCartData,
    ReplaceCartVariables
  >(MUTATE_CART)

  useEffect(() => {
    getSavedCart({ variables: savedCartVariables })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Refusals are silent in automatic mode, and toast only when the shopper asked (FR-C9). */
  const notifyFailure = () => {
    challengeActive && setChallenge(false)

    !isAutomatic &&
      showToast({
        message: intl.formatMessage({ id: 'store/crossCart.toast.error' }),
      })
  }

  const handleDeclineMerge = async () => {
    challengeActive && setChallenge(false)

    await saveCurrentCart({
      variables: { orderFormId: hasItems ? orderForm.id : null },
    })
  }

  const handleMerge = async () => {
    if (!data?.id || hasMerged) return

    setMergeStatus(true)

    let newOrderForm: NewOrderForm | null | undefined

    try {
      const result = await replaceCart({
        variables: {
          currentCart: orderForm.id,
          savedCart: data.id,
          strategy,
        },
      })

      newOrderForm = result.data?.newOrderForm
    } catch (e) {
      console.error(e)
    }

    if (!newOrderForm) {
      notifyFailure()

      return
    }

    if (newOrderForm.id === data.id) {
      // The server adopted the shopper's own saved cart after verifying ownership.
      // Let Checkout set its own cookie with the shopper's credentials (FR-C8).
      try {
        await axios.post(
          insertRootPath(
            rootPath,
            `/api/checkout/pub/orderForm/${newOrderForm.id}`
          ),
          {}
        )
      } catch (e) {
        notifyFailure()

        return
      }
    }

    // Only report a recovery when something actually changed for the shopper:
    // the saved cart was adopted, or the current cart gained items.
    const changed =
      newOrderForm.id === data.id ||
      (newOrderForm.items?.length ?? 0) > orderForm.items.length

    setOrderForm(newOrderForm)

    challengeActive && setChallenge(false)

    changed &&
      showToast({
        message: intl.formatMessage({ id: 'store/crossCart.toast.success' }),
      })

    getSavedCart({ variables: savedCartVariables })
  }

  useEffect(() => {
    // Apollo may keep the previous data when a refetch fails; never act on it.
    if (
      queryError ||
      loading ||
      !data ||
      !initialFetchComplete ||
      orderForm?.id === 'default-order-form'
    )
      return

    if (window.location.href.includes('orderPlaced')) {
      saveCurrentCart({ variables: { orderFormId: null } })

      return
    }

    const crossCart = data?.id !== 'default-order-form' && data?.id

    if (!crossCart) {
      saveCurrentCart({ variables: { orderFormId: orderForm.id } })

      return
    }

    const equalCarts = crossCart === orderForm.id

    if (!equalCarts) {
      !isAutomatic && setChallenge(true)
      isAutomatic && handleMerge()

      return
    }

    if (!hasItems && !isAutomatic) {
      saveCurrentCart({ variables: { orderFormId: null } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data, queryError, hasItems, initialFetchComplete, orderForm.id])

  if (!challengeActive || isAutomatic) {
    return null
  }

  return (
    <ChallengeBlock
      handleAccept={handleMerge}
      handleDecline={handleDeclineMerge}
      mutationLoading={mutationLoading}
    />
  )
}

export { CrossCart }
