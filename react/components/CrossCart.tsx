import React, { FC, useEffect, useState } from 'react'
import { useLazyQuery, useMutation } from 'react-apollo'
import { useIntl } from 'react-intl'
import { useOrderForm } from 'vtex.order-manager/OrderForm'

import GET_ID_BY_USER from '../graphql/getSavedCart.gql'
import SAVE_ID_BY_USER from '../graphql/saveCurrentCart.gql'
import MUTATE_CART from '../graphql/replaceCart.gql'
import ChallengeBlock from './ChallengeBlock'
import { getSessionFlag, patchSessionFlag } from '../utils/patchSessionFlag'

interface Props {
  userId: string
  isAutomatic: boolean
  toastHandler: (toast: ToastParam) => void
}

/**
 * Fetches if the logged in user has an OrderForm registered; if so,
 * it will try to request a new Cookie with the saved OrderForm, and
 * if the session flag is false, it will try to combine the leftover items
 */
const CrossCart: FC<Props> = ({ userId, isAutomatic, toastHandler }) => {
  const { orderForm, setOrderForm } = useOrderForm() as OrderFormContext
  const [hasMerged, setMergeStatus] = useState(false)
  const [hasAlreadyCombined, setCombinedFlag] = useState<string | null>(null)
  const [challengeActive, setChallenge] = useState(false)
  const intl = useIntl()

  const hasItems = orderForm.items.length

  const [getSavedCart, { data, loading }] = useLazyQuery<
    CrossCartData,
    CrossCartVars
  >(GET_ID_BY_USER, {
    fetchPolicy: 'network-only',
  })

  const [saveCurrentCart] = useMutation<Success, NewCrossCart>(SAVE_ID_BY_USER)

  const [replaceCart, { error, loading: mutationLoading }] = useMutation<
    NewOrderForm,
    ReplaceCartVariables
  >(MUTATE_CART)

  const handleSaveCurrent = async () => {
    challengeActive && setChallenge(false)

    if (hasItems) {
      await saveCurrentCart({
        variables: {
          userId,
          orderFormId: orderForm.id,
        },
      })
    }
  }

  const handleMerge = async (showToast: (toast: ToastParam) => void) => {
    if (!data?.id || hasMerged) return

    setMergeStatus(true)

    let hasToCombine = false

    if (hasAlreadyCombined === 'false') {
      hasToCombine = true
      patchSessionFlag('true')
    }

    const mutationResult = await replaceCart({
      variables: {
        currentCart: orderForm.id,
        savedCart: data.id,
        hasToCombine,
      },
    })

    if (error || !mutationResult.data || !mutationResult.data.newOrderForm) {
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

    getSavedCart({
      variables: {
        userId,
        nullOnEmpty: !isAutomatic,
      },
    })
  }

  useEffect(() => {
    getSavedCart({
      variables: {
        userId,
        nullOnEmpty: !isAutomatic,
      },
    })

    const getIsCombined = async () => {
      const isCombined = await getSessionFlag()

      setCombinedFlag(isCombined ?? 'false')
    }

    getIsCombined()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (loading || !data || hasAlreadyCombined === null) return

    const crossCart = data?.id

    if (!crossCart) {
      saveCurrentCart({
        variables: {
          userId,
          orderFormId: orderForm.id,
        },
      })

      return
    }

    const equalCarts = crossCart === orderForm.id

    if (!equalCarts) {
      !isAutomatic && setChallenge(true)
      isAutomatic && handleMerge(toastHandler)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data, hasItems, hasAlreadyCombined])

  if (!challengeActive || isAutomatic) {
    return null
  }

  return (
    <ChallengeBlock
      handleAccept={handleMerge}
      handleDecline={handleSaveCurrent}
      mutationLoading={mutationLoading}
      toastHandler={toastHandler}
    />
  )
}

export { CrossCart }
