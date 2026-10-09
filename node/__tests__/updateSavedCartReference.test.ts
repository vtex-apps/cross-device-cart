import { updateSavedCartReference } from '../events/updateSavedCartReference'
import {
  expectNoIdentifiersLogged,
  OF_A,
  SHOPPER_A,
} from '../testUtils/mockContext'

test('clears the reference of the order owner without logging identifiers', async () => {
  const store: Record<string, string | null> = { [SHOPPER_A]: OF_A }
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const ctx: any = {
    body: { orderId: 'order-1' },
    vtex: { logger },
    clients: {
      oms: {
        order: jest.fn().mockResolvedValue({
          orderFormId: OF_A,
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

  await updateSavedCartReference(ctx)

  expect(store[SHOPPER_A]).toBeNull()
  expect(logger.info).toHaveBeenCalledWith({
    message: 'cross-device-cart.reference_removed_on_order',
  })
  expectNoIdentifiersLogged(logger)
})
