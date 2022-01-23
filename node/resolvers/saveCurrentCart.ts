import { APP_NAME } from '../constants'

export const saveCurrentCart = async (
  _: any,
  { userId, orderFormId }: { userId: string; orderFormId: string },
  ctx: Context
) => {
  const {
    clients: { vbase },
  } = ctx

  try {
    await vbase.saveJSON(APP_NAME, userId, orderFormId)

    return 'success'
  } catch (err) {
    throw err
  }
}
