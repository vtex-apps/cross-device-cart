import { readFileSync } from 'fs'
import { join } from 'path'

const schema = readFileSync(
  join(__dirname, '..', '..', 'graphql', 'schema.graphql'),
  'utf8'
)

/** Returns a field definition (arguments, return type and trailing directive lines). */
const field = (name: string) => {
  const match = schema.match(
    new RegExp(`${name}\\([^)]*\\)[^\\n]*((\\n\\s*@[^\\n]+)*)`)
  )

  if (!match) {
    throw new Error(`field ${name} not found in schema.graphql`)
  }

  return match[0]
}

describe('graphql schema', () => {
  it('getSavedCart is private and identity args are optional', () => {
    expect(field('getSavedCart')).toMatch(
      /@cacheControl\(scope: PRIVATE, maxAge: ZERO\)/
    )
    expect(field('getSavedCart')).not.toContain('PUBLIC')
    expect(field('getSavedCart')).not.toContain('userId: String!')
  })

  it('saveCurrentCart identity args are optional', () => {
    expect(field('saveCurrentCart')).not.toContain('userId: String!')
  })

  it('legacy identity arguments are still accepted for old bundles', () => {
    const getSaved = field('getSavedCart')

    for (const arg of [
      'userId: String',
      'userType: String',
      'salesChannel: String',
    ]) {
      expect(getSaved).toContain(arg)
    }

    const saved = field('saveCurrentCart')

    for (const arg of [
      'userId: String',
      'userType: String',
      'salesChannel: String',
    ]) {
      expect(saved).toContain(arg)
    }

    expect(schema).toMatch(/replaceCart\([^)]*userType: String[^!]/)
  })

  it('saveAppSettings requires an authorized admin', () => {
    expect(field('saveAppSettings')).toContain(
      '@auth(productCode: "38", resourceCode: "topbar_visualizar")'
    )
  })

  it('getAppSettings stays public for the storefront', () => {
    expect(schema).toMatch(
      /getAppSettings: CrossDeviceCartSettings\s*\n\s*@cacheControl\(scope: PUBLIC, maxAge: SHORT\)/
    )
  })
})
