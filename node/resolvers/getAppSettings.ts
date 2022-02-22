import { BUCKET, SETTINGS_PATH } from '../constants'

export const getAppSettings = async (
  _: unknown,
  __: unknown,
  { clients: { vbase }, vtex: { logger } }: Context
): Promise<AppSettings | null> => {
  try {
    const appSettings: AppSettings = await vbase.getJSON(
      BUCKET,
      SETTINGS_PATH,
      true
    )

    return appSettings
  } catch (error) {
    logger.error({
      message: 'There was a problem fetching the app settings',
      error,
    })

    return null
  }
}
