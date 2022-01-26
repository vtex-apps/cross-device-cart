import { APP_NAME } from '../constants'

/**
 * Listens to the event "order-created" from the broadcaster.
 * If the owner of the order has a cross cart reference stored with
 * the same orderForm ID, we delete that reference.
 */
export async function updateSavedCartReference(ctx: StatusChangeContext) {
  const {
    body: { orderId },
    vtex: { logger },
    clients: { requestHub, vbase },
  } = ctx

  try {
    const customerOrder = await requestHub.getOrder(orderId)

    const {
      orderFormId,
      clientProfileData: { userProfileId },
    } = customerOrder

    const crossCartReference: string | null = await vbase.getJSON(
      APP_NAME,
      userProfileId,
      true
    )

    if (crossCartReference === orderFormId) {
      await vbase.saveJSON(APP_NAME, userProfileId, null)

      logger.info({
        message: `User ${userProfileId} got it's XCart reference removed`,
      })
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error(error)
  }
}
