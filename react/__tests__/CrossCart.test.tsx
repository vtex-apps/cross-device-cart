/* eslint-disable global-require, @typescript-eslint/no-var-requires, react/display-name */
import React from 'react'
import { MockedProvider } from '@apollo/react-testing'
import { fireEvent, render, waitFor } from '@vtex/test-tools/react'
import axios from 'axios'

import GET_ID_BY_USER from '../graphql/getSavedCart.gql'
import MUTATE_CART from '../graphql/replaceCart.gql'
import SAVE_ID_BY_USER from '../graphql/saveCurrentCart.gql'
import { CrossCart } from '../components/CrossCart'

const SAVED = 'a'.repeat(32)
const CURRENT = 'd'.repeat(32)
const mockSetOrderForm = jest.fn()

jest.mock('axios')
jest.mock(
  'vtex.render-runtime',
  () => ({ useRuntime: () => ({ rootPath: '' }) }),
  { virtual: true }
)
jest.mock('../components/ChallengeBlock', () => {
  const { createElement } = require('react')

  return ({ handleAccept }: { handleAccept: () => void }) =>
    createElement('button', { onClick: handleAccept }, 'accept')
})
jest.mock(
  'vtex.order-manager/OrderForm',
  () => ({
    useOrderForm: () => ({
      orderForm: { id: 'd'.repeat(32), items: [{ id: '3' }] },
      initialFetchComplete: true,
      setOrderForm: mockSetOrderForm,
    }),
  }),
  { virtual: true }
)

const savedCartMock = (nullOnEmpty: boolean, id: string | null) => ({
  request: { query: GET_ID_BY_USER, variables: { nullOnEmpty } },
  result: { data: { id } },
})

const replaceCartMock = (strategy: string, newOrderForm: any) => ({
  request: {
    query: MUTATE_CART,
    variables: { currentCart: CURRENT, savedCart: SAVED, strategy },
  },
  result: { data: { newOrderForm } },
})

const renderCart = (
  mocks: any[],
  props: { isAutomatic: boolean; showToast: jest.Mock }
) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <CrossCart
        isAutomatic={props.isAutomatic}
        strategy="COMBINE"
        showToast={props.showToast}
      />
    </MockedProvider>
  )

beforeEach(() => {
  mockSetOrderForm.mockClear()
  ;(axios.post as jest.Mock).mockClear()
})

