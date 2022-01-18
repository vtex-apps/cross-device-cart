import {
  ClientsConfig,
  LRUCache,
  Service,
  ParamsContext,
  ServiceContext,
  RecorderState,
} from '@vtex/api'

import { Clients } from './clients'
import { queries, mutations } from './resolvers'

const TIMEOUT_MS = 800

const memoryCache = new LRUCache<string, any>({ max: 5000 })
metrics.trackCache('status', memoryCache)

declare global {
  type Context = ServiceContext<Clients>
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
