import React, { FC, Fragment, useEffect, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import {
  Alert,
  Layout,
  PageBlock,
  PageHeader,
  Spinner,
  Toggle,
  Divider,
} from 'vtex.styleguide'
import { useMutation, useQuery } from 'react-apollo'

import GET_APP_SETTINGS from '../../graphql/getAppSettings.gql'
import SAVE_APP_SETTINGS from '../../graphql/saveAppSettings.gql'

const AdminPanel: FC = () => {
  const [isAutomatic, setIsAutomatic] = useState(true)
  const { data, loading: loadingSettings, error: settingsError } = useQuery(
    GET_APP_SETTINGS
  )

  const [saveSettings] = useMutation(SAVE_APP_SETTINGS)

  const handleToggleAutomatic = () => {
    saveSettings({
      variables: {
        isAutomatic: !isAutomatic,
      },
    })
    setIsAutomatic(!isAutomatic)
  }

  useEffect(() => {
    if (data?.appSettings) {
      setIsAutomatic(data.appSettings.isAutomatic)
    }
  }, [data?.appSettings])

  if (settingsError) {
    console.error(settingsError)
  }

  return (
    <Layout
      pageHeader={
        <PageHeader
          title={<FormattedMessage id="admin/cross-device-cart.title" />}
          subtitle={<FormattedMessage id="admin/cross-device-cart.subtitle" />}
        />
      }
    >
      <PageBlock>
        {settingsError ? (
          <Alert type="error">
            <FormattedMessage id="admin/cross-device-cart.error" />
          </Alert>
        ) : loadingSettings ? (
          <div className="flex justify-center mv5">
            <Spinner />
          </div>
        ) : (
          <Fragment>
            <Toggle
              label={
                isAutomatic ? (
                  <FormattedMessage id="admin/cross-device-cart.automatic-toggle-automatic" />
                ) : (
                  <FormattedMessage id="admin/cross-device-cart.automatic-toggle-manual" />
                )
              }
              semantic
              checked={isAutomatic}
              onChange={handleToggleAutomatic}
              helpText={
                <FormattedMessage id="admin/cross-device-cart.automatic-toggle-help-text" />
              }
            />

            <div className="pt6">
              <Divider />
            </div>
            <p className="gray lh-copy">
              <FormattedMessage id="admin/cross-device-cart.automatic-toggle-explanation" />
            </p>
          </Fragment>
        )}
      </PageBlock>
    </Layout>
  )
}

export { AdminPanel }
