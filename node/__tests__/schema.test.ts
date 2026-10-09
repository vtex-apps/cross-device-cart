import { readFileSync } from 'fs'
import { join } from 'path'

const schema = readFileSync(
  join(__dirname, '..', '..', 'graphql', 'schema.graphql'),
  'utf8'
)

const manifest = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'manifest.json'), 'utf8')
)

const field = (name: string) => {
  const start = schema.indexOf(`${name}(`)
  const next = schema.indexOf('"""', start)

  return schema.slice(start, next === -1 ? undefined : next)
}

describe('graphql/schema.graphql', () => {
  it('getSavedCart is PRIVATE and identity args are optional', () => {
    expect(field('getSavedCart')).toContain('@cacheControl(scope: PRIVATE')
    expect(field('getSavedCart')).not.toContain('userId: String!')
  })

  it('saveCurrentCart identity arg is optional', () => {
    expect(field('saveCurrentCart')).not.toContain('userId: String!')
  })

  it('saveAppSettings requires admin access', () => {
    expect(field('saveAppSettings')).toContain(
      '@auth(productCode: "38", resourceCode: "topbar_visualizar")'
    )
  })
})

describe('manifest.json', () => {
  it('allows the @auth directive to reach VTEX ID', () => {
    expect(manifest.policies).toContainEqual({
      name: 'outbound-access',
      attrs: {
        host: 'vtexid.vtex.com.br',
        path: '/api/vtexid/pub/authenticated/user',
      },
    })
  })
})

describe('replaceCart docstring', () => {
  it('describes adoption of the own OWNED cart', () => {
    expect(schema).toContain("Adopts the caller's own saved cart")
    expect(schema).not.toContain('Never switches the active cart')
    expect(schema).not.toContain('getSavedCartResult')
  })
})
