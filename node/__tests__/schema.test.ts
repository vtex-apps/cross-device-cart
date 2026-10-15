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

describe('graphql schema', () => {
  it('keeps the legacy arguments optional so cached old bundles still validate', () => {
    for (const name of ['getSavedCart', 'saveCurrentCart']) {
      const definition = field(name)

      for (const arg of ['userId', 'userType', 'salesChannel']) {
        expect(definition).toContain(`${arg}: String`)
        expect(definition).not.toContain(`${arg}: String!`)
      }
    }

    expect(schema).toMatch(/replaceCart\([^)]*userType: String[^!]/)
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

    const scopeOf = (f: { auth?: DirectiveNode }) =>
      argValue(f.auth as DirectiveNode, 'scope')

    const admin = fields.find((f) => f.name === 'saveAppSettings')
    const shopper = fields.filter((f) => f.name !== 'saveAppSettings')

    expect(shopper.map(scopeOf)).toEqual(shopper.map(() => 'PUBLIC'))
    expect(scopeOf(admin as { auth?: DirectiveNode })).toBe('PRIVATE')
    expect(argValue(admin?.auth as DirectiveNode, 'productCode')).toBe('38')
    expect(argValue(admin?.auth as DirectiveNode, 'resourceCode')).toBe(
      'topbar_visualizar'
    )
  })

  it('getSavedCart and the mutations use a private, uncached response', () => {
    for (const name of [
      'getSavedCart',
      'saveCurrentCart',
      'replaceCart',
      'saveAppSettings',
    ]) {
      expect(field(name)).toContain(
        '@cacheControl(scope: PRIVATE, maxAge: ZERO)'
      )
    }
  })

  it('the client documents that need the shopper token request the private route', () => {
    for (const name of [
      'getSavedCart',
      'saveCurrentCart',
      'replaceCart',
      'saveAppSettings',
    ]) {
      expect(readDocument(name)).toContain('@context(scope: "private")')
    }

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
})
