import { APP_NAME } from '../constants'

/**
 * Store an OrderForm ID reference for a specific user
 * @param {string} userId - Unique user identification string
 * @param {string | null} orderFormId - Unique orderForm identification string
 * @returns {string} As fulfilled
 */
export const saveCurrentCart = async (
  _: any,
  { userId, orderFormId, salesChannel }: { userId: string; orderFormId: string | null, salesChannel: string },
  { clients: { vbase } }: Context
): Promise<string> => {
  await vbase.saveJSON(APP_NAME, `${userId}-sc:${salesChannel}`, orderFormId)

  return 'success'
}
