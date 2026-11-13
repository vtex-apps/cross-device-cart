/* eslint-disable jest/no-expect-resolves, jest/no-mocks-import */
import type { ValidatedCredential } from '../clients/vtexId'
import {
  isValidOrderFormId,
  readCheckoutCookieOrderFormIds,
  resolveSalesChannel,
  resolveShopper,
  savedCartKey,
  warnOnIdentityArgMismatch,
} from '../utils/identity'
import {
  ACCOUNT,
  EMAIL_A,
  OF_A,
  SHOPPER_A,
  SHOPPER_B,
  TOKEN_A,
  createContext,
  credential,
  expectNoPiiInLogs,
} from '../__mocks__/testContext'

describe('resolveShopper', () => {
  it('returns no_token without calling VTEX ID when there is no store token', async () => {
    const { ctx, vtexId, logger } = createContext()

    await expect(resolveShopper(ctx, 'getSavedCart')).resolves.toEqual({
      authResult: 'no_token',
    })
    expect(vtexId.validateToken).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.unauthenticated',
      operation: 'getSavedCart',
      auth_result: 'no_token',
    })
  })

  it('returns the VTEX ID id for a valid store token of this account and logs auth_result ok', async () => {
    const { ctx, vtexId, logger } = createContext({ token: TOKEN_A })

    await expect(resolveShopper(ctx, 'getSavedCart')).resolves.toEqual({
      authResult: 'ok',
      shopper: { userId: SHOPPER_A, email: EMAIL_A },
    })
    expect(vtexId.validateToken).toHaveBeenCalledWith(TOKEN_A)
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.authenticated',
      operation: 'getSavedCart',
      auth_result: 'ok',
    })
    expectNoPiiInLogs(logger)
  })

  it.each<[string, ValidatedCredential | null, AuthFailure]>([
    ['an invalid token (401 -> null)', null, 'invalid'],
    [
      'another account',
      credential(SHOPPER_A, { account: 'otheraccount' }),
      'account_mismatch',
    ],
    [
      'an admin token',
      credential(SHOPPER_A, { audience: 'admin' }),
      'audience_mismatch',
    ],
    [
      'authStatus other than Success',
      credential(SHOPPER_A, { authStatus: 'WrongCredentials' }),
      'invalid',
    ],
    ['a missing id', credential(SHOPPER_A, { id: undefined }), 'invalid'],
    ['an empty id', credential(SHOPPER_A, { id: '' }), 'invalid'],
    [
      'a response with only the deprecated userId field',
      {
        authStatus: 'Success',
        account: ACCOUNT,
        audience: 'webstore',
        userId: SHOPPER_A,
      } as any,
      'invalid',
    ],
  ])('returns the failure for %s', async (_label, response, authResult) => {
    const { ctx, vtexId, logger } = createContext({ token: TOKEN_A })

    vtexId.validateToken.mockResolvedValueOnce(response)

    await expect(resolveShopper(ctx, 'replaceCart')).resolves.toEqual({
      authResult,
    })
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.unauthenticated',
      operation: 'replaceCart',
      auth_result: authResult,
    })
    expectNoPiiInLogs(logger)
  })

  it('reports unavailable (not invalid) and logs only operation and status when VTEX ID fails', async () => {
    const { ctx, vtexId, logger } = createContext({ token: TOKEN_A })

    vtexId.validateToken.mockRejectedValueOnce({ response: { status: 503 } })

    await expect(resolveShopper(ctx, 'saveCurrentCart')).resolves.toEqual({
      authResult: 'unavailable',
    })
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.vtexid_unavailable',
      operation: 'saveCurrentCart',
      auth_result: 'unavailable',
      status: 503,
    })
    expect(logger.info).not.toHaveBeenCalled()
    expectNoPiiInLogs(logger)
  })

  it('logs a null status when the VTEX ID failure has no HTTP response', async () => {
    const { ctx, vtexId, logger } = createContext({ token: TOKEN_A })

    vtexId.validateToken.mockRejectedValueOnce(new Error('ETIMEDOUT'))

    await expect(resolveShopper(ctx, 'getSavedCart')).resolves.toEqual({
      authResult: 'unavailable',
    })
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ status: null })
    )
  })
})

