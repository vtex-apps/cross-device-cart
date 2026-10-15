/* eslint-disable jest/no-expect-resolves, jest/no-mocks-import */
import { replaceCart } from '../resolvers/replaceCart'
import {
  OF_A,
  OF_ADDRESS_ONLY,
  OF_ANON,
  OF_B,
  OF_CALL_CENTER,
  OF_CURRENT_A,
  OF_IDENTIFIED,
  OF_MISSING,
  SHOPPER_A,
  TOKEN_A,
  createContext,
  expectNoPiiInLogs,
  item,
  key,
  setCheckoutCookie,
} from '../__mocks__/testContext'

const run = (ctx: Context, overrides: Partial<ReplaceCartVariables> = {}) => {
  const variables: ReplaceCartVariables = {
    savedCart: OF_A,
    currentCart: OF_CURRENT_A,
    strategy: 'COMBINE',
    ...overrides,
  }

  // The browser's checkout cookie holds its current cart (FR-D2).
  setCheckoutCookie(ctx, variables.currentCart)

  return replaceCart(undefined, variables, ctx)
}

const quantities = (orderForm: any) =>
  orderForm.items.map(({ id, quantity }: PartialItem) => [Number(id), quantity])

const adoptionCookie = (orderFormId: string) =>
  expect.stringContaining(
    `checkout.vtex.com=__ofid=${orderFormId}; Max-Age=15552000;`
  )

const setup = (extra: Parameters<typeof createContext>[0] = {}) =>
  createContext({
    token: TOKEN_A,
    vbase: { [key(SHOPPER_A)]: OF_A },
    items: {
      [OF_A]: [item(1, 2), item(2)],
      [OF_CURRENT_A]: [item(1, 1), item(3)],
    },
    ...extra,
  })

