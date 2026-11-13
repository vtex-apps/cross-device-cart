/* eslint-disable jest/no-expect-resolves */
import { saveCurrentCart } from '../resolvers/saveCurrentCart'
import {
  expectNoIdentifiersLogged,
  mockContext,
  OF_A,
  OF_ANON,
  OF_B,
  OF_CALL_CENTER,
  OF_ADDRESS_ONLY,
  OF_CEP_ONLY,
  OF_IDENTIFIED,
  SHOPPER_A,
  SHOPPER_B,
} from '../testUtils/mockContext'

describe('saveCurrentCart', () => {
  it('saves an own orderForm under the caller key', async () => {
    const { ctx, vbaseData } = mockContext()

    await expect(saveCurrentCart({}, { orderFormId: OF_A }, ctx)).resolves.toBe(
      'success'
    )
    expect(vbaseData[SHOPPER_A]).toBe(OF_A)
  })

  it('saves an anonymous orderForm (filled before login)', async () => {
    const { ctx, vbaseData } = mockContext({ cookie: OF_ANON })

    await expect(
      saveCurrentCart({}, { orderFormId: OF_ANON }, ctx)
    ).resolves.toBe('success')
    expect(vbaseData[SHOPPER_A]).toBe(OF_ANON)
  })

  it('orderFormId null clears only the caller key', async () => {
    const { ctx, vbaseData } = mockContext({
      store: { [SHOPPER_A]: OF_A, [SHOPPER_B]: OF_B },
    })

    await expect(
      saveCurrentCart({}, { userId: SHOPPER_B, orderFormId: null }, ctx)
    ).resolves.toBe('success')
    expect(vbaseData[SHOPPER_A]).toBeNull()
    expect(vbaseData[SHOPPER_B]).toBe(OF_B)
  })

  it('shared browser: refuses an orderForm that holds another profile', async () => {
    const { ctx, vbase, logger } = mockContext({ cookie: OF_B })

    await expect(saveCurrentCart({}, { orderFormId: OF_B }, ctx)).resolves.toBe(
      'rejected'
    )
    expect(vbase.saveJSON).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.ownership_rejected',
      operation: 'saveCurrentCart',
      verdict: 'FOREIGN',
    })
    expectNoIdentifiersLogged(logger)
  })

  it('refuses an identified-but-not-owned orderForm', async () => {
    const { ctx, vbase } = mockContext({ cookie: OF_IDENTIFIED })

    await expect(
      saveCurrentCart({}, { orderFormId: OF_IDENTIFIED }, ctx)
    ).resolves.toBe('rejected')
    expect(vbase.saveJSON).not.toHaveBeenCalled()
  })

  it('refuses an anonymous orderForm that has an identifying shipping address', async () => {
    const { ctx, vbase } = mockContext({ cookie: OF_ADDRESS_ONLY })

    await expect(
      saveCurrentCart({}, { orderFormId: OF_ADDRESS_ONLY }, ctx)
    ).resolves.toBe('rejected')
    expect(vbase.saveJSON).not.toHaveBeenCalled()
  })

  it('saves a cart that only has a postal code (shipping simulator)', async () => {
    const { ctx, vbaseData } = mockContext({ cookie: OF_CEP_ONLY })

    await expect(
      saveCurrentCart({}, { orderFormId: OF_CEP_ONLY }, ctx)
    ).resolves.toBe('success')
    expect(vbaseData[SHOPPER_A]).toBe(OF_CEP_ONLY)
  })

  it('call center: no-op even when the client claims STORE_USER', async () => {
    const { ctx, vbase } = mockContext({ cookie: OF_CALL_CENTER })

    await expect(
      saveCurrentCart(
        {},
        { orderFormId: OF_CALL_CENTER, userType: 'STORE_USER' },
        ctx
      )
    ).resolves.toBe('Not saved is call center operator')
    expect(vbase.saveJSON).not.toHaveBeenCalled()
  })

  it('rejects malformed ids before any HTTP call', async () => {
    const { ctx, checkoutRest } = mockContext()

    await expect(
      saveCurrentCart({}, { orderFormId: 'default-order-form' }, ctx)
    ).resolves.toBe('rejected')
    expect(checkoutRest.getOrderFormOwner).not.toHaveBeenCalled()
  })

  it.each([
    ['another cart in the cookie', OF_ANON],
    ['no checkout cookie', null],
  ])(
    'FR-D2: rejects an orderFormId that is not the browser cookie cart (%s)',
    async (_label, cookie) => {
      const { ctx, vbase, checkoutRest, logger } = mockContext({ cookie })

      await expect(
        saveCurrentCart({}, { orderFormId: OF_A }, ctx)
      ).resolves.toBe('rejected')
      expect(vbase.saveJSON).not.toHaveBeenCalled()
      expect(checkoutRest.getOrderFormOwner).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith({
        message: 'cross-device-cart.ownership_rejected',
        operation: 'saveCurrentCart',
        verdict: 'COOKIE_MISMATCH',
        reason: 'cookie_mismatch',
      })
      expectNoIdentifiersLogged(logger)
    }
  )

  it('no token: no write', async () => {
    const { ctx, vbase, logger } = mockContext({ shopper: null })

    await expect(
      saveCurrentCart({}, { userId: SHOPPER_A, orderFormId: OF_A }, ctx)
    ).resolves.toBe('unauthenticated')
    expect(vbase.saveJSON).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.unauthenticated',
      operation: 'saveCurrentCart',
      auth_result: 'no_token',
    })
  })

  it('invalid credential: unauthenticated, no write', async () => {
    const { ctx, vtexId, vbase } = mockContext()

    vtexId.validateToken.mockResolvedValueOnce(null)

    await expect(saveCurrentCart({}, { orderFormId: OF_A }, ctx)).resolves.toBe(
      'unauthenticated'
    )
    expect(vbase.saveJSON).not.toHaveBeenCalled()
  })

  it.each([[OF_A], [null]])(
    'VTEX ID outage (orderFormId %s): rejected, no write, vtexid_unavailable warning',
    async (orderFormId) => {
      const { ctx, vtexId, vbase, logger } = mockContext()

      vtexId.validateToken.mockRejectedValueOnce({ response: { status: 504 } })

      await expect(saveCurrentCart({}, { orderFormId }, ctx)).resolves.toBe(
        'rejected'
      )
      expect(vbase.saveJSON).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith({
        message: 'cross-device-cart.vtexid_unavailable',
        operation: 'saveCurrentCart',
        auth_result: 'unavailable',
        status: 504,
      })
      expectNoIdentifiersLogged(logger)
    }
  )

  it('logs auth_result ok on success', async () => {
    const { ctx, logger } = mockContext()

    await saveCurrentCart({}, { orderFormId: OF_A }, ctx)
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.authenticated',
      operation: 'saveCurrentCart',
      auth_result: 'ok',
    })
  })

  it.each([[OF_A], [null]])(
    'VBase write failure (orderFormId %s): rejected, vbase_error without ids',
    async (orderFormId) => {
      const { ctx, vbase, logger } = mockContext()

      vbase.saveJSON.mockRejectedValueOnce({ response: { status: 500 } })

      await expect(saveCurrentCart({}, { orderFormId }, ctx)).resolves.toBe(
        'rejected'
      )
      expect(logger.warn).toHaveBeenCalledWith({
        message: 'cross-device-cart.vbase_error',
        operation: 'saveCurrentCart',
        status: 500,
      })
      expectNoIdentifiersLogged(logger)
    }
  )
})

