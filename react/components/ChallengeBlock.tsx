import React, { FC, Fragment } from 'react'
import { useDevice } from 'vtex.device-detector'
import { FormattedMessage } from 'react-intl'
import { Button, ButtonWithIcon, IconClose } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'

const CSS_HANDLES = ['actionBar', 'challengeText'] as const

const closeIcon = <IconClose />

interface Props {
  handleAccept: () => void
  handleDecline: () => void
  mutationLoading: boolean
}

const ChallengeBlock: FC<Props> = ({
  handleAccept,
  handleDecline,
  mutationLoading,
}) => {
  const { device } = useDevice()
  const handles = useCssHandles(CSS_HANDLES)

  const deviceClass = `${device === 'phone' ? 'flex-column' : ''}`

  return (
    <Fragment>
      <div
        className={`${deviceClass} pa4 tc w-100 bg-base flex items-center justify-center ${handles.actionBar}`}
      >
        <span
          className={`${handles.challengeText} t-small ${
            device === 'phone' ? 'pb3' : ''
          }`}
        >
          <FormattedMessage id="store/crossCart.challenge.text" />
        </span>
        <div className="flex">
          <span className="mh4">
            <Button
              size="small"
              variation="secondary"
              onClick={() => {
                handleAccept()
              }}
              isLoading={mutationLoading}
            >
              <FormattedMessage id="store/crossCart.challenge.cta" />
            </Button>
          </span>
          <span>
            <ButtonWithIcon
              size="small"
              icon={closeIcon}
              variation="tertiary"
              onClick={() => {
                handleDecline()
              }}
              isLoading={mutationLoading}
            />
          </span>
        </div>
      </div>
    </Fragment>
  )
}

export default ChallengeBlock