describe('replaceCart: adopting an OWNED saved cart', () => {
  it('COMBINE: merges current items into the own saved cart, then adopts it with the cookie', async () => {
    const {
      ctx,
      response,
      store,
      requestHub,
      checkoutIO,
      checkoutRest,
    } = setup()

    const result: any = await run(ctx)

    expect(result.id).toBe(OF_A)
    expect(quantities(result)).toEqual([
      [1, 3],
      [3, 1],
      [2, 1],
    ])
    expect(checkoutRest.removePaymentData).toHaveBeenCalledWith(OF_A)
    expect(requestHub.clearCart).toHaveBeenCalledWith(OF_A)
    expect(requestHub.clearCart).not.toHaveBeenCalledWith(OF_CURRENT_A)
    expect(checkoutIO.addToCart.mock.calls[0][0]).toBe(OF_A)
    expect(response.set).toHaveBeenCalledWith(
      'set-cookie',
      adoptionCookie(OF_A)
    )
    expect(store.get(key(SHOPPER_A))).toBe(OF_A)
  })

  it('ADD: union keeping current quantities, then adopts', async () => {
    const { ctx, response } = setup()

    const result: any = await run(ctx, { strategy: 'ADD' })

    expect(result.id).toBe(OF_A)
    expect(quantities(result)).toEqual([
      [1, 1],
      [3, 1],
      [2, 1],
    ])
    expect(response.set).toHaveBeenCalledWith(
      'set-cookie',
      adoptionCookie(OF_A)
    )
  })

  it('REPLACE: adopts the saved cart as is without reading current items', async () => {
    const { ctx, response, checkoutIO, requestHub, checkoutRest } = setup()

    const result: any = await run(ctx, { strategy: 'REPLACE' })

    expect(result.id).toBe(OF_A)
    expect(quantities(result)).toEqual([
      [1, 2],
      [2, 1],
    ])
    expect(checkoutIO.getItems).not.toHaveBeenCalledWith(OF_CURRENT_A)
    expect(requestHub.clearCart).not.toHaveBeenCalled()
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(checkoutRest.removePaymentData).toHaveBeenCalledWith(OF_A)
    expect(response.set).toHaveBeenCalledWith(
      'set-cookie',
      adoptionCookie(OF_A)
    )
  })

  it('shared browser: a FOREIGN current cart is never read or merged; own cart adopted as is', async () => {
    const { ctx, response, checkoutIO, requestHub, logger } = setup({
      items: { [OF_A]: [item(1, 2)], [OF_B]: [item(7)] },
    })

    const result: any = await run(ctx, { currentCart: OF_B })

    expect(result.id).toBe(OF_A)
    expect(quantities(result)).toEqual([[1, 2]])
    expect(checkoutIO.getItems).not.toHaveBeenCalledWith(OF_B)
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(requestHub.clearCart).not.toHaveBeenCalled()
    expect(response.set).toHaveBeenCalledWith(
      'set-cookie',
      adoptionCookie(OF_A)
    )
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.ownership_rejected',
      operation: 'replaceCart',
      verdict: 'FOREIGN',
    })
    expectNoPiiInLogs(logger)
  })

  it.each([
    ['addToCart', (m: any) => m.checkoutIO.addToCart, 'COMBINE'],
    ['clearCart', (m: any) => m.requestHub.clearCart, 'COMBINE'],
    [
      'removePaymentData',
      (m: any) => m.checkoutRest.removePaymentData,
      'REPLACE',
    ],
    ['getOrderForm', (m: any) => m.checkoutIO.getOrderForm, 'REPLACE'],
    ['getItems', (m: any) => m.checkoutIO.getItems, 'COMBINE'],
  ])(
    'a failing %s returns null, logs checkout_error without ids, and sets no cookie',
    async (_name, pick, strategy) => {
      const mocks = setup()
      const { ctx, response, logger } = mocks

      pick(mocks).mockRejectedValueOnce(
        Object.assign(new Error('checkout down'), { response: { status: 502 } })
      )

      await expect(
        run(ctx, { strategy: strategy as Strategy })
      ).resolves.toBeNull()
      expect(response.set).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith({
        message: 'cross-device-cart.checkout_error',
        operation: 'replaceCart',
        status: 502,
      })
      expectNoPiiInLogs(logger)
    }
  )

  it('checkout_error status is null when the failure has no HTTP response', async () => {
    const { ctx, checkoutIO, logger } = setup()

    checkoutIO.addToCart.mockRejectedValueOnce(new Error('boom'))
    await run(ctx)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'cross-device-cart.checkout_error',
        status: null,
      })
    )
  })

  it('empty own saved cart: nothing adopted, reference moves to current, no cookie', async () => {
    const { ctx, response, store, checkoutRest } = setup({
      items: { [OF_A]: [], [OF_CURRENT_A]: [item(3)] },
    })

    const result: any = await run(ctx)

    expect(result.id).toBe(OF_CURRENT_A)
    expect(response.set).not.toHaveBeenCalled()
    expect(checkoutRest.removePaymentData).not.toHaveBeenCalled()
    expect(store.get(key(SHOPPER_A))).toBe(OF_CURRENT_A)
  })

  it.each([
    ['FOREIGN', OF_B],
    ['UNVERIFIED_PROFILE', OF_IDENTIFIED],
    ['NOT_FOUND', OF_MISSING],
  ])(
    'empty own saved cart with a %s current cart: null, never the foreign orderForm',
    async (_verdict, currentCart) => {
      const { ctx, response, store, checkoutIO, checkoutRest } = setup({
        items: { [OF_A]: [], [OF_B]: [item(7)], [OF_IDENTIFIED]: [item(8)] },
      })

      await expect(run(ctx, { currentCart })).resolves.toBeNull()
      expect(checkoutIO.getOrderForm).not.toHaveBeenCalled()
      expect(checkoutIO.getItems).not.toHaveBeenCalledWith(currentCart)
      expect(checkoutIO.addToCart).not.toHaveBeenCalled()
      expect(checkoutRest.removePaymentData).not.toHaveBeenCalled()
      expect(response.set).not.toHaveBeenCalled()
      expect(store.get(key(SHOPPER_A))).toBe(OF_A)
    }
  )

  it('device already on the adopted cart (savedCart === currentCart): no-op, no cookie', async () => {
    const { ctx, response, checkoutIO, requestHub, checkoutRest } = setup({
      vbase: { [key(SHOPPER_A)]: OF_CURRENT_A },
    })

    const result: any = await run(ctx, { savedCart: OF_CURRENT_A })

    expect(result.id).toBe(OF_CURRENT_A)
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(requestHub.clearCart).not.toHaveBeenCalled()
    expect(checkoutRest.removePaymentData).not.toHaveBeenCalled()
    expect(response.set).not.toHaveBeenCalled()
  })
})

