export const APP_NAME = 'vtex.cross-device-cart'
export const BUCKET = 'cross_device_cart'
export const SETTINGS_PATH = 'app_settings'
export const DEFAULT_SETTINGS = {
  isAutomatic: true,
  strategy: 'REPLACE',
} as const
export const DEFAULT_SALES_CHANNEL = '1'
export const ORDER_FORM_ID_PATTERN = /^[a-f0-9]{32}$/
