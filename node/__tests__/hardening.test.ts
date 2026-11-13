/* eslint-disable jest/no-expect-resolves, jest/no-mocks-import */
import { getSavedCart } from '../resolvers/getSavedCart'
import { saveCurrentCart } from '../resolvers/saveCurrentCart'
import { replaceCart } from '../resolvers/replaceCart'
import { readCheckoutCookieOrderFormIds } from '../utils/identity'
import { classifyOwnershipWithReason } from '../utils/ownership'
import {
  EMAIL_A,
  EMAIL_B,
  OF_A,
  OF_A_GUEST_B,
  OF_A_MASKED,
  OF_B,
  OF_ANON,
  OF_CURRENT_A,
  SHOPPER_A,
  TOKEN_A,
  createContext,
  expectNoPiiInLogs,
  item,
  key,
  owner,
} from '../__mocks__/testContext'

const shopperA: ShopperIdentity = { userId: SHOPPER_A, email: EMAIL_A }

describe('FR-D1: adoption identity check', () => {
  it.each<[string, OrderFormOwner, OwnershipResult]>([
    [
      'email matches (case-insensitive)',
      owner(OF_A, { userProfileId: SHOPPER_A, email: EMAIL_A.toUpperCase() }),
      { verdict: 'OWNED' },
    ],
    [
      'email differs',
      owner(OF_A, { userProfileId: SHOPPER_A, email: EMAIL_B }),
      { verdict: 'FOREIGN', reason: 'email_mismatch' },
    ],
    [
      'email masked',
      owner(OF_A, { userProfileId: SHOPPER_A, email: 'sh***@***.test' }),
      { verdict: 'OWNED', reason: 'email_masked' },
    ],
    [
      'no email on the cart',
      owner(OF_A, { userProfileId: SHOPPER_A }),
      { verdict: 'OWNED' },
    ],
  ])('%s', (_label, input, expected) => {
    expect(classifyOwnershipWithReason(input, shopperA)).toEqual(expected)
  })

  it('OWNED with email_unverified when VTEX ID returned no login email', () => {
    expect(
      classifyOwnershipWithReason(
        owner(OF_A, { userProfileId: SHOPPER_A, email: EMAIL_A }),
        { userId: SHOPPER_A }
      )
    ).toEqual({ verdict: 'OWNED', reason: 'email_unverified' })
  })

  it('replaceCart: an OWNED-by-id cart carrying another email is not adopted', async () => {
    const { ctx, response, store, checkoutRest, logger } = createContext({
      token: TOKEN_A,
      checkoutCookie: OF_CURRENT_A,
      vbase: { [key(SHOPPER_A)]: OF_A_GUEST_B },
      items: { [OF_A_GUEST_B]: [item(1)], [OF_CURRENT_A]: [item(3)] },
    })

    await expect(
      replaceCart(
        undefined,
        {
          savedCart: OF_A_GUEST_B,
          currentCart: OF_CURRENT_A,
          strategy: 'COMBINE',
        },
        ctx
      )
    ).resolves.toBeNull()
    expect(response.set).not.toHaveBeenCalled()
    expect(checkoutRest.removePaymentData).not.toHaveBeenCalled()
    expect(store.get(key(SHOPPER_A))).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.ownership_rejected',
      operation: 'replaceCart',
      verdict: 'FOREIGN',
      reason: 'email_mismatch',
    })
    expectNoPiiInLogs(logger)
  })

  it('replaceCart: a masked email lets userProfileId decide and logs the residual risk', async () => {
    const { ctx, response, logger } = createContext({
      token: TOKEN_A,
      checkoutCookie: OF_CURRENT_A,
      vbase: { [key(SHOPPER_A)]: OF_A_MASKED },
      items: { [OF_A_MASKED]: [item(1)], [OF_CURRENT_A]: [item(3)] },
    })

    const result: any = await replaceCart(
      undefined,
      {
        savedCart: OF_A_MASKED,
        currentCart: OF_CURRENT_A,
        strategy: 'REPLACE',
      },
      ctx
    )

    expect(result.id).toBe(OF_A_MASKED)
    expect(response.set).toHaveBeenCalledWith(
      'set-cookie',
      expect.stringContaining(`__ofid=${OF_A_MASKED};`)
    )
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.adoption_residual_risk',
      operation: 'replaceCart',
      reason: 'email_masked',
    })
    expectNoPiiInLogs(logger)
  })

  it('getSavedCart: an email mismatch clears the reference', async () => {
    const { ctx, store } = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_A)]: OF_A_GUEST_B },
    })

    await expect(
      getSavedCart(undefined, { nullOnEmpty: false }, ctx)
    ).resolves.toBeNull()
    expect(store.get(key(SHOPPER_A))).toBeNull()
  })
})

