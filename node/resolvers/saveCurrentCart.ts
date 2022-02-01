import { APP_NAME } from '../constants'

/**
 * Store an OrderForm ID reference for a specific user
 * @param {string} userId - Unique user identification string
 * @param {string} orderFormId - Unique orderForm identification string
 * @returns {string} If promise was fulfilled
 */
export const saveCurrentCart = async (
  _: any,
  { userId, orderFormId }: { userId: string; orderFormId: string },
  { clients: { vbase } }: Context
): Promise<string> => {
  try {
    await vbase.saveJSON(APP_NAME, userId, orderFormId)

    return 'success'
  } catch (err) {
    throw err
  }
}
