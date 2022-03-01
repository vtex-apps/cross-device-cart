import { BUCKET, DEFAULT_SETTINGS, SETTINGS_PATH } from '../constants'

export const getAppSettings = async (
  _: unknown,
  __: unknown,
  { clients: { vbase }, vtex: { logger } }: Context
): Promise<AppSettings['settings']> => {
  const { settings } = await vbase.getJSON<AppSettings>(
    BUCKET,
    SETTINGS_PATH,
    true
  )

  if (!settings) {
    logger.error({
      message: 'There was a problem fetching the app settings',
    })

    return DEFAULT_SETTINGS
  }

  return settings
}
