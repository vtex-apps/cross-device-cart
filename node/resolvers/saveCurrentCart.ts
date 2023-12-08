import { APP_NAME } from '../constants'

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
  try {
    const authenticatedUser = requestHub.authenticatedUser(storeUserAuthToken)
  } catch(e) {
    throw new AuthenticationError()
  }

  if (authenticatedUser.userId != userId) {
    throw new AuthenticationError()
  }

  await vbase.saveJSON(APP_NAME, userId, orderFormId)

  return 'success'
}
