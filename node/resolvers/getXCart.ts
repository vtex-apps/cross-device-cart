/* eslint-disable no-console */
import { APP_NAME } from '../constants'

export const getXCart = async (
  _: unknown,
  { userId }: { userId: string },
  { clients: { vbase } }: Context
) => {
  let orderformId

  try {
    orderformId = await vbase.getJSON<{
      orderformId: string | null
    }>(APP_NAME, userId, true)

    console.log('------ GET', orderformId)

    return orderformId
  } catch (err) {
    console.log('------', err)

    const status = (err as any)?.response?.status

    if (status === 404) {
      return null
    }

    throw err
  }
}
