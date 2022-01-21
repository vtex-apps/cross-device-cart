import { Service, ParamsContext, RecorderState } from '@vtex/api'

import clients, { Clients } from './clients'
import { queries, mutations } from './resolvers'

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
