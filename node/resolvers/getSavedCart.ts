import { APP_NAME } from '../constants'

/**
 * Retrieve a previous session OrderForm ID and isMerged flag
 * @param {string} userId - Unique user identification string
 * @returns {CurrentCartProps} orderFormId and isMerged flag
 */
export const getSavedCart = async (
  _: unknown,
  { userId }: { userId: string },
  { clients: { vbase } }: Context
): Promise<CurrentCartProps | null> => {
  const currentCartData: CurrentCartProps | null = await vbase.getJSON(
    APP_NAME,
    userId,
    true
  )

  return currentCartData
}
