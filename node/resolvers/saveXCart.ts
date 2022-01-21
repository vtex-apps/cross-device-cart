/* eslint-disable no-console */
import { APP_NAME } from '../constants'

export const saveXCart = async (
  _: any,
  { userId, orderformId }: { userId: string; orderformId: string },
  { clients: { vbase } }: Context
) => {
  try {
    console.log('------ SAVE', orderformId)

    await vbase.saveJSON(APP_NAME, userId, orderformId)

    return 'success'
  } catch (err) {
    console.log('------', err)

    throw err
  }
}
