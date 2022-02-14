import { APP_NAME } from '../constants'

/**
 * Store an OrderForm ID and isMerged flag reference for a specific user
 * @param {string} userId - Unique user identification string
 * @param {string | null} orderFormId - Unique orderForm identification string
 * @returns {string} If promise was fulfilled
 */
export const saveCurrentCart = async (
  _: any,
  { userId, orderFormId }: { userId: string; orderFormId: string | null },
  { clients: { vbase } }: Context
): Promise<string> => {
  await vbase.saveJSON(APP_NAME, userId, orderFormId)

  return 'success'
}
