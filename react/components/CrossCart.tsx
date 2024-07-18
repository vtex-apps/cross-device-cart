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
  userId: string
  salesChannel: string
  isAutomatic: boolean
  showToast: (toast: ToastParam) => void
  strategy: Strategy
  userType: string
}

const CrossCart: FC<Props> = ({ userId, userType, salesChannel, isAutomatic, strategy, showToast }) => {
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
        salesChannel,
        nullOnEmpty: !isAutomatic,
        userType
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeclineMerge = async () => {
    challengeActive && setChallenge(false)

    await saveCurrentCart({
      variables: {
        userId,
        salesChannel,
        orderFormId: hasItems ? orderForm.id : null,
        userType
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
        userType
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
      const orderFormURLWithRootPath = insertRootPath(
        rootPath,
        `/api/checkout/pub/orderForm/${data.id}`
      )

      await axios.post(
        orderFormURLWithRootPath,
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
        salesChannel,
        nullOnEmpty: !isAutomatic,
      },
    })
  }

  useEffect(() => {
    if (
      loading ||
      !data ||
      !initialFetchComplete ||
      orderForm?.id === 'default-order-form'
    )
      return

    if (
      window.location.href.includes('orderPlaced')
    ) {
      saveCurrentCart({
        variables: {
          userId,
          salesChannel,
          orderFormId: null,
          userType
        },
      })

      return
    }

    const crossCart = data?.id !== 'default-order-form' && data?.id

    if (!crossCart) {
      saveCurrentCart({
        variables: {
          userId,
          salesChannel,
          orderFormId: orderForm.id,
          userType
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
          salesChannel,
          orderFormId: null,
          userType
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data, hasItems, initialFetchComplete, orderForm.id])

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
