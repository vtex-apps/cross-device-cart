import { BUCKET, DEFAULT_SETTINGS, SETTINGS_PATH } from '../constants'

export const getAppSettings = async (
  _: unknown,
  __: unknown,
  { clients: { vbase } }: Context
): Promise<AppSettings['settings']> => {
  const appSettings = await vbase.getJSON<AppSettings | null>(
    BUCKET,
    SETTINGS_PATH,
    true
  )

  if (!appSettings) {
    return DEFAULT_SETTINGS
  }

  return appSettings.settings
}
