/* eslint-disable jest/no-expect-resolves */
import { missingItems, replaceCart } from '../resolvers/replaceCart'
import {
  expectNoIdentifiersLogged,
  item,
  mockContext,
  OF_A,
  OF_A2,
  OF_A_GUEST_B,
  OF_A_MASKED,
  OF_ANON,
  OF_B,
  OF_CALL_CENTER,
  OF_IDENTIFIED,
  SHOPPER_A,
} from '../testUtils/mockContext'

const SAVED = OF_A2 // own (OWNED) cart left on another device
const COOKIE = `checkout.vtex.com=__ofid=${SAVED}; Max-Age=15552000; Domain=testaccount.example.com; path=/; secure; samesite=lax; httponly`

const run = (
  ctx: any,
  strategy: Strategy,
  currentCart = OF_A,
  savedCart = SAVED
) => replaceCart({}, { savedCart, currentCart, strategy, userType: '' }, ctx)

describe('replaceCart with an OWNED saved cart (adopt own cart)', () => {
  it('REPLACE adopts the saved cart: cookie set, saved orderForm returned, nothing written', async () => {
    const { ctx, checkoutIO, requestHub, response, vbaseData } = mockContext({
      store: { [SHOPPER_A]: SAVED },
      items: { [SAVED]: [item(5, 2)], [OF_A]: [item(1, 1)] },
    })

    await expect(run(ctx, 'REPLACE')).resolves.toMatchObject({ id: SAVED })
    expect(response.set).toHaveBeenCalledWith('set-cookie', COOKIE)
    expect(requestHub.clearCart).not.toHaveBeenCalled()
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(vbaseData[SHOPPER_A]).toBe(SAVED)
  })

  it('ADD writes the union into the saved cart, then adopts it', async () => {
    const { ctx, checkoutIO, requestHub, response } = mockContext({
      store: { [SHOPPER_A]: SAVED },
      items: { [SAVED]: [item(1, 9), item(5, 2)], [OF_A]: [item(1, 1)] },
    })

    await expect(run(ctx, 'ADD')).resolves.toMatchObject({ id: SAVED })
    expect(requestHub.clearCart).toHaveBeenCalledWith(SAVED)
    expect(checkoutIO.addToCart).toHaveBeenCalledWith(SAVED, [
      { ...item(1, 1), index: 0 },
      { ...item(5, 2), index: 1 },
    ])
    expect(response.set).toHaveBeenCalledWith('set-cookie', COOKIE)
  })

  it('COMBINE sums duplicates into the saved cart, then adopts it', async () => {
    const { ctx, checkoutIO } = mockContext({
      store: { [SHOPPER_A]: SAVED },
      items: { [SAVED]: [item(1, 2)], [OF_A]: [item(1, 1)] },
    })

    await run(ctx, 'COMBINE')

    expect(checkoutIO.addToCart).toHaveBeenCalledWith(SAVED, [
      { ...item(1, 3), index: 0 },
    ])
  })

  it('accepts an anonymous current cart as merge source', async () => {
    const { ctx, checkoutIO } = mockContext({
      cookie: OF_ANON,
      store: { [SHOPPER_A]: SAVED },
      items: { [SAVED]: [item(5, 1)], [OF_ANON]: [item(7, 1)] },
    })

    await run(ctx, 'ADD', OF_ANON)

    expect(checkoutIO.getItems).toHaveBeenCalledWith(OF_ANON)
  })

  it.each([OF_B, OF_IDENTIFIED])(
    'shared browser: current cart %s items are never read nor merged, own cart adopted as is',
    async (current) => {
      const { ctx, checkoutIO, requestHub, response, logger } = mockContext({
        cookie: current,
        store: { [SHOPPER_A]: SAVED },
        items: { [SAVED]: [item(5, 1)], [OF_B]: [item(9, 1)] },
      })

      await expect(run(ctx, 'COMBINE', current)).resolves.toMatchObject({
        id: SAVED,
      })
      expect(checkoutIO.getItems).not.toHaveBeenCalledWith(current)
      expect(requestHub.clearCart).not.toHaveBeenCalled()
      expect(checkoutIO.addToCart).not.toHaveBeenCalled()
      expect(response.set).toHaveBeenCalledWith('set-cookie', COOKIE)
      expect(logger.warn).toHaveBeenCalledWith({
        message: 'cross-device-cart.ownership_rejected',
        operation: 'replaceCart',
        verdict: current === OF_B ? 'FOREIGN' : 'UNVERIFIED_PROFILE',
      })
      expectNoIdentifiersLogged(logger)
    }
  )

  it('empty OWNED saved cart is not adopted: current returned, no cookie, key re-pointed', async () => {
    const { ctx, checkoutIO, response, vbaseData } = mockContext({
      store: { [SHOPPER_A]: SAVED },
      items: { [OF_A]: [item(1, 1)] },
    })

    await expect(run(ctx, 'COMBINE')).resolves.toMatchObject({ id: OF_A })
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(response.set).not.toHaveBeenCalled()
    expect(vbaseData[SHOPPER_A]).toBe(OF_A)
  })

  it('empty OWNED saved cart + FOREIGN current cart: null, the foreign orderForm is never returned', async () => {
    const { ctx, checkoutIO, response } = mockContext({
      cookie: OF_B,
      store: { [SHOPPER_A]: SAVED },
      items: { [OF_B]: [item(9, 1)] },
    })

    await expect(run(ctx, 'REPLACE', OF_B)).resolves.toBeNull()
    expect(checkoutIO.getOrderForm).not.toHaveBeenCalledWith(OF_B)
    expect(response.set).not.toHaveBeenCalled()
  })

  it('merge failure: null, no cookie, PII-free checkout_error log, no throw (the platform would log the variables)', async () => {
    const { ctx, checkoutIO, response, logger } = mockContext({
      store: { [SHOPPER_A]: SAVED },
      items: { [SAVED]: [item(1, 2)], [OF_A]: [item(2, 1)] },
    })

    checkoutIO.addToCart.mockRejectedValueOnce({
      response: { status: 503 },
      message: 'checkout down',
    })

    await expect(run(ctx, 'COMBINE')).resolves.toBeNull()
    expect(response.set).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.checkout_error',
      operation: 'replaceCart',
      status: 503,
    })
    expectNoIdentifiersLogged(logger)
  })

  it.each(['getItems', 'getOrderForm', 'clearCart'])(
    '%s failure: null, no cookie, checkout_error with status null',
    async (failing) => {
      const { ctx, checkoutIO, requestHub, response, logger } = mockContext({
        store: { [SHOPPER_A]: SAVED },
        items: { [SAVED]: [item(1, 2)], [OF_A]: [item(2, 1)] },
      })

      const target: any = failing === 'clearCart' ? requestHub : checkoutIO

      target[failing].mockRejectedValueOnce(new Error('boom'))

      await expect(
        run(ctx, failing === 'getOrderForm' ? 'REPLACE' : 'COMBINE')
      ).resolves.toBeNull()
      expect(response.set).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith({
        message: 'cross-device-cart.checkout_error',
        operation: 'replaceCart',
        status: null,
      })
      expectNoIdentifiersLogged(logger)
    }
  )

  it('owner lookup failure keeps the reference and sets no cookie', async () => {
    const { ctx, checkoutRest, vbaseData, response } = mockContext({
      store: { [SHOPPER_A]: SAVED },
    })

    checkoutRest.getOrderFormOwner.mockRejectedValueOnce({
      response: { status: 503 },
    })

    await expect(run(ctx, 'REPLACE')).resolves.toBeNull()
    expect(vbaseData[SHOPPER_A]).toBe(SAVED)
    expect(response.set).not.toHaveBeenCalled()
  })

  it('call-center current cart: no-op regardless of client userType', async () => {
    const { ctx, checkoutIO, response } = mockContext({
      cookie: OF_CALL_CENTER,
      store: { [SHOPPER_A]: SAVED },
      items: { [SAVED]: [item(5, 1)] },
    })

    await expect(
      replaceCart(
        {},
        {
          savedCart: SAVED,
          currentCart: OF_CALL_CENTER,
          strategy: 'REPLACE',
          userType: 'STORE_USER',
        },
        ctx
      )
    ).resolves.toBeNull()
    expect(checkoutIO.getOrderForm).not.toHaveBeenCalled()
    expect(response.set).not.toHaveBeenCalled()
  })

  it('savedCart == currentCart: returns it, no cookie, no mutation', async () => {
    const { ctx, checkoutIO, response } = mockContext({
      cookie: SAVED,
      store: { [SHOPPER_A]: SAVED },
    })

    await expect(run(ctx, 'COMBINE', SAVED)).resolves.toMatchObject({
      id: SAVED,
    })
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(response.set).not.toHaveBeenCalled()
  })
})

