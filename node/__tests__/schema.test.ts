import { readFileSync } from 'fs'
import { join } from 'path'

import { DirectiveNode, ObjectTypeDefinitionNode, parse } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'
import {
  Auth,
  authDirectiveTypeDefs,
} from '@vtex/api/lib/service/worker/runtime/graphql/schema/schemaDirectives/Auth'

const schema = readFileSync(
  join(__dirname, '..', '..', 'graphql', 'schema.graphql'),
  'utf8'
)

const types = readFileSync(
  join(__dirname, '..', '..', 'graphql', 'types', 'global.graphql'),
  'utf8'
)

const readDocument = (name: string) =>
  readFileSync(
    join(__dirname, '..', '..', 'react', 'graphql', `${name}.gql`),
    'utf8'
  )

/** Returns a field definition (arguments, return type and trailing directive lines). */
const field = (name: string) => {
  const match = schema.match(
    new RegExp(`${name}(\\([^)]*\\))?[^\\n]*((\\n\\s*@[^\\n]+)*)`)
  )

  if (!match) {
    throw new Error(`field ${name} not found in schema.graphql`)
  }

  return match[0]
}

const argValue = (directive: DirectiveNode, name: string) => {
  const arg = directive.arguments?.find((a) => a.name.value === name)

  return arg && 'value' in arg.value ? String(arg.value.value) : undefined
}

/** Every Query and Mutation field with its @auth directive, parsed from the SDL. */
const operationFields = () => {
  const fields: Array<{ name: string; auth?: DirectiveNode }> = []

  parse(schema).definitions.forEach((def) => {
    if (
      def.kind === 'ObjectTypeDefinition' &&
      ['Query', 'Mutation'].includes(def.name.value)
    ) {
      ;(def as ObjectTypeDefinitionNode).fields?.forEach((f) =>
        fields.push({
          name: f.name.value,
          auth: f.directives?.find((d) => d.name.value === 'auth'),
        })
      )
    }
  })

  return fields
}

const authOf = (name: string) => {
  const auth = operationFields().find((f) => f.name === name)?.auth

  if (!auth) {
    throw new Error(`field ${name} has no @auth directive`)
  }

  return auth
}

describe('graphql schema', () => {
  it('getSavedCart is private and identity args are optional', () => {
    expect(field('getSavedCart')).toMatch(
      /@cacheControl\(scope: PRIVATE, maxAge: ZERO\)/
    )
    expect(field('getSavedCart')).not.toMatch(/@cacheControl\(scope: PUBLIC/)
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
      '@auth(scope: PRIVATE, productCode: "38", resourceCode: "topbar_visualizar")'
    )
  })

  it('declares @auth with an explicit scope on every Query and Mutation field', () => {
    const fields = operationFields()

    expect(
      fields.map((f) => f.name).sort((a, b) => a.localeCompare(b))
    ).toEqual([
      'getAppSettings',
      'getSavedCart',
      'replaceCart',
      'saveAppSettings',
      'saveCurrentCart',
    ])
    fields.forEach((f) => {
      expect(f.auth).toBeDefined()
      expect(['PUBLIC', 'PRIVATE']).toContain(
        argValue(f.auth as DirectiveNode, 'scope')
      )
    })
  })

  it.each(['getSavedCart', 'getAppSettings', 'saveCurrentCart', 'replaceCart'])(
    '%s is PUBLIC (shopper-facing; identity is validated in the resolver)',
    (name) => {
      const auth = authOf(name)

      expect(argValue(auth, 'scope')).toBe('PUBLIC')
      expect(auth.arguments?.map((a) => a.name.value)).toEqual(['scope'])
    }
  )

  it('saveAppSettings is PRIVATE with productCode and resourceCode', () => {
    const auth = authOf('saveAppSettings')

    expect(argValue(auth, 'scope')).toBe('PRIVATE')
    expect(argValue(auth, 'productCode')).toBe('38')
    expect(argValue(auth, 'resourceCode')).toBe('topbar_visualizar')
  })

  it.each(['saveCurrentCart', 'replaceCart', 'saveAppSettings'])(
    'mutation %s uses a private, uncached response and keeps its @auth',
    (name) => {
      const definition = field(name)

      expect(definition).toContain(
        '@cacheControl(scope: PRIVATE, maxAge: ZERO)'
      )
      expect(definition).toMatch(/@auth\(scope: (PUBLIC|PRIVATE)/)
    }
  )

  it('keeps getSavedCart PRIVATE/ZERO and getAppSettings PUBLIC/SHORT', () => {
    expect(field('getSavedCart')).toContain(
      '@cacheControl(scope: PRIVATE, maxAge: ZERO)'
    )
    expect(field('getAppSettings')).toContain(
      '@cacheControl(scope: PUBLIC, maxAge: SHORT)'
    )
  })

  it.each([
    'getSavedCart',
    'saveCurrentCart',
    'replaceCart',
    'saveAppSettings',
  ])('client document %s requests the private route', (name) => {
    expect(readDocument(name)).toContain('@context(scope: "private")')
  })

  it('client document getAppSettings stays on the public route', () => {
    expect(readDocument('getAppSettings')).not.toContain('@context')
  })

  it('builds an executable schema, proving that @auth accepts `scope`', () => {
    // @cacheControl is declared by the builder at build time; strip it here
    const sdl = schema.replace(/@cacheControl\([^)]*\)/g, '')

    expect(() =>
      makeExecutableSchema({
        typeDefs: [authDirectiveTypeDefs, types, sdl],
        schemaDirectives: { auth: Auth },
        resolvers: {},
      })
    ).not.toThrow()
  })

  it('getAppSettings stays public for the storefront', () => {
    expect(schema).toMatch(
      /getAppSettings: CrossDeviceCartSettings\s*\n\s*@cacheControl\(scope: PUBLIC, maxAge: SHORT\)/
    )
  })
})
