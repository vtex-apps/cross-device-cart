import { getAppSettings } from './getAppSettings'
import { getSavedCart } from './getSavedCart'
import { saveAppSettings } from './saveAppSettings'
import { saveCurrentCart } from './saveCurrentCart'
import { replaceCart } from './replaceCart'

export const queries = {
  getAppSettings,
  getSavedCart,
}

export const mutations = {
  saveAppSettings,
  saveCurrentCart,
  replaceCart,
}