describe('replaceCart with an ANONYMOUS saved cart (never adopted)', () => {
  it.each(['REPLACE', 'ADD', 'COMBINE'])(
    '%s: adds only missing SKUs to the current cart (ADD semantics), no cookie, key re-pointed',
    async (strategy) => {
      const { ctx, checkoutIO, requestHub, response, vbaseData } = mockContext({
        store: { [SHOPPER_A]: OF_ANON },
        items: { [OF_ANON]: [item(1, 7), item(5, 2)], [OF_A]: [item(1, 1)] },
      })

      await expect(
        run(ctx, strategy as Strategy, OF_A, OF_ANON)
      ).resolves.toMatchObject({ id: OF_A })
      expect(response.set).not.toHaveBeenCalled()
      expect(requestHub.clearCart).not.toHaveBeenCalled()
      expect(checkoutIO.addToCart).toHaveBeenCalledWith(OF_A, [
        { ...item(5, 2), index: 1 },
      ])
      expect(vbaseData[SHOPPER_A]).toBe(OF_A)
    }
  )

  it('nothing missing: current returned unchanged, key re-pointed', async () => {
    const { ctx, checkoutIO, vbaseData } = mockContext({
      store: { [SHOPPER_A]: OF_ANON },
      items: { [OF_ANON]: [item(1, 1)], [OF_A]: [item(1, 3)] },
    })

    await expect(run(ctx, 'COMBINE', OF_A, OF_ANON)).resolves.toMatchObject({
      id: OF_A,
    })
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(vbaseData[SHOPPER_A]).toBe(OF_A)
  })

  it('anonymous saved cart + FOREIGN current cart: nothing happens', async () => {
    const { ctx, checkoutIO, response } = mockContext({
      cookie: OF_B,
      store: { [SHOPPER_A]: OF_ANON },
      items: { [OF_ANON]: [item(5, 2)] },
    })

    await expect(run(ctx, 'REPLACE', OF_B, OF_ANON)).resolves.toBeNull()
    expect(checkoutIO.getItems).not.toHaveBeenCalledWith(OF_B)
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(response.set).not.toHaveBeenCalled()
  })
})

