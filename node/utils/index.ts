import { AxiosError } from 'axios'
import { AuthenticationError, ForbiddenError, UserInputError } from '@vtex/api'
import {
  eqBy,
  prop,
  unionWith,
  concat,
  mergeWithKey,
  pipe,
  groupBy,
  map,
  reduce,
  values,
} from 'ramda'
import type { Item } from 'vtex.checkout-graphql'

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
 * Creates a set of Items from the first list adding the missing Items from the second.
 * Duplicate Items are compared using their 'id' property and discarded
 *
 * @func addMissingItems
 * @param {PartialItem[]} list1 First list of Items
 * @param {PartialItem[]} list2 Second list of Items to add
 * @return {PartialItem[]} New set of items
 * @see {@link https://ramdajs.com/docs/#unionWith}
 * @example
 *
 * addMissingItems([{id: 3}, {id: 1}], [{id: 2}, {id: 1}]) //=> [{ id: 3}, {id: 1}, {id: 2 }]
 */
export const addMissingItems = (
  list1: PartialItem[],
  list2: PartialItem[]
): PartialItem[] => {
  const byID = eqBy(prop('id') as any)

  return unionWith(byID, list1, list2)
}

/**
 * Creates an ordered set combining Items from both provided lists.
 * Duplicates are grouped using their 'id' property and then
 * mapped to reduce their quantities
 *
 * @func combineItems
 * @param {PartialItem[]} list1 First list of Items
 * @param {PartialItem[]} list2 Second list of Items
 * @return {PartialItem[]} New set of items
 * @see {@link https://ramdajs.com/docs/#mergeWithKey}
 * @example
 *
 * addMissingItems([{id: 3}, {id: 1, qty: 2}], [{id: 2}, {id: 1: qty: 1}]) //=> [{ id: 1, qty: 3}, {id: 2}, {id: 3 }]
 */
export const combineItems = (
  list1: PartialItem[],
  list2: PartialItem[]
): PartialItem[] => {
  const allItems = concat(list1, list2)

  const mergeQty = mergeWithKey((key: string, left: number, right: number) =>
    key === 'quantity' ? left + right : left
  )

  // @ts-expect-error Ramda incorrectly typed
  const combine = pipe(groupBy(prop(['id'])), map(reduce(mergeQty, {})), values)

  // @ts-expect-error Ramda incorrectly typed
  return combine(allItems)
}
