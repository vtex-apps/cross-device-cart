import { APP_NAME, DEFAULT_ORDER_FORM_ID } from '../constants'

/**
 * Store an OrderForm ID reference for a specific user
 * @param {string} userId - Unique user identification string
 * @param {string | null} orderFormId - Unique orderForm identification string
 * @returns {string} As fulfilled
 */
export const saveCurrentCart = async (
  _: any,
  { userId, orderFormId }: { userId: string; orderFormId: string | null },
  { clients: { vbase } }: Context
): Promise<string> => {
  if (orderFormId === DEFAULT_ORDER_FORM_ID) {
    throw new Error(`Cannot save current cart with default-order-form for userId ${userId}`)
  }
  await vbase.saveJSON(APP_NAME, userId, orderFormId)

  return 'success'
}
