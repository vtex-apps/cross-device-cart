/* Synthetic identifiers only. Never put real shopper data in fixtures. */
export const ACCOUNT = 'testaccount'
export const SHOPPER_A = 'aaaaaaaa-0000-4000-8000-00000000000a'
export const SHOPPER_B = 'bbbbbbbb-0000-4000-8000-00000000000b'
export const OF_A = 'a'.repeat(32)
export const OF_A2 = `${'a'.repeat(31)}2`
export const OF_B = 'b'.repeat(32)
export const OF_ANON = 'c'.repeat(32)
export const OF_CALL_CENTER = 'd'.repeat(32)
export const OF_IDENTIFIED = 'e'.repeat(32)
/** R1 gap: carries A's userProfileId but a guest later typed B's email */
export const OF_A_GUEST_B = '9'.repeat(32)
/** A's cart on a PII-masked account */
export const OF_A_MASKED = '8'.repeat(32)
export const EMAIL_A = 'shopper-a@example.test'
export const EMAIL_B = 'shopper-b@example.test'

export const owners: Record<string, OrderFormOwner> = {
  [OF_A]: {
    orderFormId: OF_A,
    userProfileId: SHOPPER_A,
    userType: null,
    loggedIn: true,
    hasClientProfile: true,
    email: EMAIL_A,
  },
  [OF_A2]: {
    orderFormId: OF_A2,
    userProfileId: SHOPPER_A,
    userType: null,
    loggedIn: true,
    hasClientProfile: true,
    email: 'Shopper-A@Example.test',
  },
  [OF_B]: {
    orderFormId: OF_B,
    userProfileId: SHOPPER_B,
    userType: null,
    loggedIn: true,
    hasClientProfile: true,
    email: EMAIL_B,
  },
  [OF_ANON]: {
    orderFormId: OF_ANON,
    userProfileId: null,
    userType: null,
    loggedIn: false,
    hasClientProfile: false,
    email: null,
  },
  [OF_CALL_CENTER]: {
    orderFormId: OF_CALL_CENTER,
    userProfileId: SHOPPER_B,
    userType: 'callCenterOperator',
    loggedIn: true,
    hasClientProfile: true,
    email: EMAIL_B,
  },
  [OF_IDENTIFIED]: {
    orderFormId: OF_IDENTIFIED,
    userProfileId: null,
    userType: null,
    loggedIn: false,
    hasClientProfile: true,
    email: EMAIL_B,
  },
  [OF_A_GUEST_B]: {
    orderFormId: OF_A_GUEST_B,
    userProfileId: SHOPPER_A,
    userType: null,
    loggedIn: false,
    hasClientProfile: true,
    email: EMAIL_B,
  },
  [OF_A_MASKED]: {
    orderFormId: OF_A_MASKED,
    userProfileId: SHOPPER_A,
    userType: null,
    loggedIn: true,
    hasClientProfile: true,
    email: 'sh*****@example.test',
  },
}

export const item = (id: number, quantity: number): PartialItem => ({
  id,
  quantity,
  seller: '1',
  uniqueId: `u${id}`,
})

interface Options {
  /** shopper behind the store token; null = no token */
  shopper?: string | null
  /** initial VBase content: key -> orderFormId */
  store?: Record<string, string | null>
  items?: Record<string, PartialItem[]>
  /** orderFormId in the request's checkout.vtex.com cookie (FR-D2); null = no cookie */
  cookie?: string | null
  /** raw Cookie request header; when set it overrides `cookie` (duplicate-cookie tests) */
  rawCookieHeader?: string
}

export function mockContext({
  shopper = SHOPPER_A,
  store = {},
  items = {},
  cookie = OF_A,
  rawCookieHeader,
}: Options = {}) {
  const vbaseData: Record<string, string | null> = { ...store }

  const vbase = {
    getJSON: jest.fn(async (_bucket: string, key: string) =>
      key in vbaseData ? vbaseData[key] : null
    ),
    saveJSON: jest.fn(
      async (_bucket: string, key: string, value: string | null) => {
        vbaseData[key] = value
      }
    ),
  }

  const vtexId = {
    validateToken: jest.fn(async (token: string) =>
      token === `token-${shopper}`
        ? {
            authStatus: 'Success',
            id: shopper,
            user: shopper === SHOPPER_B ? EMAIL_B : EMAIL_A,
            account: ACCOUNT,
            audience: 'webstore',
            tokenType: 'user',
          }
        : null
    ),
  }

  const checkoutRest = {
    getOrderFormOwner: jest.fn(async (id: string) => owners[id] ?? null),
  }

  const checkoutIO = {
    getItems: jest.fn(async (id: string) =>
      (items[id] ?? []).map((entry) => ({ ...entry }))
    ),
    getOrderForm: jest.fn(async (id: string) => ({
      id,
      items: items[id] ?? [],
    })),
    addToCart: jest.fn(async (id: string, newItems: PartialItem[]) => ({
      id,
      items: newItems,
    })),
  }

  const requestHub = { clearCart: jest.fn(async () => ({})) }

  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

  const response = { set: jest.fn() }

  const ctx: any = {
    vtex: {
      account: ACCOUNT,
      storeUserAuthToken: shopper ? `token-${shopper}` : undefined,
      logger,
    },
    clients: { vbase, vtexId, checkoutRest, checkoutIO, requestHub },
    response,
    req: { headers: rawCookieHeader ? { cookie: rawCookieHeader } : {} },
    get: jest.fn(() => `${ACCOUNT}.example.com`),
    cookies: {
      get: jest.fn((name: string) =>
        name === 'checkout.vtex.com'
          ? rawCookieHeader
            ? rawCookieHeader
                .split(';')
                .map((p) => p.trim())
                .find((p) => p.startsWith('checkout.vtex.com='))
                ?.slice(18)
            : cookie
            ? `__ofid=${cookie}`
            : undefined
          : undefined
      ),
    },
  }

  return {
    ctx,
    vbase,
    vbaseData,
    vtexId,
    checkoutRest,
    checkoutIO,
    requestHub,
    logger,
    response,
  }
}

/** Fails if any logged payload contains an identifier from the fixtures. */
export function expectNoIdentifiersLogged(logger: {
  info: jest.Mock
  warn: jest.Mock
  error: jest.Mock
}) {
  const logged = JSON.stringify([
    ...logger.info.mock.calls,
    ...logger.warn.mock.calls,
    ...logger.error.mock.calls,
  ])

  for (const id of [
    SHOPPER_A,
    SHOPPER_B,
    OF_A,
    OF_A2,
    OF_B,
    OF_ANON,
    OF_CALL_CENTER,
    OF_IDENTIFIED,
    OF_A_GUEST_B,
    OF_A_MASKED,
    EMAIL_A,
    EMAIL_B,
    '@example.test',
  ]) {
    expect(logged).not.toContain(id)
  }
}