describe('FR-D2: checkout cookie binding', () => {
  it('reads __ofid from the checkout.vtex.com cookie', () => {
    const { ctx } = createContext({ checkoutCookie: OF_A })

    expect(readCheckoutCookieOrderFormIds(ctx)[0] ?? null).toBe(OF_A)
  })

  it.each([
    [undefined],
    [''],
    ['__ofid=not-an-id'],
    ['other=1'],
    [`__ofid=${'A'.repeat(32)}`],
    ['%E0%A4%A'],
  ])('returns null for raw cookie %p', (raw) => {
    const { ctx } = createContext({ checkoutCookieRaw: raw })

    expect(readCheckoutCookieOrderFormIds(ctx)[0] ?? null).toBeNull()
  })

  it('saveCurrentCart: rejects an orderFormId that is not the browser cookie cart', async () => {
    const { ctx, vbase, checkoutRest, logger } = createContext({
      token: TOKEN_A,
      checkoutCookie: OF_CURRENT_A,
    })

    await expect(
      saveCurrentCart(undefined, { orderFormId: OF_ANON }, ctx)
    ).resolves.toBe('rejected')
    expect(vbase.saveJSON).not.toHaveBeenCalled()
    expect(checkoutRest.getOrderFormOwner).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.ownership_rejected',
      operation: 'saveCurrentCart',
      verdict: 'COOKIE_MISMATCH',
      reason: 'cookie_mismatch',
    })
  })

  it('saveCurrentCart: rejects when the checkout cookie is missing', async () => {
    const { ctx, vbase } = createContext({ token: TOKEN_A })

    await expect(
      saveCurrentCart(undefined, { orderFormId: OF_ANON }, ctx)
    ).resolves.toBe('rejected')
    expect(vbase.saveJSON).not.toHaveBeenCalled()
  })

  it('saveCurrentCart: clearing the own key (orderFormId null) does not need the cookie', async () => {
    const { ctx, store } = createContext({
      token: TOKEN_A,
      vbase: { [key(SHOPPER_A)]: OF_A },
    })

    await expect(
      saveCurrentCart(undefined, { orderFormId: null }, ctx)
    ).resolves.toBe('success')
    expect(store.get(key(SHOPPER_A))).toBeNull()
  })

  it.each([
    ['another cart', OF_ANON],
    ['no cookie', null],
  ])(
    'replaceCart: rejects when the cookie holds %s',
    async (_label, cookie) => {
      const { ctx, vbase, checkoutRest, response, logger } = createContext({
        token: TOKEN_A,
        checkoutCookie: cookie,
        vbase: { [key(SHOPPER_A)]: OF_A },
      })

      await expect(
        replaceCart(
          undefined,
          { savedCart: OF_A, currentCart: OF_CURRENT_A, strategy: 'COMBINE' },
          ctx
        )
      ).resolves.toBeNull()
      expect(vbase.getJSON).not.toHaveBeenCalled()
      expect(checkoutRest.getOrderFormOwner).not.toHaveBeenCalled()
      expect(response.set).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith({
        message: 'cross-device-cart.ownership_rejected',
        operation: 'replaceCart',
        verdict: 'COOKIE_MISMATCH',
        reason: 'cookie_mismatch',
      })
    }
  )
})

describe('sales channel resolution drives the key', () => {
  const FIVE = key(SHOPPER_A, '5')

  it('getSavedCart reads the key of the resolved channel', async () => {
    const { ctx } = createContext({
      token: TOKEN_A,
      channel: 5,
      vbase: { [FIVE]: OF_A, [key(SHOPPER_A, '1')]: OF_ANON },
    })

    await expect(
      getSavedCart(undefined, { salesChannel: '1', nullOnEmpty: false }, ctx)
    ).resolves.toBe(OF_A)
  })

  it('replaceCart requires the reference of the resolved channel', async () => {
    const { ctx, response } = createContext({
      token: TOKEN_A,
      channel: 5,
      checkoutCookie: OF_CURRENT_A,
      vbase: { [FIVE]: OF_A },
      items: { [OF_A]: [item(1)], [OF_CURRENT_A]: [item(3)] },
    })

    const result: any = await replaceCart(
      undefined,
      { savedCart: OF_A, currentCart: OF_CURRENT_A, strategy: 'REPLACE' },
      ctx
    )

    expect(result.id).toBe(OF_A)
    expect(response.set).toHaveBeenCalled()
  })

  it('segment failure: all three resolvers fall back to channel 1 and log the warning', async () => {
    const one = key(SHOPPER_A, '1')
    const { ctx, segment, store, logger } = createContext({
      token: TOKEN_A,
      checkoutCookie: OF_ANON,
      vbase: { [one]: OF_A },
    })

    segment.getSegment.mockRejectedValue(new Error('segment down'))

    await expect(
      getSavedCart(undefined, { nullOnEmpty: false }, ctx)
    ).resolves.toBe(OF_A)
    await expect(
      saveCurrentCart(undefined, { orderFormId: OF_ANON }, ctx)
    ).resolves.toBe('success')
    expect(store.get(one)).toBe(OF_ANON)
    await replaceCart(
      undefined,
      { savedCart: OF_ANON, currentCart: OF_ANON, strategy: 'REPLACE' },
      ctx
    )
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.segment_unavailable',
      status: null,
    })
    expectNoPiiInLogs(logger)
  })
})

