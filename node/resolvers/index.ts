import { getSavedCart } from './getSavedCart'
import { saveCurrentCart } from './saveCurrentCart'
import { addSavedCartItemsToCurrentCart } from './addSavedCartItemsToCurrentCart'

export const queries = {
  getSavedCart,
}

export const mutations = {
  saveCurrentCart,
  addSavedCartItemsToCurrentCart,
}
