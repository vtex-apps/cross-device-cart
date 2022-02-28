import { BUCKET, SETTINGS_PATH } from '../constants'

export const saveAppSettings = async (
  _: unknown,
  settings: AppSettings,
  { clients: { vbase }, vtex: { logger } }: Context
): Promise<boolean> => {
  try {
    await vbase.saveJSON(BUCKET, SETTINGS_PATH, settings)

    return true
  } catch (error) {
    logger.error({
      message: 'There was a problem saving the app settings',
      error,
    })

    return false
  }
}
