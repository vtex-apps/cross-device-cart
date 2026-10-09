import { APP_NAME } from '../constants'
import { mergeItems } from '../utils'
import {
  isValidOrderFormId,
  matchesCheckoutCookie,
  resolveShopper,
} from '../utils/identity'
import {
  fetchOwnership,
  isAcceptable,
  logOwnershipRejection,
  logResidualRisk,
  logUnauthenticated,
} from '../utils/ownership'

/** Same cookie lifetime the app has always set (180 days). */
export const CHECKOUT_COOKIE_MAX_AGE = 15552000

function adoptCart(ctx: Context, orderFormId: string) {
  const host = ctx.get('x-forwarded-host')

  ctx.response.set(
    'set-cookie',
    `checkout.vtex.com=__ofid=${orderFormId}; Max-Age=${CHECKOUT_COOKIE_MAX_AGE}; Domain=${host}; path=/; secure; samesite=lax; httponly`
  )
}

function toItemInput(items: PartialItem[], offset = 0) {
  return items.map((item, index) => ({
    ...item,
    id: Number(item.id),
    index: offset + index,
  }))
}

/**
 * Saved SKUs that are not in the current cart (ADD semantics).
 * Used for the ANONYMOUS saved-cart fallback whatever the configured strategy.
 */
export function missingItems(
  currentItems: PartialItem[],
  savedItems: PartialItem[]
): PartialItem[] {
  const currentIds = new Set(currentItems.map(({ id }) => String(id)))

  return savedItems.filter(({ id }) => !currentIds.has(String(id)))
}

/**
 * Cross cart main feature.
 * OWNED saved cart: today's V1 behaviour (adopt the saved cart; ADD/COMBINE
 * first write the merged items into it). The current cart's items are only
 * read when the current cart is OWNED or ANONYMOUS.
 * An empty saved cart is never adopted (current cart returned, no cookie).
 * ANONYMOUS saved cart: never adopted; its missing SKUs are added to the
 * current cart (ADD semantics whatever the strategy) and the reference moves
 * to the current cart.
 * Anything else: rejected, reference cleared, no cookie.
 * `userType` is accepted for compatibility and ignored.
 */
export const replaceCart = async (
  _: unknown,
  { savedCart, currentCart, strategy }: ReplaceCartVariables,
  ctx: Context
): Promise<PartialOrderForm | null> => {
  const shopper = await resolveShopper(ctx)

  if (!shopper) {
    logUnauthenticated(ctx, 'replaceCart')

    return null
  }

  if (!isValidOrderFormId(savedCart) || !isValidOrderFormId(currentCart)) {
    logOwnershipRejection(ctx, 'replaceCart', 'NOT_FOUND')

    return null
  }

  // FR-D2: currentCart must be the cart in this browser's checkout cookie.
  if (!matchesCheckoutCookie(ctx, currentCart, 'replaceCart')) {
    logOwnershipRejection(
      ctx,
      'replaceCart',
      'COOKIE_MISMATCH',
      'cookie_mismatch'
    )

    return null
  }

  const {
    clients: { vbase, checkoutIO, requestHub },
  } = ctx

  const stored: string | null = await vbase.getJSON(
    APP_NAME,
    shopper.userId,
    true
  )

  if (stored !== savedCart) {
    logOwnershipRejection(ctx, 'replaceCart', 'SAVED_CART_MISMATCH')

    return null
  }

  const [saved, current] = await Promise.all([
    fetchOwnership(ctx, savedCart, shopper, 'replaceCart'),
    fetchOwnership(ctx, currentCart, shopper, 'replaceCart'),
  ])

  if (
    saved.verdict === 'LOOKUP_FAILED' ||
    current.verdict === 'LOOKUP_FAILED'
  ) {
    // Transient: keep the reference, no cookie.
    return null
  }

  const savedVerdict = saved.verdict

  if (!isAcceptable(savedVerdict)) {
    // Includes FR-D1: OWNED by userProfileId but unmasked email of someone else.
    await vbase.saveJSON(APP_NAME, shopper.userId, null)
    logOwnershipRejection(ctx, 'replaceCart', savedVerdict, saved.reason)

    return null
  }

  const currentVerdict = current.verdict

  if (currentVerdict === 'CALL_CENTER') {
    logOwnershipRejection(ctx, 'replaceCart', currentVerdict)

    return null
  }

  const currentIsAcceptable = isAcceptable(currentVerdict)

  if (!currentIsAcceptable) {
    // Shared browser: never read the foreign current cart's items.
    logOwnershipRejection(ctx, 'replaceCart', currentVerdict, current.reason)
  }

  // Checkout calls below must not throw: the platform's GraphQL error
  // middleware would log the query variables (orderForm ids).
  try {
    if (savedCart === currentCart) {
      return await checkoutIO.getOrderForm(currentCart)
    }

    const [savedItems, currentItems] = await Promise.all([
      checkoutIO.getItems(savedCart),
      currentIsAcceptable
        ? checkoutIO.getItems(currentCart)
        : Promise.resolve([]),
    ])

    if (!savedItems.length) {
      // Nothing to recover: never adopt an empty saved cart. Never return a
      // non-acceptable current orderForm (its data belongs to someone else).
      if (!currentIsAcceptable) {
        return null
      }

      await vbase.saveJSON(APP_NAME, shopper.userId, currentCart)

      return await checkoutIO.getOrderForm(currentCart)
    }

    if (savedVerdict === 'OWNED') {
      if (saved.reason) {
        // FR-D1 residual risk: email masked or unverifiable, userProfileId decided.
        logResidualRisk(ctx, 'replaceCart', saved.reason)
      }

      if (strategy === 'REPLACE' || !currentItems.length) {
        const orderForm = await checkoutIO.getOrderForm(savedCart)

        adoptCart(ctx, savedCart)

        return orderForm
      }

      const items = mergeItems(currentItems, savedItems, strategy === 'COMBINE')

      await requestHub.clearCart(savedCart)
      const newOrderForm = await checkoutIO.addToCart(
        savedCart,
        toItemInput(items)
      )

      adoptCart(ctx, savedCart)

      return newOrderForm
    }

    // ANONYMOUS saved cart: not adopted (no proven owner); add its missing SKUs.
    if (!currentIsAcceptable) {
      return null
    }

    const missing = missingItems(currentItems, savedItems)

    const newOrderForm = missing.length
      ? await checkoutIO.addToCart(
          currentCart,
          toItemInput(missing, currentItems.length)
        )
      : await checkoutIO.getOrderForm(currentCart)

    await vbase.saveJSON(APP_NAME, shopper.userId, currentCart)

    return newOrderForm
  } catch (error) {
    ctx.vtex.logger.warn({
      message: 'cross-device-cart.checkout_error',
      operation: 'replaceCart',
      status: (error as any)?.response?.status ?? null,
    })

    return null
  }
}
