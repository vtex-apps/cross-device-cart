import React, { FC, useEffect, useState } from 'react'
import { useLazyQuery, useMutation } from 'react-apollo'
import { useIntl } from 'react-intl'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import axios from 'axios'

import GET_ID_BY_USER from '../graphql/getSavedCart.gql'
import SAVE_ID_BY_USER from '../graphql/saveCurrentCart.gql'
import MUTATE_CART from '../graphql/replaceCart.gql'
import ChallengeBlock from './ChallengeBlock'

interface Props {
  userId: string
  isAutomatic: boolean
  showToast: (toast: ToastParam) => void
  strategy: Strategy
}

const CrossCart: FC<Props> = ({ userId, isAutomatic, strategy, showToast }) => {
  const { orderForm, setOrderForm } = useOrderForm() as OrderFormContext
  const [hasMerged, setMergeStatus] = useState(false)
  const [challengeActive, setChallenge] = useState(false)
  const intl = useIntl()

  const hasItems = orderForm.items.length

  const [getSavedCart, { data, loading }] = useLazyQuery<
    CrossCartData,
    CrossCartVars
  >(GET_ID_BY_USER, {
    fetchPolicy: 'no-cache',
  })

  const [saveCurrentCart] = useMutation<Success, NewCrossCart>(SAVE_ID_BY_USER)

  const [replaceCart, { error, loading: mutationLoading }] = useMutation<
    NewOrderForm | null,
    ReplaceCartVariables
  >(MUTATE_CART)

  useEffect(() => {
    getSavedCart({
      variables: {
        userId,
        nullOnEmpty: !isAutomatic,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeclineMerge = async () => {
    challengeActive && setChallenge(false)

    await saveCurrentCart({
      variables: {
        userId,
        orderFormId: hasItems ? orderForm.id : null,
      },
    })
  }

  const handleMerge = async () => {
    if (!data?.id || hasMerged) return

    setMergeStatus(true)

    const mutationResult = await replaceCart({
      variables: {
        currentCart: orderForm.id,
        savedCart: data.id,
        strategy,
      },
    })

    if (error || !mutationResult.data || !mutationResult.data.newOrderForm) {
      error && console.error(error)

      showToast({
        message: intl.formatMessage({ id: 'store/crossCart.toast.error' }),
      })

      return
    }

    try {
      await axios.post(
        `/api/checkout/pub/orderForm/${data.id}`,
        {},
        {
          headers: {
            'set-cookie': `checkout.vtex.com=__ofid=${data.id}`,
          },
        }
      )
    } catch (e) {
      challengeActive && setChallenge(false)

      showToast({
        message: intl.formatMessage({ id: 'store/crossCart.toast.error' }),
      })

      return
    }

    const { newOrderForm } = mutationResult.data

    setOrderForm(newOrderForm)

    challengeActive && setChallenge(false)

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
    if (loading || !data) return

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
      isAutomatic && handleMerge()

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
  }, [loading, data, hasItems])

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
