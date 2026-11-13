/* eslint-disable jest/no-expect-resolves */
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

test.each([
  ['oms', { response: { status: 502 }, config: { data: 'PII' } }, 502],
  ['vbase', new Error('boom'), null],
])(
  'a %s failure logs only message, orderId and status (never the error object)',
  async (failing, error, status) => {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    const ok = { orderFormId: OF_A, clientProfileData: { userProfileId: 'u' } }
    const ctx: any = {
      body: { orderId: 'order-1' },
      vtex: { logger },
      clients: {
        oms: {
          order:
            failing === 'oms'
              ? jest.fn().mockRejectedValue(error)
              : jest.fn().mockResolvedValue(ok),
        },
        vbase: {
          getJSON:
            failing === 'vbase'
              ? jest.fn().mockRejectedValue(error)
              : jest.fn().mockResolvedValue(null),
          saveJSON: jest.fn(),
        },
      },
    }

    await expect(updateSavedCartReference(ctx)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith({
      message: 'There was a problem removing the reference for this order.',
      orderId: 'order-1',
      status,
    })
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('PII')
  }
)
