/* eslint-disable react/display-name */
import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import axios from 'axios'

import { CrossCart } from '../components/CrossCart'

const CURRENT = 'c'.repeat(32)
const SAVED = 'a'.repeat(32)

const mockSetOrderForm = jest.fn()
const mockGetSavedCart = jest.fn()
const mockSaveCurrentCart = jest
  .fn()
  .mockResolvedValue({ data: { saveCurrentCart: 'success' } })

const mockReplaceCart = jest.fn()
const mockShowToast = jest.fn()
let mockLazyState: {
  data?: { id: string | null }
  error?: Error
  loading: boolean
} = { loading: false }

jest.mock(
  'vtex.render-runtime',
  () => ({ useRuntime: () => ({ rootPath: '' }) }),
  { virtual: true }
)
jest.mock(
  'vtex.order-manager/OrderForm',
  () => ({
    useOrderForm: () => ({
      orderForm: { id: 'c'.repeat(32), items: [{ id: '2' }] },
      initialFetchComplete: true,
      setOrderForm: mockSetOrderForm,
    }),
  }),
  { virtual: true }
)
jest.mock(
  'vtex.device-detector',
  () => ({ useDevice: () => ({ device: 'desktop' }) }),
  { virtual: true }
)
jest.mock('vtex.css-handles', () => ({ useCssHandles: () => ({}) }), {
  virtual: true,
})
jest.mock(
  'vtex.styleguide',
  () => ({
    Button: ({ onClick }: { onClick: () => void }) => (
      <button onClick={onClick}>accept</button>
    ),
    ButtonWithIcon: ({ onClick }: { onClick: () => void }) => (
      <button onClick={onClick}>decline</button>
    ),
    IconClose: () => null,
  }),
  { virtual: true }
)
jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
  FormattedMessage: () => null,
}))
jest.mock('axios')

const mockOpName = (doc: any) => doc.definitions[0].name.value

jest.mock('react-apollo', () => ({
  useLazyQuery: () => [mockGetSavedCart, mockLazyState],
  useMutation: (doc: unknown) => {
    if (mockOpName(doc) === 'saveCurrentCart') return [mockSaveCurrentCart]
    if (mockOpName(doc) === 'replaceCart')
      return [mockReplaceCart, { loading: false }]
    throw new Error('unexpected mutation')
  },
}))

const renderBlock = (isAutomatic = true) =>
  render(
    <CrossCart
      isAutomatic={isAutomatic}
      strategy="REPLACE"
      showToast={mockShowToast}
    />
  )

beforeEach(() => {
  jest.clearAllMocks()
  mockLazyState = { loading: false }
  ;(axios.post as jest.Mock).mockResolvedValue({})
  mockReplaceCart.mockResolvedValue({
    data: { newOrderForm: { id: SAVED, items: [{ id: '1' }] } },
  })
})

test('does not send client identity to getSavedCart', () => {
  renderBlock()

  const vars = mockGetSavedCart.mock.calls[0][0].variables

  expect(vars).not.toHaveProperty('userId')
  expect(vars).not.toHaveProperty('userType')
})

test('does not send client identity to saveCurrentCart', async () => {
  mockLazyState = { loading: false, data: { id: null } }
  renderBlock()

  await waitFor(() => expect(mockSaveCurrentCart).toHaveBeenCalled())
  expect(mockSaveCurrentCart.mock.calls[0][0].variables).toEqual({
    orderFormId: CURRENT,
  })
})

test('adopts the saved cart only when the server returned it (validated OWNED)', async () => {
  mockLazyState = { loading: false, data: { id: SAVED } }
  renderBlock()

  await waitFor(() =>
    expect(mockSetOrderForm).toHaveBeenCalledWith({
      id: SAVED,
      items: [{ id: '1' }],
    })
  )
  expect(mockReplaceCart.mock.calls[0][0].variables).toEqual({
    currentCart: CURRENT,
    savedCart: SAVED,
    strategy: 'REPLACE',
  })
  expect(axios.post).toHaveBeenCalledWith(
    `/api/checkout/pub/orderForm/${SAVED}`,
    {}
  )
})

