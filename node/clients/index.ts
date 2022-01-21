import { ClientsConfig, IOClients, LRUCache, ServiceContext } from '@vtex/api'

import { Checkout } from './checkout'

export class Clients extends IOClients {
  public get checkout() {
    return this.getOrSet('checkout', Checkout)
  }
}

declare global {
  type Context = ServiceContext<Clients>
}

const memoryCache = new LRUCache<string, any>({ max: 5000 })

metrics.trackCache('status', memoryCache)

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
