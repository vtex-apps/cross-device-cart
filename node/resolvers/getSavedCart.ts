import { APP_NAME } from '../constants'

/**
 * Retrieve a previous session OrderForm ID
 * @param {string} userId - Unique user identification string
 * @param {boolean} nullOnEmpty - Return null if the orderForm doesn't have items
 * @returns {string | null} orderFormId
 */
export const getSavedCart = async (
  _: unknown,
  { userId, nullOnEmpty }: { userId: string; nullOnEmpty: boolean },
  { clients: { vbase, checkoutIO } }: Context
): Promise<string | null> => {
  const orderFormId: string | null = await vbase.getJSON(APP_NAME, userId, true)

  if (nullOnEmpty && orderFormId) {
    const savedItems = await checkoutIO.getItems(orderFormId)

    if (!savedItems.length) {
      return null
    }
  }

  return orderFormId
}
