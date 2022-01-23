import { APP_NAME } from '../constants'

export const getSavedCart = async (
  _: unknown,
  { userId }: { userId: string },
  ctx: Context
) => {
  const {
    clients: { vbase },
  } = ctx

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
