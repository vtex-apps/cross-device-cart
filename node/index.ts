import { Service, ParamsContext, RecorderState } from '@vtex/api'

import clients, { Clients } from './clients'
import { queries, mutations } from './resolvers'
import { eventsErrorHandler, updateSavedCartReference } from './events'

export default new Service<Clients, RecorderState, ParamsContext>({
  clients,
  events: {
    updateOnCreatedOrder: [eventsErrorHandler, updateSavedCartReference],
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
