import { readFileSync } from 'fs'
import { join } from 'path'

const manifest = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'manifest.json'), 'utf8')
)

const allowed = (host: string, path: string) =>
  manifest.policies.some(
    (p: any) =>
      p.name === 'outbound-access' &&
      p.attrs?.host === host &&
      p.attrs?.path === path
  )

describe('manifest outbound-access policies', () => {
  // @vtex/api Segment (JanusClient): http://portal.vtexcommercestable.com.br/api/segments[/{token}]
  it.each(['/api/segments', '/api/segments/*'])(
    'allows the Segment client path %s',
    (path) => {
      expect(allowed('portal.vtexcommercestable.com.br', path)).toBe(true)
    }
  )

  it('allows the VTEX ID host used by the @auth directive', () => {
    expect(
      allowed('vtexid.vtex.com.br', '/api/vtexid/pub/authenticated/user')
    ).toBe(true)
  })

  it('has a valid semver version', () => {
    expect(manifest.version).toMatch(
      /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/
    )
  })

  it('declares the graphql builder 2.x (explicit @auth scopes)', () => {
    expect(manifest.builders.graphql).toBe('2.x')
  })
})