describe('replaceCart: ANONYMOUS saved cart', () => {
  it('is never adopted; its missing SKUs go into the current cart and the reference moves', async () => {
    const {
      ctx,
      response,
      store,
      checkoutIO,
      checkoutRest,
      requestHub,
    } = setup({
      vbase: { [key(SHOPPER_A)]: OF_ANON },
      items: {
        [OF_ANON]: [item(1, 5), item(9)],
        [OF_CURRENT_A]: [item(1, 1), item(3)],
      },
    })

    const result: any = await run(ctx, { savedCart: OF_ANON })

    expect(result.id).toBe(OF_CURRENT_A)
    expect(quantities(result)).toEqual([
      [1, 1],
      [3, 1],
      [9, 1],
    ])
    expect(checkoutIO.addToCart.mock.calls[0][0]).toBe(OF_CURRENT_A)
    expect(requestHub.clearCart).not.toHaveBeenCalled()
    expect(checkoutRest.removePaymentData).not.toHaveBeenCalled()
    expect(response.set).not.toHaveBeenCalled()
    expect(store.get(key(SHOPPER_A))).toBe(OF_CURRENT_A)
  })

  it('with a FOREIGN current cart: refused, nothing read or written, no cookie', async () => {
    const { ctx, response, checkoutIO } = setup({
      vbase: { [key(SHOPPER_A)]: OF_ANON },
      items: { [OF_ANON]: [item(9)], [OF_B]: [item(7)] },
    })

    await expect(
      run(ctx, { savedCart: OF_ANON, currentCart: OF_B })
    ).resolves.toBeNull()
    expect(checkoutIO.getItems).not.toHaveBeenCalledWith(OF_B)
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(response.set).not.toHaveBeenCalled()
  })
})

describe('replaceCart: refusals', () => {
  it('rejects a savedCart that is not the caller reference', async () => {
    const { ctx, checkoutRest, response } = setup()

    await expect(run(ctx, { savedCart: OF_B })).resolves.toBeNull()
    expect(checkoutRest.getOrderFormOwner).not.toHaveBeenCalled()
    expect(response.set).not.toHaveBeenCalled()
  })

  it.each([
    ['FOREIGN', OF_B],
    ['UNVERIFIED_PROFILE', OF_IDENTIFIED],
    ['UNVERIFIED_PROFILE (shipping address, no email)', OF_ADDRESS_ONLY],
  ])(
    'referenced %s saved cart: refused, key cleared, no cookie, no mutation',
    async (verdict, savedCart) => {
      const { ctx, store, checkoutIO, checkoutRest, response, logger } = setup({
        vbase: { [key(SHOPPER_A)]: savedCart },
      })

      await expect(run(ctx, { savedCart })).resolves.toBeNull()
      expect(store.get(key(SHOPPER_A))).toBeNull()
      expect(checkoutIO.getItems).not.toHaveBeenCalled()
      expect(checkoutRest.removePaymentData).not.toHaveBeenCalled()
      expect(response.set).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith({
        message: 'cross-device-cart.ownership_rejected',
        operation: 'replaceCart',
        verdict: verdict.split(' ')[0],
      })
      expectNoPiiInLogs(logger)
    }
  )

  it('keeps the key when the owner lookup fails', async () => {
    const { ctx, store, response } = setup({ ownerLookupStatus: 503 })

    await expect(run(ctx)).resolves.toBeNull()
    expect(store.get(key(SHOPPER_A))).toBe(OF_A)
    expect(response.set).not.toHaveBeenCalled()
  })

  it('call center: no-op decided from server data, ignoring client userType', async () => {
    const { ctx, checkoutIO, response } = setup()

    await expect(
      run(ctx, { currentCart: OF_CALL_CENTER, userType: 'STORE_USER' })
    ).resolves.toBeNull()
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(response.set).not.toHaveBeenCalled()
  })

  it('rejects malformed ids before any I/O', async () => {
    const { ctx, vbase } = setup()

    await expect(run(ctx, { savedCart: '../pvt' })).resolves.toBeNull()
    expect(vbase.getJSON).not.toHaveBeenCalled()
  })

  it('does nothing when unauthenticated', async () => {
    const { ctx, vbase, response } = setup({ token: undefined })

    await expect(run(ctx)).resolves.toBeNull()
    expect(vbase.getJSON).not.toHaveBeenCalled()
    expect(response.set).not.toHaveBeenCalled()
  })
})

