/* eslint-disable jest/no-expect-resolves */
import { getSavedCart } from '../resolvers/getSavedCart'
import {
  expectNoIdentifiersLogged,
  item,
  mockContext,
  OF_A,
  OF_A_GUEST_B,
  OF_ANON,
  OF_B,
  OF_CALL_CENTER,
  OF_IDENTIFIED,
  SHOPPER_A,
} from '../testUtils/mockContext'

describe('getSavedCart', () => {
  it('returns the caller own reference', async () => {
    const { ctx } = mockContext({ store: { [SHOPPER_A]: OF_A } })

    await expect(getSavedCart({}, { nullOnEmpty: false }, ctx)).resolves.toBe(
      OF_A
    )
  })

  it('returns an anonymous reference saved by the caller', async () => {
    const { ctx } = mockContext({ store: { [SHOPPER_A]: OF_ANON } })

    await expect(getSavedCart({}, {}, ctx)).resolves.toBe(OF_ANON)
  })

  it('returns null and touches nothing without a token', async () => {
    const { ctx, vbase, checkoutRest, logger } = mockContext({
      shopper: null,
      store: { [SHOPPER_A]: OF_A },
    })

    await expect(
      getSavedCart({}, { userId: SHOPPER_A }, ctx)
    ).resolves.toBeNull()
    expect(vbase.getJSON).not.toHaveBeenCalled()
    expect(checkoutRest.getOrderFormOwner).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.unauthenticated',
      operation: 'getSavedCart',
      auth_result: 'no_token',
    })
  })

  it('logs auth_result ok on success, without ids', async () => {
    const { ctx, logger } = mockContext({ store: { [SHOPPER_A]: OF_A } })

    await getSavedCart({}, {}, ctx)
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.authenticated',
      operation: 'getSavedCart',
      auth_result: 'ok',
    })
    expectNoIdentifiersLogged(logger)
  })

  it('logs the failure value as auth_result for an invalid credential', async () => {
    const { ctx, vtexId, vbase, logger } = mockContext()

    vtexId.validateToken.mockResolvedValueOnce(null)

    await expect(getSavedCart({}, {}, ctx)).resolves.toBeNull()
    expect(vbase.getJSON).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.unauthenticated',
      operation: 'getSavedCart',
      auth_result: 'invalid',
    })
  })

  it('VTEX ID outage: throws (not null), warns vtexid_unavailable, never touches VBase', async () => {
    const { ctx, vtexId, vbase, vbaseData, logger } = mockContext({
      store: { [SHOPPER_A]: OF_A },
    })

    vtexId.validateToken.mockRejectedValueOnce({ response: { status: 503 } })

    await expect(getSavedCart({}, {}, ctx)).rejects.toThrow(
      'saved cart lookup unavailable'
    )
    expect(vbase.getJSON).not.toHaveBeenCalled()
    expect(vbase.saveJSON).not.toHaveBeenCalled()
    expect(vbaseData[SHOPPER_A]).toBe(OF_A)
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.vtexid_unavailable',
      operation: 'getSavedCart',
      auth_result: 'unavailable',
      status: 503,
    })
    expect(logger.info).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'cross-device-cart.unauthenticated' })
    )
    expectNoIdentifiersLogged(logger)
  })

  it('VBase read failure: throws (never null), logs vbase_error without ids', async () => {
    const { ctx, vbase, logger } = mockContext()

    vbase.getJSON.mockRejectedValueOnce({ response: { status: 500 } })

    await expect(getSavedCart({}, {}, ctx)).rejects.toThrow(
      'saved cart lookup unavailable'
    )
    expect(vbase.saveJSON).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.vbase_error',
      operation: 'getSavedCart',
      status: 500,
    })
    expectNoIdentifiersLogged(logger)
  })

  it('VBase write failure while clearing a foreign key: throws and logs vbase_error', async () => {
    const { ctx, vbase, logger } = mockContext({
      store: { [SHOPPER_A]: OF_B },
    })

    vbase.saveJSON.mockRejectedValueOnce(new Error('vbase down'))

    await expect(getSavedCart({}, {}, ctx)).rejects.toThrow(
      'saved cart lookup unavailable'
    )
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.vbase_error',
      operation: 'getSavedCart',
      status: null,
    })
    expectNoIdentifiersLogged(logger)
  })

  it('nullOnEmpty: a getItems failure throws the lookup error and logs checkout_error', async () => {
    const { ctx, checkoutIO, vbase, logger } = mockContext({
      store: { [SHOPPER_A]: OF_A },
    })

    checkoutIO.getItems.mockRejectedValueOnce({ response: { status: 502 } })

    await expect(getSavedCart({}, { nullOnEmpty: true }, ctx)).rejects.toThrow(
      'saved cart lookup unavailable'
    )
    expect(vbase.saveJSON).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.checkout_error',
      operation: 'getSavedCart',
      status: 502,
    })
    expectNoIdentifiersLogged(logger)
  })

  it.each([
    [OF_B, 'FOREIGN'],
    [OF_IDENTIFIED, 'UNVERIFIED_PROFILE'],
    [OF_CALL_CENTER, 'CALL_CENTER'],
    ['f'.repeat(32), 'NOT_FOUND'],
  ])(
    'shared-browser contamination: clears a key pointing to %s (%s)',
    async (orderFormId, verdict) => {
      const { ctx, vbaseData, logger } = mockContext({
        store: { [SHOPPER_A]: orderFormId },
      })

      await expect(getSavedCart({}, {}, ctx)).resolves.toBeNull()
      expect(vbaseData[SHOPPER_A]).toBeNull()
      expect(logger.warn).toHaveBeenCalledWith({
        message: 'cross-device-cart.ownership_rejected',
        operation: 'getSavedCart',
        verdict,
      })
      expectNoIdentifiersLogged(logger)
    }
  )

  it('FR-D1: clears a reference whose OWNED cart carries another unmasked email (email_mismatch)', async () => {
    const { ctx, vbaseData, logger } = mockContext({
      store: { [SHOPPER_A]: OF_A_GUEST_B },
    })

    await expect(getSavedCart({}, {}, ctx)).resolves.toBeNull()
    expect(vbaseData[SHOPPER_A]).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.ownership_rejected',
      operation: 'getSavedCart',
      verdict: 'FOREIGN',
      reason: 'email_mismatch',
    })
    expectNoIdentifiersLogged(logger)
  })

  it('transient Checkout failure: rejects with a GraphQL-visible error and keeps the key', async () => {
    const { ctx, vbaseData, vbase, checkoutRest } = mockContext({
      store: { [SHOPPER_A]: OF_A },
    })

    checkoutRest.getOrderFormOwner.mockRejectedValueOnce(new Error('503'))

    await expect(getSavedCart({}, {}, ctx)).rejects.toThrow(
      'saved cart lookup unavailable'
    )
    expect(vbaseData[SHOPPER_A]).toBe(OF_A)
    expect(vbase.saveJSON).not.toHaveBeenCalled()
  })

  it('nullOnEmpty: returns null for an own but empty cart', async () => {
    const { ctx } = mockContext({ store: { [SHOPPER_A]: OF_A } })

    await expect(
      getSavedCart({}, { nullOnEmpty: true }, ctx)
    ).resolves.toBeNull()
  })

  it('nullOnEmpty: returns the id for an own cart with items', async () => {
    const { ctx } = mockContext({
      store: { [SHOPPER_A]: OF_A },
      items: { [OF_A]: [item(1, 1)] },
    })

    await expect(getSavedCart({}, { nullOnEmpty: true }, ctx)).resolves.toBe(
      OF_A
    )
  })

  it('ignores a client userType of CALL_CENTER_OPERATOR (decided server-side)', async () => {
    const { ctx } = mockContext({ store: { [SHOPPER_A]: OF_A } })

    await expect(
      getSavedCart({}, { userType: 'CALL_CENTER_OPERATOR' }, ctx)
    ).resolves.toBe(OF_A)
  })
})
