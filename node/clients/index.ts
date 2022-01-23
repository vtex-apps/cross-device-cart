import {
  ClientsConfig,
  EventContext,
  IOClients,
  LRUCache,
  ServiceContext,
} from '@vtex/api'

import Orders from './orders'
import IOCheckout from './checkout/index'

export class Clients extends IOClients {
  public get checkout() {
    return this.getOrSet('checkout', IOCheckout)
  }

  public get orders() {
    return this.getOrSet('orders', Orders)
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

const memoryCache = new LRUCache<string, any>({ max: 5000 })

metrics.trackCache('xcart', memoryCache)

const clients: ClientsConfig<Clients> = {
  implementation: Clients,
  options: {
    default: {
      retries: 2,
      timeout: 800,
    },
    orders: {
      timeout: 3000,
    },
    status: {
      memoryCache,
    },
  },
}

export default clients
