import {
  ClientsConfig,
  EventContext,
  IOClients,
  LRUCache,
  ServiceContext,
} from '@vtex/api'
import { OMS } from '@vtex/clients'

import RequestHub from './hub'
import CheckoutIO from './checkout'

export class Clients extends IOClients {
  public get checkoutIO() {
    return this.getOrSet('checkoutIO', CheckoutIO)
  }

  public get requestHub() {
    return this.getOrSet('requestHub', RequestHub)
  }

  public get oms() {
    return this.getOrSet('oms', OMS)
  }
}

declare global {
  type Context = ServiceContext<Clients>

  interface StatusChangeContext extends EventContext<Clients> {
    body: {
      domain: string
      orderId: string
      currentState: string
      lastState: string
      currentChangeDate: string
      lastChangeDate: string
    }
  }
}

const TIMEOUT_MS = 5000
const memoryCache = new LRUCache<string, any>({ max: 5000 })

metrics.trackCache('xcart', memoryCache)

const clients: ClientsConfig<Clients> = {
  implementation: Clients,
  options: {
    default: {
      retries: 2,
      timeout: TIMEOUT_MS,
      concurrency: 2,
      memoryCache,
    },
  },
}

export default clients