describe('replaceCart owner lookups', () => {
  it('does a single lookup when savedCart equals currentCart', async () => {
    const { ctx, checkoutRest } = createContext({
      token: TOKEN_A,
      checkoutCookie: OF_A,
      vbase: { [key(SHOPPER_A)]: OF_A },
      items: { [OF_A]: [item(1)] },
    })

    await replaceCart(
      undefined,
      { savedCart: OF_A, currentCart: OF_A, strategy: 'REPLACE' },
      ctx
    )
    expect(checkoutRest.getOrderFormOwner).toHaveBeenCalledTimes(1)
  })
})

describe('FR-D2: duplicate checkout cookies', () => {
  const header = (...ids: string[]) =>
    ids.map((id) => `checkout.vtex.com=__ofid=${id}`).join('; ')

  const conflictLog = {
    message: 'cross-device-cart.cookie_conflict',
    reason: 'cookie_conflict',
  }

  it.each([
    ['first', [OF_ANON, OF_CURRENT_A]],
    ['second', [OF_CURRENT_A, OF_ANON]],
  ])(
    'saveCurrentCart: accepts when the client id matches the %s of two different copies, and logs the conflict',
    async (_n, ids) => {
      const { ctx, store, logger } = createContext({
        token: TOKEN_A,
        rawCookieHeader: header(...ids),
      })

      await expect(
        saveCurrentCart(undefined, { orderFormId: OF_ANON }, ctx)
      ).resolves.toBe('success')
      expect(store.get(key(SHOPPER_A))).toBe(OF_ANON)
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          ...conflictLog,
          operation: 'saveCurrentCart',
        })
      )
      expectNoPiiInLogs(logger)
    }
  )

  it('saveCurrentCart: rejects with cookie_mismatch when no copy matches', async () => {
    const { ctx, vbase, logger } = createContext({
      token: TOKEN_A,
      rawCookieHeader: header(OF_CURRENT_A, OF_B),
    })

    await expect(
      saveCurrentCart(undefined, { orderFormId: OF_ANON }, ctx)
    ).resolves.toBe('rejected')
    expect(vbase.saveJSON).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'cookie_mismatch' })
    )
  })

  it('saveCurrentCart: an encoded and a plain copy of the same id are accepted with no conflict log', async () => {
    const encoded = `checkout.vtex.com=${encodeURIComponent(
      `__ofid=${OF_ANON}`
    )}`

    const { ctx, logger } = createContext({
      token: TOKEN_A,
      rawCookieHeader: `${header(OF_ANON)}; ${encoded}`,
    })

    await expect(
      saveCurrentCart(undefined, { orderFormId: OF_ANON }, ctx)
    ).resolves.toBe('success')
    expect(logger.warn).not.toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'cookie_conflict' })
    )
  })

  it('saveCurrentCart: an empty stale copy plus a valid one is accepted', async () => {
    const { ctx, logger } = createContext({
      token: TOKEN_A,
      rawCookieHeader: `checkout.vtex.com=; ${header(OF_ANON)}`,
    })

    await expect(
      saveCurrentCart(undefined, { orderFormId: OF_ANON }, ctx)
    ).resolves.toBe('success')
    expect(logger.warn).not.toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'cookie_conflict' })
    )
  })

  it('replaceCart: accepts when currentCart matches one of two different copies, and logs the conflict', async () => {
    const { ctx, logger } = createContext({
      token: TOKEN_A,
      rawCookieHeader: header(OF_ANON, OF_CURRENT_A),
      vbase: { [key(SHOPPER_A)]: OF_A },
      items: { [OF_A]: [item(1)], [OF_CURRENT_A]: [item(3)] },
    })

    const result: any = await replaceCart(
      undefined,
      { savedCart: OF_A, currentCart: OF_CURRENT_A, strategy: 'REPLACE' },
      ctx
    )

    expect(result.id).toBe(OF_A)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ ...conflictLog, operation: 'replaceCart' })
    )
    expectNoPiiInLogs(logger)
  })

  it('replaceCart: rejects when no copy matches currentCart', async () => {
    const { ctx, response } = createContext({
      token: TOKEN_A,
      rawCookieHeader: header(OF_ANON, OF_B),
      vbase: { [key(SHOPPER_A)]: OF_A },
    })

    await expect(
      replaceCart(
        undefined,
        { savedCart: OF_A, currentCart: OF_CURRENT_A, strategy: 'REPLACE' },
        ctx
      )
    ).resolves.toBeNull()
    expect(response.set).not.toHaveBeenCalled()
  })
})