describe('FR-D2 duplicate checkout cookies', () => {
  const copy = (id: string) => `checkout.vtex.com=__ofid=${id}`

  it('two different copies, client id matches one: accepted and a PII-free cookie_conflict warning', async () => {
    const { ctx, vbaseData, logger } = mockContext({
      rawCookieHeader: `${copy(OF_ANON)}; ${copy(OF_A)}`,
    })

    await expect(saveCurrentCart({}, { orderFormId: OF_A }, ctx)).resolves.toBe(
      'success'
    )
    expect(vbaseData[SHOPPER_A]).toBe(OF_A)
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.cookie_conflict',
      operation: 'saveCurrentCart',
      reason: 'cookie_conflict',
    })
    expectNoIdentifiersLogged(logger)
  })

  it('no copy matches: cookie_mismatch', async () => {
    const { ctx, vbase, logger } = mockContext({
      rawCookieHeader: `${copy(OF_ANON)}; ${copy(OF_B)}`,
    })

    await expect(saveCurrentCart({}, { orderFormId: OF_A }, ctx)).resolves.toBe(
      'rejected'
    )
    expect(vbase.saveJSON).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.ownership_rejected',
      operation: 'saveCurrentCart',
      verdict: 'COOKIE_MISMATCH',
      reason: 'cookie_mismatch',
    })
  })

  it('encoded and plain copy of the same id: accepted, no conflict log', async () => {
    const { ctx, logger } = mockContext({
      rawCookieHeader: `checkout.vtex.com=${encodeURIComponent(
        `__ofid=${OF_A}`
      )}; ${copy(OF_A)}`,
    })

    await expect(saveCurrentCart({}, { orderFormId: OF_A }, ctx)).resolves.toBe(
      'success'
    )
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('an empty stale copy next to a valid one: accepted', async () => {
    const { ctx } = mockContext({
      rawCookieHeader: `checkout.vtex.com=; ${copy(OF_A)}`,
    })

    await expect(saveCurrentCart({}, { orderFormId: OF_A }, ctx)).resolves.toBe(
      'success'
    )
  })
})
