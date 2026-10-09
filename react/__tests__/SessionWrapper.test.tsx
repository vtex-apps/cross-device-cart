/* eslint-disable @typescript-eslint/no-var-requires, global-require, @typescript-eslint/require-array-sort-compare, react-hooks/exhaustive-deps */
import React from 'react'
import { render } from '@testing-library/react'

import { SessionWrapper } from '../components/SessionWrapper'

const mockMounts: string[] = []
let mockProfileId = 'profile-1'

jest.mock('../components/CrossCart', () => {
  const { useEffect } = require('react')

  return {
    CrossCart: (props: Record<string, unknown>) => {
      useEffect(() => {
        mockMounts.push(JSON.stringify(Object.keys(props).sort()))
      }, [])

      return null
    },
  }
})
jest.mock(
  'vtex.session-client',
  () => ({
    useRenderSession: () => ({
      loading: false,
      error: undefined,
      session: {
        namespaces: {
          profile: {
            isAuthenticated: { value: 'true' },
            id: { value: mockProfileId },
          },
        },
      },
    }),
  }),
  { virtual: true }
)
jest.mock(
  'vtex.order-manager/OrderForm',
  () => ({
    useOrderForm: () => ({
      loading: false,
      orderForm: { userType: 'CALL_CENTER_OPERATOR' },
    }),
  }),
  { virtual: true }
)
jest.mock(
  'vtex.styleguide',
  () => ({
    ToastConsumer: ({ children }: any) => children({ showToast: () => {} }),
  }),
  { virtual: true }
)

// Stable object: a new one per render would loop SessionWrapper's settings effect.
const mockSettingsResult = {
  data: { settings: { isAutomatic: true, strategy: 'REPLACE' } },
}

jest.mock('react-apollo', () => ({ useQuery: () => mockSettingsResult }))

test('passes no identity props and remounts CrossCart when the profile changes', () => {
  const { rerender } = render(<SessionWrapper />)

  mockProfileId = 'profile-2'
  rerender(<SessionWrapper />)

  expect(mockMounts).toHaveLength(2)
  expect(mockMounts[0]).toBe(
    JSON.stringify(['isAutomatic', 'showToast', 'strategy'])
  )
})
