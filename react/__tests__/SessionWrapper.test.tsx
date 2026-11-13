/* eslint-disable global-require, @typescript-eslint/no-var-requires */
import React from 'react'
import { render } from '@vtex/test-tools/react'

import { SessionWrapper } from '../components/SessionWrapper'

const mockMount = jest.fn()
const mockUnmount = jest.fn()
const mockQueryResult = {
  data: { settings: { isAutomatic: true, strategy: 'COMBINE' } },
}

let mockProfileId = 'profile-a'

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
    useOrderForm: () => ({ loading: false, orderForm: { id: 'x', items: [] } }),
  }),
  { virtual: true }
)
jest.mock(
  'vtex.styleguide',
  () => ({
    ToastConsumer: ({ children }: any) => children({ showToast: jest.fn() }),
  }),
  { virtual: true }
)
jest.mock('react-apollo', () => ({ useQuery: () => mockQueryResult }))
jest.mock('../components/CrossCart', () => {
  const { useEffect } = require('react')

  return {
    CrossCart: () => {
      useEffect(() => {
        mockMount()

        return () => mockUnmount()
      }, [])

      return null
    },
  }
})

describe('SessionWrapper', () => {
  beforeEach(() => {
    mockMount.mockClear()
    mockUnmount.mockClear()
    mockProfileId = 'profile-a'
  })

  it('remounts the block when the session profile changes, and not otherwise', () => {
    const { rerender } = render(<SessionWrapper />)

    expect(mockMount).toHaveBeenCalledTimes(1)

    rerender(<SessionWrapper />)
    expect(mockMount).toHaveBeenCalledTimes(1)
    expect(mockUnmount).not.toHaveBeenCalled()

    mockProfileId = 'profile-b'
    rerender(<SessionWrapper />)
    expect(mockUnmount).toHaveBeenCalledTimes(1)
    expect(mockMount).toHaveBeenCalledTimes(2)
  })
})
