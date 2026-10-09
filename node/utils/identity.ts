import { DEFAULT_SALES_CHANNEL, ORDER_FORM_ID_PATTERN } from '../constants'
import { httpStatus } from './httpStatus'

export const STORE_AUDIENCE = 'webstore'

/**
 * Derives the shopper identity from the request's store-user token
 * (cookie VtexIdclientAutCookie_{account}), validated by VTEX ID
 * POST credential/validate. Returns null when there is no valid store-user
 * token for this account. Never reads GraphQL arguments.
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
      status: httpStatus(error) ?? null,
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
    ...(credential.user ? { email: credential.user.trim().toLowerCase() } : {}),
  }
}

export async function resolveSalesChannel(ctx: Context): Promise<string> {
  try {
    const segment = await ctx.clients.segment.getSegment()

    return segment?.channel != null
      ? String(segment.channel)
      : DEFAULT_SALES_CHANNEL
  } catch (error) {
    ctx.vtex.logger.warn({
      message: 'cross-device-cart.segment_unavailable',
      status: httpStatus(error) ?? null,
    })

    return DEFAULT_SALES_CHANNEL
  }
}

export const savedCartKey = (userId: string, salesChannel: string) =>
  `${userId}-sc:${salesChannel}`

export const isValidOrderFormId = (id: unknown): id is string =>
  typeof id === 'string' && ORDER_FORM_ID_PATTERN.test(id)

const CHECKOUT_COOKIE = 'checkout.vtex.com'
const OFID_PATTERN = /(?:^|&)__ofid=([a-f0-9]{32})(?:&|$)/

const decodeOfid = (raw: string): string | null => {
  try {
    const match = OFID_PATTERN.exec(decodeURIComponent(raw))

    return match ? match[1] : null
  } catch (error) {
    return null
  }
}

/**
 * Distinct valid orderForm ids (`checkout.vtex.com=__ofid=<id>`) held by the
 * request. `ctx.cookies.get` returns only the first same-name cookie, so every
 * copy is parsed from the raw Cookie header; without that header it falls back
 * to `ctx.cookies.get`. Empty or invalid copies are dropped; an encoded and a
 * plain copy of one id count once. FR-D2.
 */
export function readCheckoutCookieOrderFormIds(ctx: Context): string[] {
  const header = ctx.req?.headers?.cookie
  const prefix = `${CHECKOUT_COOKIE}=`
  const values =
    typeof header === 'string'
      ? header
          .split(';')
          .map((part) => part.trim())
          .filter((part) => part.startsWith(prefix))
          .map((part) => part.slice(prefix.length))
      : [ctx.cookies.get(CHECKOUT_COOKIE)]

  const ids = values.map((value) => (value ? decodeOfid(value) : null))

  return Array.from(new Set(ids.filter((id): id is string => id !== null)))
}

/**
 * FR-D2: the orderForm id sent by the client must equal one of the ids in the
 * request's checkout cookies. With two or more distinct ids and a match, a
 * PII-free `cookie_conflict` warning is logged (no ids). A mismatch returns
 * false; the caller logs the rejection.
 */
export function matchesCheckoutCookie(
  ctx: Context,
  orderFormId: string,
  operation: string
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

/**
 * Legacy bundles still send a `userId` argument, which is ignored. A value that
 * differs from the authenticated shopper is a forged or stale client, so it is
 * reported (no ids, no PII) but never changes the result.
 */
export function warnOnIdentityArgMismatch(
  ctx: Context,
  operation: string,
  argUserId: string | null | undefined,
  shopper: ShopperIdentity
) {
  const claimed = typeof argUserId === 'string' ? argUserId.trim() : ''

  if (
    !claimed ||
    claimed.toLowerCase() === shopper.userId.trim().toLowerCase()
  ) {
    return
  }

  ctx.vtex.logger.warn({
    message: 'cross-device-cart.identity_arg_mismatch',
    operation,
  })
}
