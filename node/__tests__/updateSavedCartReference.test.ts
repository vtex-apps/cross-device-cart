/* eslint-disable jest/no-mocks-import */
import { updateSavedCartReference } from '../events/updateSavedCartReference'
import {
  OF_A,
  OF_B,
  SHOPPER_A,
  expectNoPiiInLogs,
  key,
} from '../__mocks__/testContext'

const ORDER_ID = 'order-synthetic-1'

const setup = (stored: string | null, orderFormId: string) => {
  const store: Record<string, string | null> = { [key(SHOPPER_A)]: stored }
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const ctx: any = {
    body: { orderId: ORDER_ID },
    vtex: { logger },
    clients: {
      oms: {
        order: jest.fn().mockResolvedValue({
          orderFormId,
          salesChannel: '1',
          clientProfileData: { userProfileId: SHOPPER_A },
        }),
      },
      vbase: {
        getJSON: jest.fn(async (_b: string, k: string) => store[k] ?? null),
        saveJSON: jest.fn(async (_b: string, k: string, v: string | null) => {
          store[k] = v
        }),
      },
    },
  }

  return { ctx, store, logger }
}

describe('updateSavedCartReference', () => {
  it('removes the reference when it equals the order orderForm, logging no identifiers', async () => {
    const { ctx, store, logger } = setup(OF_A, OF_A)

    await updateSavedCartReference(ctx)

    expect(store[key(SHOPPER_A)]).toBeNull()
    expect(logger.info).toHaveBeenCalledWith({
      message: 'cross-device-cart.reference_removed_on_order',
    })
    expectNoPiiInLogs(logger)
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain(ORDER_ID)
  })

  it('logs only message, orderId and status when the event fails (never the error object)', async () => {
    const { ctx, logger } = setup(OF_A, OF_A)

    ctx.clients.oms.order.mockRejectedValueOnce(
      Object.assign(new Error(`failed for ${SHOPPER_A}`), {
        response: { status: 502, data: { email: 'x@example.test' } },
        config: { headers: { VtexIdclientAutCookie: 'secret-token' } },
      })
    )

    await updateSavedCartReference(ctx)

    expect(logger.error).toHaveBeenCalledWith({
      message: 'There was a problem removing the reference for this order.',
      orderId: ORDER_ID,
      status: 502,
    })
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
      'secret-token'
    )
    expectNoPiiInLogs(logger)
  })

  it('logs a null status when the failure has no HTTP response', async () => {
    const { ctx, logger } = setup(OF_A, OF_A)

    ctx.clients.vbase.getJSON.mockRejectedValueOnce(new Error('vbase down'))

    await updateSavedCartReference(ctx)

    expect(logger.error).toHaveBeenCalledWith({
      message: 'There was a problem removing the reference for this order.',
      orderId: ORDER_ID,
      status: null,
    })
  })

  it('keeps the reference when it differs from the order orderForm', async () => {
    const { ctx, store, logger } = setup(OF_B, OF_A)

    await updateSavedCartReference(ctx)

    expect(store[key(SHOPPER_A)]).toBe(OF_B)
    expect(ctx.clients.vbase.saveJSON).not.toHaveBeenCalled()
    expectNoPiiInLogs(logger)
  })
})
