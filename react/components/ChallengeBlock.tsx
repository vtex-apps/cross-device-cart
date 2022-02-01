import React, { FC, useState } from 'react'
import { useDevice } from 'vtex.device-detector'
import { FormattedMessage } from 'react-intl'
import { Button, ButtonWithIcon, IconClose } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'

import { MergeOptionsModal } from './MergeOptionsModal'

const CSS_HANDLES = ['actionBar', 'challengeText'] as const

const close = <IconClose />

interface Props {
  handleAccept: (
    showToast: (toast: ToastParam) => void,
    strategy: Strategy
  ) => Promise<void>
  mergeStrategy: Strategy
  handleDecline: () => void
  mutationLoading: boolean
  toastHandler: (toast: ToastParam) => void
  advancedOptions: boolean
  /* items: unknown[] */
}

const ChallengeBlock: FC<Props> = ({
  mergeStrategy,
  handleAccept,
  handleDecline,
  mutationLoading,
  toastHandler,
  advancedOptions,
}) => {
  const { device } = useDevice()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const handles = useCssHandles(CSS_HANDLES)

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const deviceClass = `${device === 'phone' ? 'flex-column' : ''}`

  const callToAction = (
    <Button
      size="small"
      variation="secondary"
      onClick={() => {
        advancedOptions
          ? setIsModalOpen(true)
          : handleAccept(toastHandler, mergeStrategy)
      }}
      isLoading={mutationLoading}
    >
      <FormattedMessage id="store/crossCart.challenge.cta" />
    </Button>
  )

  return (
    <>
      <MergeOptionsModal
        /* items={items} */
        strategies={['ADD', 'COMBINE', 'REPLACE']}
        isOpen={isModalOpen}
        handleClose={handleCloseModal}
        handleAccept={handleAccept}
        toastHandler={toastHandler}
      />
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
          <span className="mh4">{callToAction}</span>
          <span>
            <ButtonWithIcon
              size="small"
              icon={close}
              variation="tertiary"
              onClick={() => {
                handleDecline()
              }}
              isLoading={mutationLoading}
            />
          </span>
        </div>
      </div>
    </>
  )
}

export default ChallengeBlock
