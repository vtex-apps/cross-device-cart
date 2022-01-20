import {
  ClientsConfig,
  LRUCache,
  Service,
  ParamsContext,
  ServiceContext,
  RecorderState,
  EventContext,
} from '@vtex/api'

import { Clients } from './clients'
import { eventsErrorHandler, updateXCartReference } from './events'
import { queries, mutations } from './resolvers'

const TIMEOUT_MS = 800

const memoryCache = new LRUCache<string, any>({ max: 5000 })

metrics.trackCache('xcart', memoryCache)

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

const clients: ClientsConfig<Clients> = {
  implementation: Clients,
  options: {
    default: {
      retries: 2,
      timeout: TIMEOUT_MS,
    },
    orders: {
      timeout: 3000,
    },
    status: {
      memoryCache,
    },
  },
}

export default new Service<Clients, RecorderState, ParamsContext>({
  clients,
  events: {
    updateOnCreatedOrder: [eventsErrorHandler, updateXCartReference],
  },
  graphql: {
    resolvers: {
      Query: {
        ...queries,
      },
      Mutation: {
        ...mutations,
      },
    },
  },
})
