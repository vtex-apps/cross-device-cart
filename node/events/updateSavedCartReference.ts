import { APP_NAME } from '../constants'

/**
 * Listens to the event "order-created" from the broadcaster.
 * If the owner of the order has a cross cart reference stored with
 * the same orderForm ID, we delete it.
 */
export async function updateSavedCartReference(ctx: StatusChangeContext) {
  const {
    body: { orderId, userType },
    vtex: { logger },
    clients: { oms, vbase },
  } = ctx
  if( userType != "CALL_CENTER_OPERATOR") {
    try {
      const customerOrder = await oms.order(orderId)
  
      const {
        orderFormId,
        clientProfileData: { userProfileId },
        salesChannel
      } = customerOrder
  
      const crossCartReference: string | null = await vbase.getJSON(
        APP_NAME,
        `${userProfileId}-sc:${salesChannel}`,
        true
      )
  
      if (crossCartReference === orderFormId) {
        await vbase.saveJSON(APP_NAME, `${userProfileId}-sc:${salesChannel}`, null)
  
        logger.info({
          message: `Cross Device Cart reference removed for user ${userProfileId}`,
        })
      }
    } catch (error) {
      logger.error({
        orderId,
        message: 'There was a problem removing the reference for this order.',
        data: error,
      })
    }
  } else {
    logger.info({
      message: `Is Call center Operator`,
    })
  }

}
