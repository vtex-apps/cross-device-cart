import React, { FC, Fragment, useState } from 'react'
import { useDevice } from 'vtex.device-detector'
import { FormattedMessage } from 'react-intl'
import { Button, ButtonWithIcon, IconClose, Modal } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'

import { MergeOptionsModal } from './MergeOptionsModal'

const CSS_HANDLES = ['actionBar', 'challengeText'] as const

const close = <IconClose />

interface Props extends CrossCartProps {
  handleAccept: (
    showToast: (toast: ToastParam) => void,
    strategy: string
  ) => Promise<void>
  handleDecline: () => void
  mutationLoading: boolean
  toastHandler: (toast: ToastParam) => void
  items: unknown[]
}

const ChallengeBlock: FC<Props> = ({
  challengeType,
  strategies,
  isAutomatic,
  handleAccept,
  handleDecline,
  mutationLoading,
  toastHandler,
  items,
}) => {
  const { device } = useDevice()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const handles = useCssHandles(CSS_HANDLES)

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const callToAction = (
    <Button
      size="small"
      variation="secondary"
      onClick={() => {
        isAutomatic ? handleAccept(toastHandler, 'add') : setIsModalOpen(true)
      }}
      isLoading={mutationLoading}
    >
      <FormattedMessage id="store/crossCart.challenge.cta" />
    </Button>
  )

  if (challengeType === 'actionBar' || challengeType === 'floatingBar') {
    const classes =
      challengeType === 'floatingBar'
        ? 'shadow-2 pa5 fixed bottom-0 z-999 left-0'
        : `pa4 tc ${device === 'phone' ? 'flex-column' : ''}`

    return (
      <Fragment>
        <MergeOptionsModal
          items={items}
          strategies={strategies}
          isOpen={isModalOpen}
          handleClose={handleCloseModal}
          showItems
        />
        <div
          className={`${classes} w-100 bg-base flex items-center justify-center ${handles.actionBar}`}
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
      </Fragment>
    )
  }

  if (challengeType === 'modal') {
    return (
      <Modal
        centered
        isOpen
        onClose={() => {
          handleDecline()
        }}
        bottomBar={<div className="nowrap">{callToAction}</div>}
      >
        <div className="dark-gray pv7">
          <span className={`${handles.challengeText}`}>
            <FormattedMessage id="store/crossCart.challenge.text" />
          </span>
        </div>
      </Modal>
    )
  }

  return null
}

export default ChallengeBlock
