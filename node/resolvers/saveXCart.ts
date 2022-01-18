export const saveXCart = async (
  _: any,
  { userId, orderformId }: { userId: string; orderformId: string },
  ctx: Context
) => {
  try {
    // eslint-disable-next-line no-console
    console.log('-----------------NODE DEBUG-----------------------')

    const __ = await ctx.clients.vbase.saveJSON(
      'vtex.cross-device-cart',
      userId,
      orderformId
    )

    // eslint-disable-next-line no-console
    console.log(__)

    return 'success'
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('----------------------------------------', err)

    throw err
  }
}
