import { APP_NAME } from '../constants'
import { mergeItems } from '../utils'
import { httpStatus } from '../utils/httpStatus'
import {
  isValidOrderFormId,
  matchesCheckoutCookie,
  resolveSalesChannel,
  resolveShopper,
  savedCartKey,
} from '../utils/identity'
import {
  fetchOwnership,
  isAcceptable,
  logCurrentCartIgnored,
  logOwnershipRejection,
  logResidualRisk,
  logVbaseError,
} from '../utils/ownership'

const OPERATION = 'replaceCart'

/** 180 days, unchanged from v2.0.3 (spec Q10). */
export const CART_COOKIE_MAX_AGE_S = 15552000

const toCartInput = (items: PartialItem[], withIndex: boolean): PartialItem[] =>
  items.map((item, index) => {
    const input: PartialItem = { ...item, id: Number(item.id) }

    if (withIndex) {
      input.index = index
    } else {
      delete input.index
    }

    return input
  })

/** Makes the browser use the shopper's own saved orderForm (cross-device sync). */
function setAdoptionCookie(ctx: Context, savedCart: string) {
  const host = ctx.get('x-forwarded-host')

  ctx.response.set(
    'set-cookie',
    `checkout.vtex.com=__ofid=${savedCart}; Max-Age=${CART_COOKIE_MAX_AGE_S}; Domain=${host}; path=/; secure; samesite=lax; httponly`
  )
}

/** ANONYMOUS saved cart: add only its missing SKUs to the current cart (items only). */
async function addMissingToCurrent(
  ctx: Context,
  currentCart: string,
  savedItems: PartialItem[]
): Promise<PartialOrderForm> {
  const { checkoutIO } = ctx.clients
  const currentIds = new Set(
    (await checkoutIO.getItems(currentCart)).map(({ id }) => String(id))
  )

  const missing = savedItems.filter(({ id }) => !currentIds.has(String(id)))

  if (!missing.length) {
    return checkoutIO.getOrderForm(currentCart)
  }

  return checkoutIO.addToCart(currentCart, toCartInput(missing, false))
}

/**
 * Cross cart main feature. Adopts the caller's saved orderForm only when it is
 * the caller's stored reference and OWNED by the caller. See spec FR-C1..FR-C8.
 */