test('does not touch the saved orderForm when the server merged into the current cart (anonymous saved cart)', async () => {
  mockLazyState = { loading: false, data: { id: SAVED } }
  mockReplaceCart.mockResolvedValue({
    data: { newOrderForm: { id: CURRENT, items: [{ id: '1' }] } },
  })
  renderBlock()

  await waitFor(() =>
    expect(mockSetOrderForm).toHaveBeenCalledWith({
      id: CURRENT,
      items: [{ id: '1' }],
    })
  )
  expect(axios.post).not.toHaveBeenCalled()
})

test('automatic mode: a refused merge is silent', async () => {
  mockLazyState = { loading: false, data: { id: SAVED } }
  mockReplaceCart.mockResolvedValue({ data: { newOrderForm: null } })
  renderBlock(true)

  await waitFor(() => expect(mockReplaceCart).toHaveBeenCalled())
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(mockShowToast).not.toHaveBeenCalled()
  expect(mockSetOrderForm).not.toHaveBeenCalled()
  expect(axios.post).not.toHaveBeenCalled()
})

test('manual mode: a refused merge after accepting the challenge shows the error toast', async () => {
  mockLazyState = { loading: false, data: { id: SAVED } }
  mockReplaceCart.mockResolvedValue({ data: { newOrderForm: null } })
  const { getByText } = renderBlock(false)

  fireEvent.click(getByText('accept'))

  await waitFor(() =>
    expect(mockShowToast).toHaveBeenCalledWith({
      message: 'store/crossCart.toast.error',
    })
  )
  expect(mockSetOrderForm).not.toHaveBeenCalled()
})

test('getSavedCart error (transient server lookup failure): saveCurrentCart is never called, no toast', async () => {
  mockLazyState = {
    loading: false,
    error: new Error('saved cart lookup unavailable'),
  }
  renderBlock(true)

  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(mockSaveCurrentCart).not.toHaveBeenCalled()
  expect(mockReplaceCart).not.toHaveBeenCalled()
  expect(mockShowToast).not.toHaveBeenCalled()
})

test('control: a legitimate null (nothing stored) still saves the current cart', async () => {
  mockLazyState = { loading: false, data: { id: null } }
  renderBlock(true)

  await waitFor(() =>
    expect(mockSaveCurrentCart).toHaveBeenCalledWith({
      variables: { orderFormId: CURRENT },
    })
  )
  expect(mockShowToast).not.toHaveBeenCalled()
})

test('success toast only when the server adopted the saved cart or added items', async () => {
  mockLazyState = { loading: false, data: { id: SAVED } }
  renderBlock()
  await waitFor(() =>
    expect(mockShowToast).toHaveBeenCalledWith({
      message: 'store/crossCart.toast.success',
    })
  )
})

test('no success toast when the server only returned the unchanged current cart', async () => {
  mockLazyState = { loading: false, data: { id: SAVED } }
  mockReplaceCart.mockResolvedValue({
    data: { newOrderForm: { id: CURRENT, items: [{ id: '2' }] } },
  })
  renderBlock()

  await waitFor(() => expect(mockSetOrderForm).toHaveBeenCalled())
  expect(mockShowToast).not.toHaveBeenCalled()
})

describe('a refetch that errors keeps the previous data (Apollo 3.1.5) and must be ignored', () => {
  it('previous data with no saved cart: saveCurrentCart is not called', async () => {
    mockLazyState = {
      loading: false,
      data: { id: null },
      error: new Error('saved cart lookup unavailable'),
    }
    renderBlock(true)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockSaveCurrentCart).not.toHaveBeenCalled()
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('previous data with a saved cart: no merge and no challenge is shown (manual mode)', async () => {
    mockLazyState = {
      loading: false,
      data: { id: SAVED },
      error: new Error('saved cart lookup unavailable'),
    }
    const { queryByText } = renderBlock(false)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(queryByText('accept')).toBeNull()
    expect(mockReplaceCart).not.toHaveBeenCalled()
    expect(mockSaveCurrentCart).not.toHaveBeenCalled()
  })
})
