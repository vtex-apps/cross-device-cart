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
    type: string
    name: string
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
          type: def.name.value,
          name: f.name.value,
          auth: f.directives?.find((d) => d.name.value === 'auth'),
          cache: f.directives?.find((d) => d.name.value === 'cacheControl'),
        })
      )
    }
  })

  return fields
}

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
      '@auth(scope: PRIVATE, productCode: "38", resourceCode: "topbar_visualizar")'
    )
  })
})

describe('graphql builder 2.x contract', () => {
  it('declares the graphql builder as 2.x', () => {
    expect(manifest.builders.graphql).toBe('2.x')
  })

  it('has @auth with a scope on every Query and Mutation field', () => {
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
      expect(argValue(f.auth as DirectiveNode, 'scope')).toBeDefined()
    })
  })

  it.each(['getSavedCart', 'getAppSettings', 'saveCurrentCart', 'replaceCart'])(
    '%s is PUBLIC (identity is validated by the resolver)',
    (name) => {
      const f = operationFields().find((x) => x.name === name)

      expect(argValue(f?.auth as DirectiveNode, 'scope')).toBe('PUBLIC')
      expect(
        (f?.auth as DirectiveNode).arguments?.map((a) => a.name.value)
      ).toEqual(['scope'])
    }
  )

  it('saveAppSettings is PRIVATE with productCode and resourceCode', () => {
    const f = operationFields().find((x) => x.name === 'saveAppSettings')
    const auth = f?.auth as DirectiveNode

    expect(argValue(auth, 'scope')).toBe('PRIVATE')
    expect(argValue(auth, 'productCode')).toBe('38')
    expect(argValue(auth, 'resourceCode')).toBe('topbar_visualizar')
  })

  it.each(['saveCurrentCart', 'replaceCart', 'saveAppSettings'])(
    '%s mutation uses a private, uncached response and keeps its @auth',
    (name) => {
      const f = operationFields().find((x) => x.name === name)

      expect(argValue(f?.cache as DirectiveNode, 'scope')).toBe('PRIVATE')
      expect(argValue(f?.cache as DirectiveNode, 'maxAge')).toBe('ZERO')
      expect(f?.auth).toBeDefined()
    }
  )

  it('getSavedCart is PRIVATE/ZERO and getAppSettings is PUBLIC/SHORT', () => {
    const fields = operationFields()
    const cache = (n: string) =>
      fields.find((x) => x.name === n)?.cache as DirectiveNode

    expect(argValue(cache('getSavedCart'), 'scope')).toBe('PRIVATE')
    expect(argValue(cache('getSavedCart'), 'maxAge')).toBe('ZERO')
    expect(argValue(cache('getAppSettings'), 'scope')).toBe('PUBLIC')
    expect(argValue(cache('getAppSettings'), 'maxAge')).toBe('SHORT')
  })

  it.each([
    'getSavedCart',
    'saveCurrentCart',
    'replaceCart',
    'saveAppSettings',
  ])('client document %s requests the private route', (name) => {
    expect(clientDocument(name)).toContain('@context(scope: "private")')
  })

  it('client document getAppSettings stays on the public route', () => {
    expect(clientDocument('getAppSettings')).not.toContain('@context')
  })

  it('builds an executable schema that accepts @auth(scope)', () => {
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
