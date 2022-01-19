export const saveXCart = async (
  _: any,
  { userId, orderformId }: { userId: string; orderformId: string },
  ctx: Context
) => {
  try {
    // eslint-disable-next-line no-console
    console.log(userId, orderformId)

    const __ = await ctx.clients.vbase.saveJSON(
      'vtex.cross-device-cart',
      userId,
      orderformId
    )

    // eslint-disable-next-line no-console
    console.log('----------SAVING DEBUG-----------', __)

    return 'success'
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('----------------------------------------', err)

    throw err
  }
}
