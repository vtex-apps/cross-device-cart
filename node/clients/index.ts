import { IOClients } from '@vtex/api'

import Orders from './orders'
import Checkout from './checkout'

export class Clients extends IOClients {
  public get checkout() {
    return this.getOrSet('checkout', Checkout)
  }

  public get orders() {
    return this.getOrSet('orders', Orders)
  }
}
