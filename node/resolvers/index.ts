import { getAppSettings } from './getAppSettings'
import { getSavedCart } from './getSavedCart'
import { saveAppSettings } from './saveAppSettings'
import { saveCurrentCart } from './saveCurrentCart'
import { mergeCarts } from './mergeCarts'

export const queries = {
  getAppSettings,
  getSavedCart,
}

export const mutations = {
  saveAppSettings,
  saveCurrentCart,
  mergeCarts,
}
