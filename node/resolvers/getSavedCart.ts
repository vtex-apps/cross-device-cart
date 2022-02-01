import { APP_NAME } from '../constants'

/**
 * Retrieve a previous session OrderForm ID
 * @param {string} userId - Unique user identification string
 * @returns {string | null} orderFormId
 */
export const getSavedCart = async (
  _: unknown,
  { userId }: { userId: string },
  { clients: { vbase } }: Context
): Promise<string | null> => {
  try {
    const orderFormId: string | null = await vbase.getJSON(
      APP_NAME,
      userId,
      true
    )

    return orderFormId
  } catch (err) {
    const status = (err as any)?.response?.status

    if (status === 404) {
      return null
    }

    throw err
  }
}
