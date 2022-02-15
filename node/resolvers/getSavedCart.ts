import { APP_NAME } from '../constants'

/**
 * Retrieve a previous session OrderForm ID and isMerged flag
 * @param {string} userId - Unique user identification string
 * @returns {string} orderFormId
 */
export const getSavedCart = async (
  _: unknown,
  { userId, isAutomatic }: { userId: string; isAutomatic: boolean },
  { clients: { vbase, checkoutIO } }: Context
): Promise<string | null> => {
  const orderFormId: string | null = await vbase.getJSON(APP_NAME, userId, true)

  if (!isAutomatic && orderFormId) {
    const savedItems = await checkoutIO.getOrderFormItems(orderFormId)

    if (!savedItems.length) {
      return null
    }
  }

  return orderFormId
}
