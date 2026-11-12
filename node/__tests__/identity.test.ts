/* eslint-disable jest/no-expect-resolves */
import {
  isValidOrderFormId,
  resolveShopper,
  warnOnIdentityArgMismatch,
} from '../utils/identity'
import {
  ACCOUNT,
  EMAIL_A,
  mockContext,
  SHOPPER_A,
  SHOPPER_B,
} from '../testUtils/mockContext'

describe('isValidOrderFormId', () => {
  it.each([
    ['a'.repeat(32), true],
    ['A'.repeat(32), false],
    ['a'.repeat(31), false],
    [`../${'a'.repeat(29)}`, false],
    [null, false],
    [undefined, false],
    ['default-order-form', false],
  ])('%s -> %s', (id, expected) => {
    expect(isValidOrderFormId(id)).toBe(expected)
  })
})

describe('resolveShopper', () => {
  it('returns ok with the VTEX ID id for a valid store token of this account', async () => {
    const { ctx } = mockContext({ shopper: SHOPPER_A })

    await expect(resolveShopper(ctx)).resolves.toEqual({
      authResult: 'ok',
      shopper: { userId: SHOPPER_A, email: EMAIL_A },
    })
  })

  it('returns no_token without calling VTEX ID when there is no token', async () => {
    const { ctx, vtexId } = mockContext({ shopper: null })

    await expect(resolveShopper(ctx)).resolves.toEqual({
      authResult: 'no_token',
    })
    expect(vtexId.validateToken).not.toHaveBeenCalled()
  })

  it.each([
    ['invalid token', null, 'invalid'],
    [
      'other account',
      {
        authStatus: 'Success',
        id: SHOPPER_A,
        account: 'other',
        audience: 'webstore',
      },
      'account_mismatch',
    ],
    [
      'admin audience',
      {
        authStatus: 'Success',
        id: SHOPPER_A,
        account: ACCOUNT,
        audience: 'admin',
      },
      'audience_mismatch',
    ],
    [
      'not Success',
      {
        authStatus: 'WrongCredentials',
        id: SHOPPER_A,
        account: ACCOUNT,
        audience: 'webstore',
      },
      'invalid',
    ],
    [
      'missing id',
      { authStatus: 'Success', account: ACCOUNT, audience: 'webstore' },
      'invalid',
    ],
  ])('returns %s as %s', async (_label, credential, authResult) => {
    const { ctx, vtexId } = mockContext({ shopper: SHOPPER_A })

    vtexId.validateToken.mockResolvedValueOnce(credential as any)

    await expect(resolveShopper(ctx)).resolves.toEqual({ authResult })
  })

  it('returns unavailable (with the status) when VTEX ID fails, not "not logged in"', async () => {
    const { ctx, vtexId } = mockContext({ shopper: SHOPPER_A })

    vtexId.validateToken.mockRejectedValueOnce({ response: { status: 503 } })

    await expect(resolveShopper(ctx)).resolves.toEqual({
      authResult: 'unavailable',
      status: 503,
    })
  })

  it('returns unavailable with status null on a network error', async () => {
    const { ctx, vtexId } = mockContext({ shopper: SHOPPER_A })

    vtexId.validateToken.mockRejectedValueOnce(new Error('ETIMEDOUT'))

    await expect(resolveShopper(ctx)).resolves.toEqual({
      authResult: 'unavailable',
      status: null,
    })
  })
})

describe('warnOnIdentityArgMismatch', () => {
  const shopper = { userId: SHOPPER_A, email: EMAIL_A }

  it('warns exactly once, with only message and operation, when the argument is another id', () => {
    const { ctx, logger } = mockContext({ shopper: SHOPPER_A })

    expect(() =>
      warnOnIdentityArgMismatch(ctx, 'getSavedCart', SHOPPER_B, shopper)
    ).not.toThrow()
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.identity_arg_mismatch',
      operation: 'getSavedCart',
    })
  })

  it.each([
    ['matching', SHOPPER_A],
    ['matching with another case and spaces', ` ${SHOPPER_A.toUpperCase()} `],
    ['empty', ''],
    ['blank', '   '],
    ['absent', undefined],
    ['null', null],
  ])('does not warn when the argument is %s', (_name, arg) => {
    const { ctx, logger } = mockContext({ shopper: SHOPPER_A })

    warnOnIdentityArgMismatch(ctx, 'saveCurrentCart', arg, shopper)
    expect(logger.warn).not.toHaveBeenCalled()
  })
})