describe('readCheckoutCookieOrderFormId parsing', () => {
  const ID = 'a'.repeat(32)

  it.each([
    ['x__ofid prefix', `x__ofid=${ID}`, null],
    ['value longer than 32 chars', `__ofid=${ID}x`, null],
    ['value shorter than 32 chars', `__ofid=${'a'.repeat(31)}`, null],
    ['after another pair', `a=1&__ofid=${ID}`, ID],
    ['before another pair', `__ofid=${ID}&a=1`, ID],
    ['URL-encoded separator', `__ofid%3D${ID}`, ID],
    ['URL-encoded pair separator', `a%3D1%26__ofid%3D${ID}`, ID],
  ])('%s', (_label, raw, expected) => {
    const { ctx } = createContext({ checkoutCookieRaw: raw })

    expect(readCheckoutCookieOrderFormIds(ctx)[0] ?? null).toBe(expected)
  })
})

describe('resolveSalesChannel', () => {
  it('uses the segment channel', async () => {
    const { ctx } = createContext({ channel: 3 })

    await expect(resolveSalesChannel(ctx)).resolves.toBe('3')
  })

  it('falls back to "1" when the segment fails', async () => {
    const { ctx, segment } = createContext()

    segment.getSegment.mockRejectedValueOnce(new Error('segment down'))
    await expect(resolveSalesChannel(ctx)).resolves.toBe('1')
  })

  it('logs a PII-free warning when falling back because the segment failed', async () => {
    const { ctx, segment, logger } = createContext({ token: TOKEN_A })

    segment.getSegment.mockRejectedValueOnce(
      Object.assign(new Error('segment down'), { response: { status: 403 } })
    )
    await resolveSalesChannel(ctx)
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.segment_unavailable',
      status: 403,
    })
    expectNoPiiInLogs(logger)
  })

  it('falls back to "1" when the segment has no channel', async () => {
    const { ctx, segment } = createContext()

    segment.getSegment.mockResolvedValueOnce({} as any)
    await expect(resolveSalesChannel(ctx)).resolves.toBe('1')
  })
})

describe('savedCartKey', () => {
  it('keeps the legacy key format', () => {
    expect(savedCartKey(SHOPPER_A, '2')).toBe(`${SHOPPER_A}-sc:2`)
  })
})

describe('isValidOrderFormId', () => {
  it.each([
    [OF_A, true],
    ['default-order-form', false],
    ['../../pvt/x', false],
    ['A'.repeat(32), false],
    ['', false],
    [null, false],
    [undefined, false],
    [42, false],
  ])('%p -> %p', (value, expected) => {
    expect(isValidOrderFormId(value)).toBe(expected)
  })
})

describe('warnOnIdentityArgMismatch', () => {
  const shopper = { userId: SHOPPER_A }
  const warnings = (logger: { warn: jest.Mock }) => logger.warn.mock.calls

  it('warns once, with only the message and the operation, when the client userId differs', () => {
    const { ctx, logger } = createContext()

    expect(() =>
      warnOnIdentityArgMismatch(ctx, 'getSavedCart', SHOPPER_B, shopper)
    ).not.toThrow()
    expect(warnings(logger)).toEqual([
      [
        {
          message: 'cross-device-cart.identity_arg_mismatch',
          operation: 'getSavedCart',
        },
      ],
    ])
    expectNoPiiInLogs(logger)
  })

  it.each([
    ['the same id', SHOPPER_A],
    ['a case-only and padded difference', ` ${SHOPPER_A.toUpperCase()} `],
    ['an absent argument', undefined],
    ['a null argument', null],
    ['an empty argument', ''],
    ['a blank argument', '   '],
  ])('does not warn for %s', (_name, arg) => {
    const { ctx, logger } = createContext()

    warnOnIdentityArgMismatch(ctx, 'saveCurrentCart', arg, shopper)
    expect(warnings(logger)).toEqual([])
  })
})
