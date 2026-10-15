/* Synthetic fixtures only. Never put real shopper data here. */
import { toOrderFormOwner } from '../clients/chekoutREST'
import type { ValidatedCredential } from '../clients/vtexId'

export const ACCOUNT = 'teststore'
export const SC = '1'
export const SHOPPER_A = 'aaaaaaaa-0000-4000-8000-00000000000a'
export const SHOPPER_B = 'bbbbbbbb-0000-4000-8000-00000000000b'
export const TOKEN_A = 'store-token-shopper-a'
export const TOKEN_B = 'store-token-shopper-b'

export const OF_A = 'a'.repeat(32) // saved cart owned by A
export const OF_B = 'b'.repeat(32) // owned by B
export const OF_ANON = 'c'.repeat(32) // anonymous, no profile
export const OF_CURRENT_A = 'd'.repeat(32) // A's current cart
export const OF_CALL_CENTER = 'e'.repeat(32) // call-center cart
export const OF_IDENTIFIED = 'f'.repeat(32) // email present, no profile
export const OF_ADDRESS_ONLY = '3'.repeat(32) // shipping address (PII), no email, no profile
export const OF_MISSING = '0'.repeat(32) // Checkout returns 404
export const OF_A_GUEST_B = '1'.repeat(32) // A's profile kept after logout; guest B typed B's email (FR-D1)
export const OF_A_MASKED = '2'.repeat(32) // A's profile; email masked by Data Protection Plus (FR-D1)

// Synthetic logins on a reserved TLD, never real addresses.
export const EMAIL_A = 'shopper-a@example.test'
export const EMAIL_B = 'shopper-b@example.test'
const EMAILS: Record<string, string> = {
  [SHOPPER_A]: EMAIL_A,
  [SHOPPER_B]: EMAIL_B,
}

export const key = (userId: string, salesChannel = SC) =>
  `${userId}-sc:${salesChannel}`

export const owner = (
  orderFormId: string,
  overrides: Partial<OrderFormOwner> = {}
): OrderFormOwner => ({
  orderFormId,
  userProfileId: null,
  userType: null,
  loggedIn: false,
  hasClientProfile: false,
  email: null,
  salesChannel: SC,
  ...overrides,
})

export const DEFAULT_OWNERS: Record<string, OrderFormOwner | null> = {
  [OF_A]: owner(OF_A, {
    userProfileId: SHOPPER_A,
    loggedIn: true,
    hasClientProfile: true,
    email: EMAIL_A,
  }),
  [OF_CURRENT_A]: owner(OF_CURRENT_A, {
    userProfileId: SHOPPER_A,
    loggedIn: true,
    hasClientProfile: true,
    email: EMAIL_A,
  }),
  [OF_B]: owner(OF_B, {
    userProfileId: SHOPPER_B,
    loggedIn: true,
    hasClientProfile: true,
    email: EMAIL_B,
  }),
  [OF_A_GUEST_B]: owner(OF_A_GUEST_B, {
    userProfileId: SHOPPER_A,
    hasClientProfile: true,
    email: EMAIL_B,
  }),
  [OF_A_MASKED]: owner(OF_A_MASKED, {
    userProfileId: SHOPPER_A,
    hasClientProfile: true,
    email: 'sh***@***.test',
  }),
  [OF_ANON]: owner(OF_ANON),
  [OF_CALL_CENTER]: owner(OF_CALL_CENTER, {
    userProfileId: SHOPPER_A,
    userType: 'callCenterOperator',
    hasClientProfile: true,
    email: EMAIL_A,
  }),
  [OF_IDENTIFIED]: owner(OF_IDENTIFIED, {
    hasClientProfile: true,
    email: EMAIL_B,
  }),
  // Built through the real projection: a Checkout API cart with an address but no email.
  [OF_ADDRESS_ONLY]: toOrderFormOwner(OF_ADDRESS_ONLY, {
    orderFormId: OF_ADDRESS_ONLY,
    clientProfileData: { email: null },
    shippingData: { address: { receiverName: 'Synthetic Receiver' } },
    salesChannel: SC,
  }),
  [OF_MISSING]: null,
}

/** A valid credential/validate body for a store token of ACCOUNT. */
export const credential = (
  id: string,
  overrides: Partial<ValidatedCredential> = {}
): ValidatedCredential => ({
  authStatus: 'Success',
  id,
  user: EMAILS[id] ?? 'unknown@example.test',
  account: ACCOUNT,
  audience: 'webstore',
  tokenType: 'user',
  ...overrides,
})

export const item = (id: number, quantity = 1): PartialItem => ({
  id,
  quantity,
  seller: '1',
  uniqueId: `unique-${id}`,
})

interface Options {
  token?: string
  vbase?: Record<string, string | null>
  owners?: Record<string, OrderFormOwner | null>
  /** status of failing owner lookups; defaults to 503 when ownerLookupFailIds is used */
  ownerLookupStatus?: number
  /** when set, only these orderForm ids fail the owner lookup (every id otherwise) */
  ownerLookupFailIds?: string[]
  items?: Record<string, PartialItem[]>
  channel?: number
  /** __ofid held by the request's checkout.vtex.com cookie (FR-D2); absent by default */
  checkoutCookie?: string | null
  /** raw checkout.vtex.com cookie value; overrides checkoutCookie */
  checkoutCookieRaw?: string
  /** full raw Cookie request header (duplicate-cookie cases) */
  rawCookieHeader?: string
}

