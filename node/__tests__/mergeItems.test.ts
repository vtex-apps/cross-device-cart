/* eslint-disable jest/no-mocks-import */
import { mergeItems } from '../utils'
import { item } from '../__mocks__/testContext'

describe('mergeItems', () => {
  it('sums duplicate quantities when sumDuplicates is true', () => {
    const merged = mergeItems(
      [item(1, 1), item(3)],
      [item(1, 2), item(2)],
      true
    )

    expect(merged.map(({ id, quantity }) => [id, quantity])).toEqual([
      [1, 3],
      [3, 1],
      [2, 1],
    ])
  })

  it('keeps current quantities when sumDuplicates is false', () => {
    const merged = mergeItems([item(1, 1)], [item(1, 5), item(2)], false)

    expect(merged.map(({ id, quantity }) => [id, quantity])).toEqual([
      [1, 1],
      [2, 1],
    ])
  })
})
