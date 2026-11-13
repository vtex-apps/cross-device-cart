import React, { FC, useEffect, useRef, useState } from 'react'
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

/**
 * The shopper identity is resolved server-side from the store-user token, and
 * the server only adopts a saved cart it has validated as OWNED by that shopper.
 * This component never sends a user id or user type.
 * It is remounted (keyed by profile id in SessionWrapper) when the session user changes.
 */
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

  // False once this instance is gone (unmounted or remounted by key when the
  // session user changes): an in-flight merge must then apply nothing.
  const isCurrent = useRef(true)

  useEffect(() => {
    isCurrent.current = true

    return () => {
      isCurrent.current = false
    }
  }, [])

  const hasItems = orderForm.items.length

  const [getSavedCart, { data, loading, error }] = useLazyQuery<
    CrossCartData,
    CrossCartVars
  >(GET_ID_BY_USER, {
    fetchPolicy: 'no-cache',
  })

  const [saveCurrentCart] = useMutation<Success, NewCrossCart>(SAVE_ID_BY_USER)

  const [replaceCart, { loading: mutationLoading }] = useMutation<
    NewOrderForm | null,
    ReplaceCartVariables
  >(MUTATE_CART)

  useEffect(() => {
    getSavedCart({
      variables: {
        nullOnEmpty: !isAutomatic,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refused or failed merge: silent in automatic mode, toast only when the
  // shopper explicitly accepted the challenge (manual mode). The server logs it.
  const notifyFailure = () => {
    if (isAutomatic) return

    showToast({
      message: intl.formatMessage({ id: 'store/crossCart.toast.error' }),
    })
  }

  const handleDeclineMerge = async () => {
    challengeActive && setChallenge(false)

    await saveCurrentCart({
      variables: {
        orderFormId: hasItems ? orderForm.id : null,
      },
    })
  }

  const handleMerge = async () => {
    const savedId = data?.id

    if (!savedId || hasMerged) return

    setMergeStatus(true)

    let newOrderForm: NewOrderForm | null | undefined

    try {
      const mutationResult = await replaceCart({
        variables: {
          currentCart: orderForm.id,
          savedCart: savedId,
          strategy,
        },
      })

      newOrderForm = mutationResult?.data?.newOrderForm
    } catch (e) {
      console.error(e)
    }

    if (!isCurrent.current) return

    challengeActive && setChallenge(false)

    if (!newOrderForm) {
      notifyFailure()

      return
    }

    // The server adopted the saved cart only after validating it as OWNED.
    // Same-origin Checkout round-trip so Checkout sets its own cookie
    // (defense in depth if the GraphQL Set-Cookie does not reach the browser).
    // Uses the id from the server response, never the client-side value.
    const adopted = newOrderForm.id === savedId

    if (adopted) {
      try {
        // Checked right before the POST: it must never go out with another
        // session's cookies.
        await axios.post(
          insertRootPath(
            rootPath,
            `/api/checkout/pub/orderForm/${newOrderForm.id}`
          ),
          {}
        )
      } catch (e) {
        if (isCurrent.current) notifyFailure()

        return
      }

      if (!isCurrent.current) return
    }

    setOrderForm(newOrderForm)

    // Success only when the saved cart was adopted or added items to the
    // current cart; not when the server just returned the current cart as is.
    const addedItems =
      (newOrderForm.items?.length ?? 0) > (orderForm.items?.length ?? 0)

    if (adopted || addedItems) {
      showToast({
        message: intl.formatMessage({ id: 'store/crossCart.toast.success' }),
      })
    }

    getSavedCart({
      variables: {
        nullOnEmpty: !isAutomatic,
      },
    })
  }

  useEffect(() => {
    // Apollo 3.1.5 keeps the previous `data` when a refetch errors, so the
    // error must be checked explicitly: a failed lookup never triggers a save.
    if (
      loading ||
      error ||
      !data ||
      !initialFetchComplete ||
      orderForm?.id === 'default-order-form'
    )
      return

    // A failed query (transient server lookup failure) leaves `data`
    // undefined and returns above, so the stored reference is not overwritten.
    const crossCart = data?.id !== 'default-order-form' && data?.id

    if (!crossCart) {
      saveCurrentCart({
        variables: {
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
          orderFormId: null,
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data, error, hasItems, initialFetchComplete, orderForm.id])

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
