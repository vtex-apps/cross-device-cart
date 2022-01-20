export async function eventsErrorHandler(
  ctx: StatusChangeContext,
  next: () => Promise<void>
) {
  const {
    vtex: { logger },
  } = ctx

  try {
    await next()
  } catch (error) {
    // Check the Feed event object and add the order id to the log.
    if (ctx.body.orderId) {
      const { orderId } = ctx.body

      logger.error({
        orderId,
        message: error.message,
        data: error,
      })
    } else {
      logger.error({
        message: error.message,
        data: error,
      })
    }

    ctx.body = error.message
  }
}
