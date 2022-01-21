import { APP_NAME } from '../constants'

export const saveXCart = async (
  _: any,
  { userId, orderformId }: { userId: string; orderformId: string },
  ctx: Context
) => {
  const {
    clients: { vbase },
  } = ctx

  try {
    await vbase.saveJSON(APP_NAME, userId, orderformId)

    return 'success'
  } catch (err) {
    throw err
  }
}
