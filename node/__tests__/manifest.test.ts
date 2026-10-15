import { readFileSync } from 'fs'
import { join } from 'path'

const manifest = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'manifest.json'), 'utf8')
)

const allowed = (host: string, path: string) =>
  manifest.policies.some(
    (p: { name: string; attrs?: { host?: string; path?: string } }) =>
      p.name === 'outbound-access' &&
      p.attrs?.host === host &&
      p.attrs?.path === path
  )

// A missing outbound-access policy only fails at runtime, silently.
describe('manifest outbound-access policies', () => {
  it.each([
    // @vtex/api Segment client (JanusClient)
    ['portal.vtexcommercestable.com.br', '/api/segments'],
    ['portal.vtexcommercestable.com.br', '/api/segments/*'],
    // Checkout, and VTEX ID credential/validate (POST on
    // {account}.vtexcommercestable.com.br, covered by the /api/* policy)
    ['portal.vtexcommercestable.com.br', '/api/checkout/pub/*'],
    ['{{account}}.vtexcommercestable.com.br', '/api/*'],
  ])('declares %s%s', (host, path) => {
    expect(allowed(host, path)).toBe(true)
  })
})
