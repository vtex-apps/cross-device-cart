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

describe('a session change while a merge is in flight', () => {
  const deferred = <T,>() => {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((res) => {
      resolve = res
    })

    return { promise, resolve }
  }

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

  const expectNothingApplied = () => {
    expect(mockSetOrderForm).not.toHaveBeenCalled()
    expect(mockShowToast).not.toHaveBeenCalled()
    expect(mockGetSavedCart).toHaveBeenCalledTimes(1) // only the initial lookup
  }

  const adoptedResult = {
    data: { newOrderForm: { id: SAVED, items: [{ id: '1' }] } },
  }

  it('unmounted while replaceCart is pending: no POST, no setOrderForm, no toast, no follow-up query', async () => {
    mockLazyState = { loading: false, data: { id: SAVED } }
    const pending = deferred<typeof adoptedResult>()

    mockReplaceCart.mockReturnValue(pending.promise)
    const { unmount } = renderBlock(true)

    await waitFor(() => expect(mockReplaceCart).toHaveBeenCalled())
    unmount()
    pending.resolve(adoptedResult)
    await flush()

    expect(axios.post).not.toHaveBeenCalled()
    expectNothingApplied()
  })

  it('unmounted while the Checkout POST is pending: no setOrderForm, no toast, no follow-up query', async () => {
    mockLazyState = { loading: false, data: { id: SAVED } }
    const pending = deferred<Record<string, never>>()

    ;(axios.post as jest.Mock).mockReturnValue(pending.promise)
    const { unmount } = renderBlock(true)

    await waitFor(() => expect(axios.post).toHaveBeenCalled())
    unmount()
    pending.resolve({})
    await flush()

    expectNothingApplied()
  })

  it('unmounted while the Checkout POST is pending and then fails: no error toast (manual mode)', async () => {
    mockLazyState = { loading: false, data: { id: SAVED } }
    let rejectPost!: (reason: Error) => void
    ;(axios.post as jest.Mock).mockReturnValue(
      new Promise((_, reject) => {
        rejectPost = reject
      })
    )
    const { getByText, unmount } = renderBlock(false)

    fireEvent.click(getByText('accept'))
    await waitFor(() => expect(axios.post).toHaveBeenCalled())
    unmount()
    rejectPost(new Error('checkout down'))
    await flush()

    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('unmounted while a refused replaceCart is pending: no error toast (manual mode)', async () => {
    mockLazyState = { loading: false, data: { id: SAVED } }
    const pending = deferred<{ data: { newOrderForm: null } }>()

    mockReplaceCart.mockReturnValue(pending.promise)
    const { getByText, unmount } = renderBlock(false)

    fireEvent.click(getByText('accept'))
    await waitFor(() => expect(mockReplaceCart).toHaveBeenCalled())
    unmount()
    pending.resolve({ data: { newOrderForm: null } })
    await flush()

    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('normal path: adopts, POSTs, sets the orderForm, toasts and refreshes the saved cart', async () => {
    mockLazyState = { loading: false, data: { id: SAVED } }
    renderBlock(true)

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'store/crossCart.toast.success',
      })
    )
    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(mockSetOrderForm).toHaveBeenCalledWith({
      id: SAVED,
      items: [{ id: '1' }],
    })
    expect(mockGetSavedCart).toHaveBeenCalledTimes(2)
  })

  it('a key change that remounts the component while replaceCart is pending behaves like an unmount', async () => {
    mockLazyState = { loading: false, data: { id: SAVED } }
    const pending = deferred<typeof adoptedResult>()

    mockReplaceCart.mockReturnValueOnce(pending.promise)
    // the new session instance has nothing to merge
    const element = (key: string) => (
      <CrossCart
        key={key}
        isAutomatic
        strategy="REPLACE"
        showToast={mockShowToast}
      />
    )

    const { rerender } = render(element('profile-1'))

    await waitFor(() => expect(mockReplaceCart).toHaveBeenCalledTimes(1))
    mockLazyState = { loading: false }
    rerender(element('profile-2'))
    pending.resolve(adoptedResult)
    await flush()

    expect(axios.post).not.toHaveBeenCalled()
    expect(mockSetOrderForm).not.toHaveBeenCalled()
    expect(mockShowToast).not.toHaveBeenCalled()
    // initial lookups of the two instances only, no follow-up from the old one
    expect(mockGetSavedCart).toHaveBeenCalledTimes(2)
  })
})
