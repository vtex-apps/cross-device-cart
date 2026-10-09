export const STORE_AUDIENCE = 'webstore'

const ORDER_FORM_ID_PATTERN = /^[a-f0-9]{32}$/

export function isValidOrderFormId(id: unknown): id is string {
  return typeof id === 'string' && ORDER_FORM_ID_PATTERN.test(id)
}

/**
 * Derives the shopper identity from the request's store-user token
 * (cookie VtexIdclientAutCookie_{account}), validated by VTEX ID.
 * Returns null when there is no valid store-user token for this account.
 * Never reads GraphQL arguments.
 */
export async function resolveShopper(
  ctx: Context
): Promise<ShopperIdentity | null> {
  const token = ctx.vtex.storeUserAuthToken

  if (!token) {
    return null
  }

  let credential

  try {
    credential = await ctx.clients.vtexId.validateToken(token)
  } catch (error) {
    ctx.vtex.logger.warn({
      message: 'cross-device-cart.vtexid_unavailable',
      status: (error as any)?.response?.status ?? null,
    })

    return null
  }

  if (
    !credential ||
    credential.authStatus !== 'Success' ||
    !credential.id ||
    credential.account !== ctx.vtex.account ||
    credential.audience !== STORE_AUDIENCE
  ) {
    return null
  }

  return {
    userId: credential.id,
    email: credential.user ? credential.user.trim().toLowerCase() : null,
  }
}

const CHECKOUT_COOKIE = 'checkout.vtex.com'
const OFID_PATTERN = /(?:^|&)__ofid=([a-f0-9]{32})(?:&|$)/

function parseOrderFormId(raw: string): string | null {
  let decoded: string

  try {
    decoded = decodeURIComponent(raw)
  } catch (error) {
    return null
  }

  const match = OFID_PATTERN.exec(decoded)

  return match ? match[1] : null
}

/**
 * FR-D2: every distinct, valid orderFormId held by the request's
 * `checkout.vtex.com` cookie copies (`__ofid=<id>`, plain or URL-encoded).
 * Browsers can send several copies (different Domain/Path); `ctx.cookies.get`
 * only returns the first, so all copies are parsed from the raw Cookie header.
 * Falls back to `ctx.cookies.get` when the raw header is not available.
 * Empty or invalid copies are dropped; the same id in two encodings counts once.
 */
export function readCheckoutCookieOrderFormIds(ctx: Context): string[] {
  const header = ctx.req?.headers?.cookie
  const prefix = `${CHECKOUT_COOKIE}=`

  const rawValues: string[] =
    typeof header === 'string'
      ? header
          .split(';')
          .map((part) => part.trim())
          .filter((part) => part.startsWith(prefix))
          .map((part) => part.slice(prefix.length))
      : [ctx.cookies.get(CHECKOUT_COOKIE)].filter((value): value is string =>
          Boolean(value)
        )

  const ids = rawValues
    .map(parseOrderFormId)
    .filter((id): id is string => id !== null)

  return Array.from(new Set(ids))
}

/**
 * FR-D2 binding: true when the client-sent orderFormId equals ANY checkout
 * cookie copy. With two or more distinct ids and a match, a PII-free
 * `cookie_conflict` warning is logged (no ids).
 */
export function matchesCheckoutCookie(
  ctx: Context,
  orderFormId: string,
  operation: CrossCartOperation
): boolean {
  const ids = readCheckoutCookieOrderFormIds(ctx)

  if (!ids.includes(orderFormId)) {
    return false
  }

  if (ids.length > 1) {
    ctx.vtex.logger.warn({
      message: 'cross-device-cart.cookie_conflict',
      operation,
      reason: 'cookie_conflict',
    })
  }

  return true
}
