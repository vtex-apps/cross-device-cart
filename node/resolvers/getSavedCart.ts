import { APP_NAME } from '../constants'

/**
 * Retrieve a previous session OrderForm ID and isMerged flag
 * @param {string} userId - Unique user identification string
 * @returns {string} orderFormId
 */
export const getSavedCart = async (
  _: unknown,
  { userId }: { userId: string },
  { clients: { vbase } }: Context
): Promise<string | null> => {
  const orderFormId: string | null = await vbase.getJSON(APP_NAME, userId, true)

  return orderFormId
}