describe('FR-D1 adoption identity check', () => {
  it('R1 gap: OWNED cart whose unmasked email is another shopper is not adopted (FOREIGN, email_mismatch)', async () => {
    const {
      ctx,
      response,
      checkoutIO,
      requestHub,
      vbaseData,
      logger,
    } = mockContext({
      store: { [SHOPPER_A]: OF_A_GUEST_B },
      items: { [OF_A_GUEST_B]: [item(5, 1)] },
    })

    await expect(run(ctx, 'COMBINE', OF_A, OF_A_GUEST_B)).resolves.toBeNull()
    expect(response.set).not.toHaveBeenCalled()
    expect(checkoutIO.getOrderForm).not.toHaveBeenCalled()
    expect(requestHub.clearCart).not.toHaveBeenCalled()
    expect(vbaseData[SHOPPER_A]).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.ownership_rejected',
      operation: 'replaceCart',
      verdict: 'FOREIGN',
      reason: 'email_mismatch',
    })
    expectNoIdentifiersLogged(logger)
  })

  it('email comparison is case-insensitive', async () => {
    const { ctx, response } = mockContext({
      store: { [SHOPPER_A]: SAVED },
      items: { [SAVED]: [item(5, 1)] },
    })

    await run(ctx, 'REPLACE')

    expect(response.set).toHaveBeenCalledWith('set-cookie', COOKIE)
  })

  it('masked email: adopted on userProfileId alone, residual risk logged', async () => {
    const { ctx, response, logger } = mockContext({
      store: { [SHOPPER_A]: OF_A_MASKED },
      items: { [OF_A_MASKED]: [item(5, 1)] },
    })

    await expect(
      run(ctx, 'REPLACE', OF_A, OF_A_MASKED)
    ).resolves.toMatchObject({ id: OF_A_MASKED })
    expect(response.set).toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.adoption_residual_risk',
      operation: 'replaceCart',
      reason: 'email_masked',
    })
    expectNoIdentifiersLogged(logger)
  })
})

