import { APP_NAME } from '../constants'

/**
 * Store an OrderForm ID reference for a specific user
 * @param {string} userId - Unique user identification string
 * @param {string | null} orderFormId - Unique orderForm identification string
 * @returns {string} As fulfilled
 */
export const saveCurrentCart = async (
  _: any,
  { userId, orderFormId, userType }: { userId: string; orderFormId: string | null, userType: string },
  { clients: { vbase } }: Context
): Promise<string> => {

  if( userType != "CALL_CENTER_OPERATOR") {
    await vbase.saveJSON(APP_NAME, userId, orderFormId)

    return 'success'
  } else {
    return 'Not saved is call center operator'
  }
}
