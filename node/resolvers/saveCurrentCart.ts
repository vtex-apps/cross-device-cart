import { APP_NAME } from '../constants'

/**
 * Store an OrderForm ID reference for a specific user
 * @param {string} userId - Unique user identification string
 * @param {string | null} orderFormId - Unique orderForm identification string
 * @returns {string} As fulfilled
 */
export const saveCurrentCart = async (
  _: any,
  { userId, userType, orderFormId, salesChannel }: { userId: string; userType: string; orderFormId: string | null, salesChannel: string },
  { clients: { vbase } }: Context
): Promise<string> => {
  if( userType != "CALL_CENTER_OPERATOR") {
    await vbase.saveJSON(APP_NAME, `${userId}-sc:${salesChannel}`, orderFormId)

    return 'success'
  } else {
    return 'Not saved is call center operator'
  }
}