describe('FR-D2 checkout cookie binding', () => {
  it.each([
    ['another cart in the cookie', OF_ANON],
    ['no checkout cookie', null],
  ])(
    'currentCart must be the cookie cart (%s): null, no lookups, no cookie',
    async (_label, cookie) => {
      const { ctx, vbase, checkoutRest, response, logger } = mockContext({
        cookie,
        store: { [SHOPPER_A]: SAVED },
      })

      await expect(run(ctx, 'REPLACE')).resolves.toBeNull()
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

describe('replaceCart rejections', () => {
  it.each([
    [OF_B, 'FOREIGN'],
    [OF_IDENTIFIED, 'UNVERIFIED_PROFILE'],
    [OF_CALL_CENTER, 'CALL_CENTER'],
    ['f'.repeat(32), 'NOT_FOUND'],
  ])(
    'contaminated stored reference %s (%s): key cleared, no cookie, saved cart never read nor written',
    async (stored, verdict) => {
      const {
        ctx,
        vbaseData,
        checkoutIO,
        requestHub,
        response,
        logger,
      } = mockContext({ store: { [SHOPPER_A]: stored } })

      await expect(run(ctx, 'REPLACE', OF_A, stored)).resolves.toBeNull()
      expect(vbaseData[SHOPPER_A]).toBeNull()
      expect(checkoutIO.getItems).not.toHaveBeenCalled()
      expect(checkoutIO.getOrderForm).not.toHaveBeenCalled()
      expect(requestHub.clearCart).not.toHaveBeenCalled()
      expect(response.set).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith({
        message: 'cross-device-cart.ownership_rejected',
        operation: 'replaceCart',
        verdict,
      })
    }
  )

  it('savedCart argument must equal the caller stored reference', async () => {
    const { ctx, checkoutRest, response } = mockContext({
      store: { [SHOPPER_A]: OF_ANON },
    })

    await expect(run(ctx, 'REPLACE')).resolves.toBeNull()
    expect(checkoutRest.getOrderFormOwner).not.toHaveBeenCalled()
    expect(response.set).not.toHaveBeenCalled()
  })

  it('no token: null and no side effects', async () => {
    const { ctx, vbase, response } = mockContext({ shopper: null })

    await expect(run(ctx, 'REPLACE')).resolves.toBeNull()
    expect(vbase.getJSON).not.toHaveBeenCalled()
    expect(response.set).not.toHaveBeenCalled()
  })
})

describe('missingItems', () => {
  it('returns saved SKUs absent from the current cart', () => {
    expect(
      missingItems([item(1, 1), item(2, 1)], [item(2, 3), item(3, 1)])
    ).toEqual([item(3, 1)])
  })
})

describe('FR-D2 duplicate checkout cookies in replaceCart', () => {
  it('two different copies, currentCart matches one: accepted with a cookie_conflict warning', async () => {
    const { ctx, logger } = mockContext({
      store: { [SHOPPER_A]: SAVED },
      items: { [SAVED]: [item(5, 1)], [OF_A]: [item(1, 1)] },
      rawCookieHeader: `checkout.vtex.com=__ofid=${OF_ANON}; checkout.vtex.com=__ofid=${OF_A}`,
    })

    await expect(run(ctx, 'REPLACE')).resolves.toMatchObject({ id: SAVED })
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.cookie_conflict',
      operation: 'replaceCart',
      reason: 'cookie_conflict',
    })
    expectNoIdentifiersLogged(logger)
  })

  it('no copy matches currentCart: cookie_mismatch', async () => {
    const { ctx, logger } = mockContext({
      store: { [SHOPPER_A]: SAVED },
      rawCookieHeader: `checkout.vtex.com=__ofid=${OF_ANON}; checkout.vtex.com=__ofid=${OF_B}`,
    })

    await expect(run(ctx, 'REPLACE')).resolves.toBeNull()
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.ownership_rejected',
      operation: 'replaceCart',
      verdict: 'COOKIE_MISMATCH',
      reason: 'cookie_mismatch',
    })
  })
})

