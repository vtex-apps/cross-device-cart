/* eslint-disable @typescript-eslint/require-array-sort-compare */
/**
 * FR-D2 through real cookie parsing: the `cookies` package is what Koa's
 * `ctx.cookies` uses, fed with a raw `Cookie` request header.
 */
import Cookies from 'cookies'

import { readCheckoutCookieOrderFormIds } from '../utils/identity'

const ID = 'a'.repeat(32)
const OTHER = 'b'.repeat(32)

const ctxFromHeader = (cookieHeader?: string): any => {
  const headers: Record<string, string> = cookieHeader
    ? { cookie: cookieHeader }
    : {}

  const req: any = { headers }
  const res: any = { getHeader: () => undefined, setHeader: () => undefined }

  return { req, cookies: new Cookies(req, res) }
}

describe('readCheckoutCookieOrderFormIds with a raw Cookie header (Koa cookie parsing)', () => {
  it.each([
    ['plain __ofid', `checkout.vtex.com=__ofid=${ID}`, ID],
    [
      'url-encoded value',
      `checkout.vtex.com=${encodeURIComponent(`__ofid=${ID}`)}`,
      ID,
    ],
    ['__ofid after another key', `checkout.vtex.com=foo=bar&__ofid=${ID}`, ID],
    [
      'among unrelated cookies',
      `a=1; checkout.vtex.com=__ofid=${ID}; VtexIdclientAutCookie_x=t`,
      ID,
    ],
    [
      'cookie with a similar name only',
      `x_checkout.vtex.com=__ofid=${ID}`,
      null,
    ],
    ['no cookie header', undefined, null],
    ['malformed __ofid', 'checkout.vtex.com=__ofid=default-order-form', null],
  ])('%s', (_label, header, expected) => {
    expect(readCheckoutCookieOrderFormIds(ctxFromHeader(header))).toEqual(
      expected ? [expected] : []
    )
  })

  it('the same cookie sent twice with the same value yields one id (Domain/host-only duplicates)', () => {
    const header = `checkout.vtex.com=__ofid=${ID}; checkout.vtex.com=__ofid=${ID}`

    expect(readCheckoutCookieOrderFormIds(ctxFromHeader(header))).toEqual([ID])
  })

  it('an encoded and a plain copy of the same id count as one id', () => {
    const header = `checkout.vtex.com=__ofid=${ID}; checkout.vtex.com=${encodeURIComponent(
      `__ofid=${ID}`
    )}`

    expect(readCheckoutCookieOrderFormIds(ctxFromHeader(header))).toEqual([ID])
  })

  it('returns every distinct id when copies differ, in either order', () => {
    const header = `checkout.vtex.com=__ofid=${ID}; checkout.vtex.com=__ofid=${OTHER}`

    expect(
      readCheckoutCookieOrderFormIds(ctxFromHeader(header)).sort()
    ).toEqual([ID, OTHER])
    expect(
      readCheckoutCookieOrderFormIds(
        ctxFromHeader(header.split('; ').reverse().join('; '))
      ).sort()
    ).toEqual([ID, OTHER])
  })

  it('drops an empty or invalid stale copy and keeps the valid one', () => {
    expect(
      readCheckoutCookieOrderFormIds(
        ctxFromHeader(`checkout.vtex.com=; checkout.vtex.com=__ofid=${ID}`)
      )
    ).toEqual([ID])
    expect(
      readCheckoutCookieOrderFormIds(
        ctxFromHeader(
          `checkout.vtex.com=__ofid=default-order-form; checkout.vtex.com=__ofid=${ID}`
        )
      )
    ).toEqual([ID])
  })
})