describe('replaceCart: a failed owner lookup on either cart is a no-op', () => {
  it.each([
    ['current', 'REPLACE'],
    ['current', 'ADD'],
    ['current', 'COMBINE'],
    ['saved', 'REPLACE'],
    ['saved', 'ADD'],
    ['saved', 'COMBINE'],
  ] as const)(
    'only the %s lookup fails, strategy %s: null, no write, no cookie, key kept',
    async (which, strategy) => {
      const {
        ctx,
        store,
        response,
        logger,
        checkoutIO,
        checkoutRest,
        requestHub,
      } = setup({
        ownerLookupFailIds: [which === 'saved' ? OF_A : OF_CURRENT_A],
      })

      await expect(run(ctx, { strategy })).resolves.toBeNull()

      expect(checkoutRest.removePaymentData).not.toHaveBeenCalled()
      expect(requestHub.clearCart).not.toHaveBeenCalled()
      expect(checkoutIO.addToCart).not.toHaveBeenCalled()
      expect(checkoutIO.getOrderForm).not.toHaveBeenCalled()
      expect(response.set).not.toHaveBeenCalled()
      expect(store.get(key(SHOPPER_A))).toBe(OF_A)
      expectNoPiiInLogs(logger)
    }
  )
})

describe('replaceCart: Checkout failures after the checks are logged, not thrown', () => {
  const failGetOrderForm = (checkoutIO: { getOrderForm: jest.Mock }) =>
    checkoutIO.getOrderForm.mockImplementation(async () => {
      throw Object.assign(new Error('checkout down'), {
        response: { status: 503 },
      })
    })

  it.each([
    [
      'saved cart equals current cart',
      { savedCart: OF_A, currentCart: OF_A },
      {},
    ],
    [
      'saved cart is empty',
      {},
      { items: { [OF_A]: [], [OF_CURRENT_A]: [item(1)] } },
    ],
  ])('%s: getOrderForm rejects with 503', async (_name, vars, extra) => {
    const {
      ctx,
      logger,
      checkoutIO,
      response,
      requestHub,
      checkoutRest,
    } = setup(extra)

    failGetOrderForm(checkoutIO)

    await expect(run(ctx, vars)).resolves.toBeNull()

    const checkoutErrors = logger.warn.mock.calls.filter(
      ([entry]) => entry.message === 'cross-device-cart.checkout_error'
    )

    expect(checkoutErrors).toEqual([
      [
        {
          message: 'cross-device-cart.checkout_error',
          operation: 'replaceCart',
          status: 503,
        },
      ],
    ])
    expect(response.set).not.toHaveBeenCalled()
    expect(requestHub.clearCart).not.toHaveBeenCalled()
    expect(checkoutIO.addToCart).not.toHaveBeenCalled()
    expect(checkoutRest.removePaymentData).not.toHaveBeenCalled()
    expectNoPiiInLogs(logger)
  })
})

describe('replaceCart: the current cart does not exist (404)', () => {
  // A cart that does not exist cannot be foreign or a call-center session.
  it.each(['REPLACE', 'ADD', 'COMBINE'] as const)(
    '%s: adopts the OWNED saved cart as is, never reading the current items',
    async (strategy) => {
      const {
        ctx,
        response,
        checkoutIO,
        checkoutRest,
        requestHub,
        store,
      } = setup()

      const result: any = await run(ctx, {
        strategy,
        currentCart: OF_MISSING,
      })

      expect(result.id).toBe(OF_A)
      expect(quantities(result)).toEqual([
        [1, 2],
        [2, 1],
      ])
      expect(checkoutIO.getItems).not.toHaveBeenCalledWith(OF_MISSING)
      expect(checkoutIO.addToCart).not.toHaveBeenCalled()
      expect(requestHub.clearCart).not.toHaveBeenCalled()
      expect(checkoutRest.removePaymentData).toHaveBeenCalledWith(OF_A)
      expect(response.set).toHaveBeenCalledWith(
        'set-cookie',
        adoptionCookie(OF_A)
      )
      expect(store.get(key(SHOPPER_A))).toBe(OF_A)
    }
  )
})