describe('replaceCart: un-awaited Checkout reads inside the try', () => {
  const rejection = { response: { status: 503 }, message: 'checkout down' }

  const expectOneCheckoutError = (logger: any) => {
    const errors = logger.warn.mock.calls.filter(
      ([entry]: any) => entry?.message === 'cross-device-cart.checkout_error'
    )

    expect(errors).toEqual([
      [
        {
          message: 'cross-device-cart.checkout_error',
          operation: 'replaceCart',
          status: 503,
        },
      ],
    ])
    expectNoIdentifiersLogged(logger)
  }

  it('savedCart == currentCart and getOrderForm rejects: null, one checkout_error, nothing written', async () => {
    const {
      ctx,
      checkoutIO,
      requestHub,
      response,
      logger,
      vbaseData,
    } = mockContext({
      cookie: SAVED,
      store: { [SHOPPER_A]: SAVED },
    })

    checkoutIO.getOrderForm.mockRejectedValue(rejection)

    await expect(run(ctx, 'COMBINE', SAVED)).resolves.toBeNull()
    expectOneCheckoutError(logger)
    expect(response.set).not.toHaveBeenCalled()
    expect(requestHub.clearCart).not.toHaveBeenCalled()
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(vbaseData[SHOPPER_A]).toBe(SAVED)
  })

  it('empty saved cart and getOrderForm rejects: null, one checkout_error, no cookie, no cart writes', async () => {
    const { ctx, checkoutIO, requestHub, response, logger } = mockContext({
      store: { [SHOPPER_A]: SAVED },
      items: { [OF_A]: [item(1, 1)] },
    })

    checkoutIO.getOrderForm.mockRejectedValue(rejection)

    await expect(run(ctx, 'REPLACE')).resolves.toBeNull()
    expectOneCheckoutError(logger)
    expect(response.set).not.toHaveBeenCalled()
    expect(requestHub.clearCart).not.toHaveBeenCalled()
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
  })
})

describe('replaceCart: a failed ownership lookup of either cart never permits adoption', () => {
  const failOnly = (checkoutRest: any, failingId: string) => {
    const original = checkoutRest.getOrderFormOwner.getMockImplementation()

    checkoutRest.getOrderFormOwner.mockImplementation(async (id: string) => {
      if (id === failingId) {
        throw { response: { status: 503 }, message: 'lookup down' }
      }

      return original(id)
    })
  }

  const expectNothingHappened = (m: any) => {
    expect(m.response.set).not.toHaveBeenCalled()
    expect(m.requestHub.clearCart).not.toHaveBeenCalled()
    expect(m.checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(m.vbaseData[SHOPPER_A]).toBe(SAVED)
    expectNoIdentifiersLogged(m.logger)
  }

  it.each(['REPLACE', 'ADD', 'COMBINE'])(
    '%s: only the CURRENT cart lookup fails: null, no writes, no cookie, key unchanged',
    async (strategy) => {
      const m = mockContext({
        store: { [SHOPPER_A]: SAVED },
        items: { [SAVED]: [item(5, 2)], [OF_A]: [item(1, 1)] },
      })

      failOnly(m.checkoutRest, OF_A)

      await expect(run(m.ctx, strategy as Strategy)).resolves.toBeNull()
      expectNothingHappened(m)
    }
  )

  it('only the SAVED cart lookup fails: null, no writes, no cookie, key unchanged', async () => {
    const m = mockContext({
      store: { [SHOPPER_A]: SAVED },
      items: { [SAVED]: [item(5, 2)], [OF_A]: [item(1, 1)] },
    })

    failOnly(m.checkoutRest, SAVED)

    await expect(run(m.ctx, 'COMBINE')).resolves.toBeNull()
    expectNothingHappened(m)
  })
})

describe('replaceCart when the CURRENT cart does not exist (owner lookup 404)', () => {
  // A cart that does not exist cannot be a foreign cart or a call-center
  // session, so the OWNED saved cart is adopted as is (REPLACE semantics).
  it.each(['REPLACE', 'ADD', 'COMBINE'])(
    '%s: adopts the OWNED saved cart as is, never reads the current cart items, sets the cookie',
    async (strategy) => {
      const m = mockContext({
        store: { [SHOPPER_A]: SAVED },
        items: { [SAVED]: [item(5, 2)], [OF_A]: [item(1, 1)] },
      })

      const rest: any = m.checkoutRest
      const original = rest.getOrderFormOwner.getMockImplementation()

      rest.getOrderFormOwner.mockImplementation(async (id: string) =>
        id === OF_A ? null : original(id)
      )

      const result = await run(m.ctx, strategy as Strategy)

      expect(result).toMatchObject({ id: SAVED })
      expect(m.checkoutIO.getItems).not.toHaveBeenCalledWith(OF_A)
      expect(m.checkoutIO.getOrderForm).toHaveBeenCalledWith(SAVED)
      expect(m.requestHub.clearCart).not.toHaveBeenCalled()
      expect(m.checkoutIO.addToCart).not.toHaveBeenCalled()
      expect(m.response.set).toHaveBeenCalledWith('set-cookie', COOKIE)
      expect(m.vbaseData[SHOPPER_A]).toBe(SAVED)
      expectNoIdentifiersLogged(m.logger)
    }
  )
})