describe('CrossCart', () => {
  it('automatic: adopts the server-validated own cart, without identity variables', async () => {
    const adopted = { id: SAVED, items: [{ id: '3' }, { id: '1' }] }
    const showToast = jest.fn()

    renderCart(
      [
        savedCartMock(false, SAVED),
        replaceCartMock('COMBINE', adopted),
        savedCartMock(false, SAVED),
      ],
      { isAutomatic: true, showToast }
    )

    await waitFor(() => expect(mockSetOrderForm).toHaveBeenCalledWith(adopted))
    expect(axios.post).toHaveBeenCalledWith(
      `/api/checkout/pub/orderForm/${SAVED}`,
      {}
    )
  })

  it('automatic: anonymous fallback (server returns the current cart) does not POST', async () => {
    const current = { id: CURRENT, items: [{ id: '3' }, { id: '9' }] }

    renderCart(
      [
        savedCartMock(false, SAVED),
        replaceCartMock('COMBINE', current),
        savedCartMock(false, CURRENT),
      ],
      { isAutomatic: true, showToast: jest.fn() }
    )

    await waitFor(() => expect(mockSetOrderForm).toHaveBeenCalledWith(current))
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('automatic: a refused merge is silent', async () => {
    const showToast = jest.fn()

    renderCart(
      [savedCartMock(false, SAVED), replaceCartMock('COMBINE', null)],
      {
        isAutomatic: true,
        showToast,
      }
    )

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(showToast).not.toHaveBeenCalled()
    expect(mockSetOrderForm).not.toHaveBeenCalled()
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('manual: a refused merge after the shopper accepts shows the error toast', async () => {
    const showToast = jest.fn()
    const { findByText } = renderCart(
      [savedCartMock(true, SAVED), replaceCartMock('COMBINE', null)],
      { isAutomatic: false, showToast }
    )

    fireEvent.click(await findByText('accept'))

    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1))
    expect(mockSetOrderForm).not.toHaveBeenCalled()
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('automatic: a failing POST after adoption sets no order form and stays silent', async () => {
    const adopted = { id: SAVED, items: [{ id: '3' }, { id: '1' }] }
    const showToast = jest.fn()

    ;(axios.post as jest.Mock).mockRejectedValueOnce(new Error('network'))
    renderCart(
      [savedCartMock(false, SAVED), replaceCartMock('COMBINE', adopted)],
      {
        isAutomatic: true,
        showToast,
      }
    )

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(mockSetOrderForm).not.toHaveBeenCalled()
    expect(showToast).not.toHaveBeenCalled()
  })

  it('manual: a failing POST after the shopper accepts shows the error toast', async () => {
    const adopted = { id: SAVED, items: [{ id: '1' }] }
    const showToast = jest.fn()

    ;(axios.post as jest.Mock).mockRejectedValueOnce(new Error('network'))

    const { findByText } = renderCart(
      [savedCartMock(true, SAVED), replaceCartMock('COMBINE', adopted)],
      { isAutomatic: false, showToast }
    )

    fireEvent.click(await findByText('accept'))

    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1))
    expect(mockSetOrderForm).not.toHaveBeenCalled()
  })

  it('a getSavedCart error (transient lookup failure) never overwrites the saved reference', async () => {
    const saveResult = jest.fn(() => ({ data: { saveCurrentCart: 'success' } }))

    renderCart(
      [
        {
          request: { query: GET_ID_BY_USER, variables: { nullOnEmpty: false } },
          error: new Error('lookup unavailable'),
        },
        {
          request: {
            query: SAVE_ID_BY_USER,
            variables: { orderFormId: CURRENT },
          },
          result: saveResult,
        },
      ],
      { isAutomatic: true, showToast: jest.fn() }
    )

    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(saveResult).not.toHaveBeenCalled()
    expect(mockSetOrderForm).not.toHaveBeenCalled()
  })

  it('a null saved cart (nothing stored) saves the current cart', async () => {
    const saveResult = jest.fn(() => ({ data: { saveCurrentCart: 'success' } }))

    renderCart(
      [
        savedCartMock(false, null),
        {
          request: {
            query: SAVE_ID_BY_USER,
            variables: { orderFormId: CURRENT },
          },
          result: saveResult,
        },
      ],
      { isAutomatic: true, showToast: jest.fn() }
    )

    await waitFor(() => expect(saveResult).toHaveBeenCalledTimes(1))
  })

  it('shows the success toast when the server adopted the saved cart', async () => {
    const adopted = { id: SAVED, items: [{ id: '3' }, { id: '1' }] }
    const showToast = jest.fn()

    renderCart(
      [
        savedCartMock(false, SAVED),
        replaceCartMock('COMBINE', adopted),
        savedCartMock(false, SAVED),
      ],
      { isAutomatic: true, showToast }
    )

    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1))
    expect(mockSetOrderForm).toHaveBeenCalledWith(adopted)
  })

  it('shows no toast when the server returned the current cart unchanged', async () => {
    const unchanged = { id: CURRENT, items: [{ id: '3' }] }
    const showToast = jest.fn()

    renderCart(
      [
        savedCartMock(false, SAVED),
        replaceCartMock('COMBINE', unchanged),
        savedCartMock(false, CURRENT),
      ],
      { isAutomatic: true, showToast }
    )

    await waitFor(() =>
      expect(mockSetOrderForm).toHaveBeenCalledWith(unchanged)
    )
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(showToast).not.toHaveBeenCalled()
  })

  it('shows the toast when the current cart gained items from an anonymous saved cart', async () => {
    const grown = { id: CURRENT, items: [{ id: '3' }, { id: '9' }] }
    const showToast = jest.fn()

    renderCart(
      [
        savedCartMock(false, SAVED),
        replaceCartMock('COMBINE', grown),
        savedCartMock(false, CURRENT),
      ],
      { isAutomatic: true, showToast }
    )

    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1))
  })

  it('a refetch error after a successful query neither saves nor shows the challenge again', async () => {
    const adopted = { id: SAVED, items: [{ id: '1' }] }
    const showToast = jest.fn()
    const saveResult = jest.fn(() => ({ data: { saveCurrentCart: 'success' } }))

    const { findByText, queryByText } = renderCart(
      [
        savedCartMock(true, SAVED),
        replaceCartMock('COMBINE', adopted),
        {
          request: { query: GET_ID_BY_USER, variables: { nullOnEmpty: true } },
          error: new Error('lookup unavailable'),
        },
        {
          request: {
            query: SAVE_ID_BY_USER,
            variables: { orderFormId: CURRENT },
          },
          result: saveResult,
        },
        {
          request: { query: SAVE_ID_BY_USER, variables: { orderFormId: null } },
          result: saveResult,
        },
      ],
      { isAutomatic: false, showToast }
    )

    fireEvent.click(await findByText('accept'))
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(queryByText('accept')).toBeNull()
    expect(saveResult).not.toHaveBeenCalled()
  })
})
