import { AxiosError } from 'axios'
import { AuthenticationError, ForbiddenError, UserInputError } from '@vtex/api'

/**
 * Returns the appropiate VTEX's type of error depending on `err` status code.
 *
 * @function statusToError
 * @param {AxiosError} e The error received from the request.
 * @returns {Error} VTEX's error instance
 */
export function statusToError(err: AxiosError) {
  if (!err.response || !err.response.status) {
    throw err
  }

  const {
    response: { status },
  } = err

  if (status === 401) {
    throw new AuthenticationError(err)
  }

  if (status === 403) {
    throw new ForbiddenError(err)
  }

  if (status === 400) {
    throw new UserInputError(err)
  }

  throw err
}

/**
 * Returns a set from both provided carts.
 * Duplicates from the second one are discarded or,
 * if desired, their quantities added to the existingItem items.
 *
 * @func mergeItems
 * @param {PartialItem[]} previousCart Previous cart list of Items
 * @param {PartialItem[]} currentCart Currenr cart list of Items
 * @param {boolean} addQty if true, add duplicate's quantities
 * @return {PartialItem[]} New set of items for the cart
 * @example
 *
 * mergeItems([{id: 3, qty: 1}, {id: 1, qty: 2}], [{id: 2, qty: 2}, {id: 1: qty: 1}], true)
 *   => [{ id: 3, qty: 1}, {id: 1, qty: 3}, {id: 2, qty: 2 }]
 */
export const mergeItems = (
  previousCart: PartialItem[],
  currentCart: PartialItem[],
  addQty: boolean
): PartialItem[] =>
  [...previousCart, ...currentCart].reduce(
    (mergedItems: PartialItem[], item) => {
      const existingItem = mergedItems.find(({ id }) => id === item.id)

      existingItem
        ? addQty && (existingItem.quantity += item.quantity)
        : mergedItems.push(item)

      return mergedItems
    },
    []
  )
