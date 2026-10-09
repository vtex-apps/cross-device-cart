/* eslint-disable jest/no-expect-resolves */
import { isValidOrderFormId, resolveShopper } from '../utils/identity'
import {
  ACCOUNT,
  EMAIL_A,
  mockContext,
  SHOPPER_A,
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
  it('returns the VTEX ID id for a valid store token of this account', async () => {
    const { ctx } = mockContext({ shopper: SHOPPER_A })

    await expect(resolveShopper(ctx)).resolves.toEqual({
      userId: SHOPPER_A,
      email: EMAIL_A,
    })
  })

  it('returns null without calling VTEX ID when there is no token', async () => {
    const { ctx, vtexId } = mockContext({ shopper: null })

    await expect(resolveShopper(ctx)).resolves.toBeNull()
    expect(vtexId.validateToken).not.toHaveBeenCalled()
  })

  it.each([
    ['invalid token', null],
    [
      'other account',
      {
        authStatus: 'Success',
        id: SHOPPER_A,
        account: 'other',
        audience: 'webstore',
      },
    ],
    [
      'admin audience',
      {
        authStatus: 'Success',
        id: SHOPPER_A,
        account: ACCOUNT,
        audience: 'admin',
      },
    ],
    [
      'not Success',
      {
        authStatus: 'WrongCredentials',
        id: SHOPPER_A,
        account: ACCOUNT,
        audience: 'webstore',
      },
    ],
    [
      'missing id',
      { authStatus: 'Success', account: ACCOUNT, audience: 'webstore' },
    ],
  ])('returns null for %s', async (_label, credential) => {
    const { ctx, vtexId } = mockContext({ shopper: SHOPPER_A })

    vtexId.validateToken.mockResolvedValueOnce(credential as any)

    await expect(resolveShopper(ctx)).resolves.toBeNull()
  })

  it('fails closed and logs when VTEX ID is unavailable', async () => {
    const { ctx, vtexId, logger } = mockContext({ shopper: SHOPPER_A })

    vtexId.validateToken.mockRejectedValueOnce({ response: { status: 503 } })

    await expect(resolveShopper(ctx)).resolves.toBeNull()
    expect(logger.warn).toHaveBeenCalledWith({
      message: 'cross-device-cart.vtexid_unavailable',
      status: 503,
    })
  })
})
