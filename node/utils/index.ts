import { AxiosError } from 'axios'
import { AuthenticationError, ForbiddenError, UserInputError } from '@vtex/api'

export function statusToError(e: any) {
  if (!e.response) {
    throw e
  }

  const { response } = e as AxiosError
  const { status } = response!

  if (status === 401) {
    throw new AuthenticationError(e)
  }

  if (status === 403) {
    throw new ForbiddenError(e)
  }

  if (status === 400) {
    throw new UserInputError(e)
  }

  throw e
}

/**
 * Returns a set from both provided lists.
 * Duplicates from the second one are discarded or,
 * if desired, their quantities added to the existing items.
 *
 * @func mergeItems
 * @param {PartialItem[]} list1 First list of Items
 * @param {PartialItem[]} list2 Second list of Items
 * @param {boolean} tally Sum duplicate's quantities
 * @return {PartialItem[]} New set of items
 * @example
 *
 * mergeItems([{id: 3, qty: 1}, {id: 1, qty: 2}], [{id: 2, qty: 2}, {id: 1: qty: 1}], true)
 * //=> [{ id: 3, qty: 1}, {id: 1, qty: 3}, {id: 2, qty: 2 }]
 */
export const mergeItems = (
  list1: PartialItem[],
  list2: PartialItem[],
  tally: boolean
): PartialItem[] => {
  return [...list1, ...list2].reduce((acc: PartialItem[], curr) => {
    const existing = acc.find((el) => el.id === curr.id)

    existing ? tally && (existing.quantity += curr.quantity) : acc.push(curr)

    return acc
  }, [])
}
