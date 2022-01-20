export async function updateXCartReference(ctx: StatusChangeContext) {
  const {
    body: { orderId },
    vtex: { logger },
    clients: { orders, vbase },
  } = ctx

  try {
    const customerOrder = await orders.getOrder(orderId)

    const {
      orderFormId,
      clientProfileData: { userProfileId },
    } = customerOrder

    const XCartReference = await vbase.getJSON<{
      orderformId: string | null
    }>('vtex.cross-device-cart', userProfileId, true)

    if (XCartReference === orderFormId) {
      await vbase.saveJSON('vtex.cross-device-cart', userProfileId, '')

      logger.info({
        message: `User ${userProfileId} got it's XCart reference removed`,
      })
    }
  } catch (error) {
    throw new Error(String(error))
  }
}
