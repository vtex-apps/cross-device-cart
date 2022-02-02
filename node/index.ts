import { Service, ParamsContext, RecorderState } from '@vtex/api'

import clients, { Clients } from './clients'
import { queries, mutations } from './resolvers'
import { updateSavedCartReference } from './events'

export default new Service<Clients, RecorderState, ParamsContext>({
  clients,
  events: {
    updateOnCreatedOrder: updateSavedCartReference,
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
