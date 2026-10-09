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

  it('keeps the reference when it differs from the order orderForm', async () => {
    const { ctx, store, logger } = setup(OF_B, OF_A)

    await updateSavedCartReference(ctx)

    expect(store[key(SHOPPER_A)]).toBe(OF_B)
    expect(ctx.clients.vbase.saveJSON).not.toHaveBeenCalled()
    expectNoPiiInLogs(logger)
  })
})
