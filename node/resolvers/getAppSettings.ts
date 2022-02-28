import { BUCKET, DEFAULT_SETTINGS, SETTINGS_PATH } from '../constants'

export const getAppSettings = async (
  _: unknown,
  __: unknown,
  { clients: { vbase }, vtex: { logger } }: Context
): Promise<AppSettings | null> => {
  const appSettings: AppSettings | null = await vbase.getJSON(
    BUCKET,
    SETTINGS_PATH,
    true
  )

  if (!appSettings) {
    logger.error({
      message: 'There was a problem fetching the app settings',
    })

    return DEFAULT_SETTINGS
  }

  return appSettings
}
