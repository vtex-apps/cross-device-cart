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
    const orderformId: string | null = await vbase.getJSON(
      APP_NAME,
      userId,
      true
    )

    return orderformId
  } catch (err) {
    const status = (err as any)?.response?.status

    if (status === 404) {
      return null
    }

    throw err
  }
}
