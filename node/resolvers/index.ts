import { getSavedCart } from './getSavedCart'
import { saveCurrentCart } from './saveCurrentCart'
import { mergeCarts } from './mergeCarts'

export const queries = {
  getSavedCart,
}

export const mutations = {
  saveCurrentCart,
  mergeCarts,
}
