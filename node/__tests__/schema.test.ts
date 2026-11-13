import { readFileSync } from 'fs'
import { join } from 'path'

import { DirectiveNode, parse, ObjectTypeDefinitionNode } from 'graphql'
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

const manifest = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'manifest.json'), 'utf8')
)

const argValue = (directive: DirectiveNode, name: string) => {
  const arg = directive.arguments?.find((a) => a.name.value === name)

  return arg && 'value' in arg.value ? String(arg.value.value) : undefined
}

const clientDocument = (name: string) =>
  readFileSync(
    join(__dirname, '..', '..', 'react', 'graphql', `${name}.gql`),
    'utf8'
  )

const operationFields = () => {
  const doc = parse(schema)
  const fields: Array<{
    name: string
    args: Array<{ name: string; required: boolean }>
    auth?: DirectiveNode
    cache?: DirectiveNode
  }> = []

  doc.definitions.forEach((def) => {
    if (
      def.kind === 'ObjectTypeDefinition' &&
      ['Query', 'Mutation'].includes(def.name.value)
    ) {
      ;(def as ObjectTypeDefinitionNode).fields?.forEach((f) =>
        fields.push({
          name: f.name.value,
          args: (f.arguments ?? []).map((a) => ({
            name: a.name.value,
            required: a.type.kind === 'NonNullType',
          })),
          auth: f.directives?.find((d) => d.name.value === 'auth'),
          cache: f.directives?.find((d) => d.name.value === 'cacheControl'),
        })
      )
    }
  })

  return fields
}

const fieldOf = (name: string) => {
  const f = operationFields().find((x) => x.name === name)

  if (!f) throw new Error(`missing field ${name}`)

  return f
}

describe('graphql/schema.graphql', () => {
  it('every Query and Mutation field has @auth with a scope (PRIVATE with codes only on saveAppSettings)', () => {
    const fields = operationFields()

    // counting the fields makes a new, unreviewed one fail this test
    expect(
      fields.map((f) => f.name).sort((a, b) => a.localeCompare(b))
    ).toEqual([
      'getAppSettings',
      'getSavedCart',
      'replaceCart',
      'saveAppSettings',
      'saveCurrentCart',
    ])

    const settings = fieldOf('saveAppSettings').auth as DirectiveNode

    expect(argValue(settings, 'scope')).toBe('PRIVATE')
    expect(argValue(settings, 'productCode')).toBe('38')
    expect(argValue(settings, 'resourceCode')).toBe('topbar_visualizar')

    fields
      .filter((f) => f.name !== 'saveAppSettings')
      .forEach((f) => {
        const auth = f.auth as DirectiveNode

        expect(argValue(auth, 'scope')).toBe('PUBLIC')
        expect(auth.arguments).toHaveLength(1)
      })
  })

  it('builds an executable schema, proving the @vtex/api directive accepts `scope`', () => {
    // @cacheControl is declared by the builder; strip it, keep only @auth
    const sdl = schema.replace(/@cacheControl\([^)]*\)/g, '')

    expect(() =>
      makeExecutableSchema({
        typeDefs: [authDirectiveTypeDefs, types, sdl],
        schemaDirectives: { auth: Auth },
        resolvers: {},
      })
    ).not.toThrow()
  })

  it('getSavedCart and the three mutations use a private, uncached response', () => {
    ;[
      'getSavedCart',
      'saveCurrentCart',
      'replaceCart',
      'saveAppSettings',
    ].forEach((name) => {
      const cache = fieldOf(name).cache as DirectiveNode

      expect(argValue(cache, 'scope')).toBe('PRIVATE')
      expect(argValue(cache, 'maxAge')).toBe('ZERO')
    })
  })

  it('client documents that need the shopper token request the private route; getAppSettings does not', () => {
    ;[
      'getSavedCart',
      'saveCurrentCart',
      'replaceCart',
      'saveAppSettings',
    ].forEach((name) => {
      expect(clientDocument(name)).toContain('@context(scope: "private")')
    })
    expect(clientDocument('getAppSettings')).not.toContain('@context')
  })

  it('keeps the deprecated identity arguments, optional, for cached old bundles', () => {
    ;['getSavedCart', 'saveCurrentCart'].forEach((name) => {
      const { args } = fieldOf(name)

      expect(args.map((a) => a.name)).toEqual(
        expect.arrayContaining(['userId', 'userType'])
      )
      args.forEach((a) => expect(a.required).toBe(false))
    })
  })
})

describe('manifest.json', () => {
  it('declares the outbound-access policy the @vtex/api @auth directive needs (VTEX ID authenticated/user, used by saveAppSettings)', () => {
    expect(manifest.policies).toContainEqual({
      name: 'outbound-access',
      attrs: {
        host: 'vtexid.vtex.com.br',
        path: '/api/vtexid/pub/authenticated/user',
      },
    })
  })
})
