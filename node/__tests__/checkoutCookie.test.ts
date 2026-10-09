import { readCheckoutCookieOrderFormIds } from '../utils/identity'

const ID = 'a'.repeat(32)
const ctxWith = (value?: string): any => ({
  cookies: { get: jest.fn(() => value) },
})

describe('readCheckoutCookieOrderFormIds', () => {
  it.each([
    [`__ofid=${ID}`, ID],
    [encodeURIComponent(`__ofid=${ID}`), ID],
    [`foo=bar&__ofid=${ID}`, ID],
    [undefined, null],
    ['__ofid=default-order-form', null],
    [`__ofid=${ID}x`, null],
    ['%E0%A4%A', null],
  ])('%s -> %s', (value, expected) => {
    expect(readCheckoutCookieOrderFormIds(ctxWith(value))).toEqual(
      expected ? [expected] : []
    )
  })

  it('reads the checkout.vtex.com cookie', () => {
    const ctx = ctxWith(`__ofid=${ID}`)

    readCheckoutCookieOrderFormIds(ctx)

    expect(ctx.cookies.get).toHaveBeenCalledWith('checkout.vtex.com')
  })
})
