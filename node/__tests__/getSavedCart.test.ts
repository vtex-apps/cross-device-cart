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
    })
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