export function createContext(options: Options = {}) {
  const store = new Map<string, string | null>(
    Object.entries(options.vbase ?? {})
  )

  const owners: Record<string, OrderFormOwner | null> = {
    ...DEFAULT_OWNERS,
    ...options.owners,
  }

  const items: Record<string, PartialItem[]> = {}

  Object.entries(options.items ?? {}).forEach(([id, list]) => {
    items[id] = list.map((i) => ({ ...i }))
  })

  const tokens: Record<string, string> = {
    [TOKEN_A]: SHOPPER_A,
    [TOKEN_B]: SHOPPER_B,
  }

  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

  const vbase = {
    getJSON: jest.fn(
      async (_bucket: string, k: string, _nullIfNotFound?: boolean) =>
        store.has(k) ? store.get(k) : null
    ),
    saveJSON: jest.fn(
      async (_bucket: string, k: string, value: string | null) => {
        store.set(k, value)
      }
    ),
  }

  // Mirrors VTEX ID POST credential/validate: unknown tokens get 401, which the client maps to null.
  const vtexId = {
    validateToken: jest.fn(
      async (token: string): Promise<ValidatedCredential | null> =>
        tokens[token] ? credential(tokens[token]) : null
    ),
  }

  const requestHub = {
    clearCart: jest.fn(async (id: string) => {
      items[id] = []
    }),
  }

  const segment = {
    getSegment: jest.fn(async () => ({ channel: options.channel ?? 1 })),
  }

  const checkoutRest = {
    getOrderFormOwner: jest.fn(async (id: string) => {
      const failing = options.ownerLookupFailIds
        ? options.ownerLookupFailIds.includes(id)
        : Boolean(options.ownerLookupStatus)

      if (failing) {
        throw Object.assign(new Error('owner lookup failed'), {
          response: { status: options.ownerLookupStatus ?? 503 },
        })
      }

      return id in owners ? owners[id] : null
    }),
    removePaymentData: jest.fn(async () => ({})),
  }

  const checkoutIO = {
    getItems: jest.fn(async (id: string) =>
      (items[id] ?? []).map((i) => ({ ...i }))
    ),
    getOrderForm: jest.fn(async (id: string) => ({
      id,
      items: items[id] ?? [],
    })),
    addToCart: jest.fn(async (id: string, added: PartialItem[]) => {
      items[id] = [...(items[id] ?? []), ...added]

      return { id, items: items[id] }
    }),
  }

  const response = { set: jest.fn() }

  const cookieJar = {
    ofid: options.checkoutCookie ?? null,
    raw: options.checkoutCookieRaw,
  }

  const cookies = {
    get: jest.fn((name: string) => {
      if (name !== 'checkout.vtex.com') {
        return undefined
      }

      if ('raw' in cookieJar && cookieJar.raw !== undefined) {
        return cookieJar.raw
      }

      return cookieJar.ofid ? `__ofid=${cookieJar.ofid}` : undefined
    }),
  }

  const ctx = {
    vtex: { account: ACCOUNT, storeUserAuthToken: options.token, logger },
    clients: { vbase, vtexId, requestHub, segment, checkoutRest, checkoutIO },
    response,
    cookies,
    req: {
      headers: options.rawCookieHeader
        ? { cookie: options.rawCookieHeader }
        : {},
    },
    __cookieJar: cookieJar,
    get: jest.fn(() => 'teststore.myvtex.com'),
  }

  return {
    ctx: (ctx as unknown) as Context,
    store,
    items,
    logger,
    response,
    vbase,
    vtexId,
    requestHub,
    segment,
    checkoutRest,
    checkoutIO,
  }
}

/** Sets the __ofid of the fake checkout.vtex.com cookie (FR-D2). */
export function setCheckoutCookie(ctx: Context, orderFormId: string | null) {
  const jar = (ctx as any).__cookieJar

  jar.ofid = orderFormId
  jar.raw = undefined
}

/** Throws if any log call contains a shopper id, email, token or orderForm id. */
export function expectNoPiiInLogs(logger: {
  info: jest.Mock
  warn: jest.Mock
  error: jest.Mock
}) {
  const serialized = JSON.stringify([
    logger.info.mock.calls,
    logger.warn.mock.calls,
    logger.error.mock.calls,
  ])

  ;[
    SHOPPER_A,
    SHOPPER_B,
    TOKEN_A,
    TOKEN_B,
    EMAIL_A,
    EMAIL_B,
    OF_A,
    OF_B,
    OF_ANON,
    OF_CURRENT_A,
    OF_CALL_CENTER,
    OF_IDENTIFIED,
    OF_ADDRESS_ONLY,
    OF_A_GUEST_B,
    OF_A_MASKED,
  ].forEach((secret) => expect(serialized).not.toContain(secret))
}
