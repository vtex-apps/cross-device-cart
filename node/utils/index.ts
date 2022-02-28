import { AxiosError } from 'axios'
import { AuthenticationError, ForbiddenError, UserInputError } from '@vtex/api'

/**
 * Returns the appropiate VTEX's type of error depending on `err` status code.
 *
 * @function statusToError
 * @param {AxiosError} err The error received from the request.
 * @returns {Error} VTEX's error instance
 */
export function statusToError(err: AxiosError): Error {
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
 * Returns a set from both provided cart's items.
 * If desired, duplicates from the second one have their
 * quantities added to the first provided list of items.
 *
 * @func mergeItems
 * @param {PartialItem[]} currentItems Current cart list of Items
 * @param {PartialItem[]} previousItems Previous cart list of Items
 * @param {boolean} sumDuplicates
 * @return {PartialItem[]} Set of items
 * @example
 *
 * mergeItems([{id: 3, qty: 1}, {id: 1, qty: 2}], [{id: 2, qty: 2}, {id: 1: qty: 1}])
 * // => [{ id: 3, qty: 1}, {id: 1, qty: 3}, {id: 2, qty: 2 }]
 */
export const mergeItems = (
  currentItems: PartialItem[],
  previousItems: PartialItem[],
  sumDuplicates: boolean
): PartialItem[] =>
  [...currentItems, ...previousItems].reduce(
    (mergedItems: PartialItem[], item) => {
      const existingItem = mergedItems.find(({ id }) => id === item.id)

      existingItem
        ? sumDuplicates && (existingItem.quantity += item.quantity)
        : mergedItems.push(item)

      return mergedItems
    },
    []
  )