export const replaceCart = async (
  _: unknown,
  { savedCart, currentCart, strategy }: ReplaceCartVariables,
  ctx: Context
): Promise<PartialOrderForm | null> => {
  const {
    clients: { vbase, checkoutIO, checkoutRest, requestHub },
    vtex: { logger },
  } = ctx

  // Authentication control: no valid store-user token -> null before any
  // VBase, Checkout or cookie access. The `@auth(scope: PUBLIC)` directive in
  // the schema allows everyone and enforces nothing. Every failure (including
  // a VTEX ID outage) is a no-op: no write, no cookie.
  const auth = await resolveShopper(ctx, OPERATION)

  if (auth.authResult !== 'ok') {
    return null
  }

  const { shopper } = auth

  if (!isValidOrderFormId(savedCart) || !isValidOrderFormId(currentCart)) {
    logOwnershipRejection(ctx, OPERATION, 'INVALID_ID')

    return null
  }

  if (!matchesCheckoutCookie(ctx, currentCart, OPERATION)) {
    logOwnershipRejection(ctx, OPERATION, 'COOKIE_MISMATCH', 'cookie_mismatch')

    return null
  }

  const key = savedCartKey(shopper.userId, await resolveSalesChannel(ctx))
  let reference: string | null

  try {
    reference = await vbase.getJSON<string | null>(APP_NAME, key, true)
  } catch (error) {
    logVbaseError(ctx, OPERATION, error)

    return null
  }

  if (reference !== savedCart) {
    logOwnershipRejection(ctx, OPERATION, 'NOT_REFERENCED')

    return null
  }

  const savedResult = await fetchOwnership(ctx, savedCart, shopper, OPERATION)
  const currentResult =
    currentCart === savedCart
      ? savedResult
      : await fetchOwnership(ctx, currentCart, shopper, OPERATION)

  const savedVerdict = savedResult.verdict
  const currentVerdict = currentResult.verdict

  if (savedVerdict === 'LOOKUP_FAILED' || currentVerdict === 'LOOKUP_FAILED') {
    // Transient (already logged without ids): no write, no data, no cookie; keep the reference.
    return null
  }

  if (currentVerdict === 'CALL_CENTER') {
    logger.info({
      message: 'cross-device-cart.call_center_skipped',
      operation: OPERATION,
    })

    return null
  }

  if (!isAcceptable(savedVerdict)) {
    try {
      await vbase.saveJSON(APP_NAME, key, null)
    } catch (error) {
      logVbaseError(ctx, OPERATION, error)

      return null
    }

    logOwnershipRejection(ctx, OPERATION, savedVerdict, savedResult.reason)

    return null
  }

  const currentUsable = isAcceptable(currentVerdict)

  // A VBase failure inside the try block below is logged as vbase_error, not
  // checkout_error, and ends the operation without a cookie.
  let vbaseFailed = false
  const saveReference = async (value: string) => {
    try {
      await vbase.saveJSON(APP_NAME, key, value)
    } catch (error) {
      vbaseFailed = true
      logVbaseError(ctx, OPERATION, error)

      throw error
    }
  }

  const rejectCurrent = () =>
    logOwnershipRejection(ctx, OPERATION, currentVerdict, currentResult.reason)

  try {
    if (savedCart === currentCart) {
      return await checkoutIO.getOrderForm(currentCart)
    }

    const savedItems = await checkoutIO.getItems(savedCart)

    if (savedVerdict === 'ANONYMOUS') {
      if (!currentUsable) {
        rejectCurrent()

        return null
      }

      const newOrderForm = await addMissingToCurrent(
        ctx,
        currentCart,
        savedItems
      )

      await saveReference(currentCart)

      return newOrderForm
    }

    // savedVerdict === 'OWNED'
    if (!savedItems.length) {
      // FR-C10: never return a current cart that is not OWNED or ANONYMOUS.
      if (!currentUsable) {
        rejectCurrent()

        return null
      }

      await saveReference(currentCart)

      return await checkoutIO.getOrderForm(currentCart)
    }

    if (!currentUsable) {
      // Current cart is not the shopper's: its items are never read (FR-C4);
      // the saved cart is still adopted.
      logCurrentCartIgnored(
        ctx,
        OPERATION,
        currentVerdict,
        currentResult.reason
      )
    }

    await checkoutRest.removePaymentData(savedCart)

    let adopted: PartialOrderForm

    if (strategy === 'REPLACE' || !currentUsable) {
      adopted = await checkoutIO.getOrderForm(savedCart)
    } else {
      const items = mergeItems(
        await checkoutIO.getItems(currentCart),
        savedItems,
        strategy === 'COMBINE'
      )

      await requestHub.clearCart(savedCart)
      adopted = await checkoutIO.addToCart(savedCart, toCartInput(items, true))
    }

    if (
      savedResult.reason === 'email_masked' ||
      savedResult.reason === 'email_unverified'
    ) {
      // FR-D1: userProfileId alone decided; record the residual risk (no PII).
      logResidualRisk(ctx, OPERATION, savedResult.reason)
    }

    setAdoptionCookie(ctx, savedCart)

    return adopted
  } catch (error) {
    if (vbaseFailed) {
      return null
    }

    // The platform logs the query variables (orderForm ids) of a throwing resolver,
    // so Checkout failures are logged here without ids and mapped to null.
    logger.warn({
      message: 'cross-device-cart.checkout_error',
      operation: OPERATION,
      status: httpStatus(error) ?? null,
    })

    return null
  }
}
