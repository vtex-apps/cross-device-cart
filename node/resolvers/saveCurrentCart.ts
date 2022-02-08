import { APP_NAME } from '../constants'

/**
 * Store an OrderForm ID and isMerged flag reference for a specific user
 * @param {string} userId - Unique user identification string
 * @param {CurrentCartProps} currentCartData - Unique orderForm identification string and isMerged flag
 * @returns {string} If promise was fulfilled
 */
export const saveCurrentCart = async (
  _: any,
  { userId, orderFormId, isMerged }: SaveCurrentCartData,
  { clients: { vbase } }: Context
): Promise<string> => {
  const currentCartData = {
    orderFormId,
    isMerged,
  }

  await vbase.saveJSON(APP_NAME, userId, currentCartData)

  return 'success'
}
