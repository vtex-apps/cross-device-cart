import React, { FC, Fragment } from 'react'
import { FormattedMessage } from 'react-intl'
import { Button, Divider, Modal } from 'vtex.styleguide'

import { capitalize } from '../utils'
import {
  ADD,
  ADD_DESCRIPTION,
  COMBINE,
  COMBINE_DESCRIPTION,
  REPLACE,
  REPLACE_DESCRIPTION,
} from '../utils/constants'

interface Props {
  items: any[]
  strategies: Strategy[]
  isOpen: boolean
  handleClose: () => void
  showItems?: boolean
}

const MergeOptionsModal: FC<Props> = ({
  items,
  strategies,
  isOpen,
  handleClose,
  showItems = true,
}) => {
  const handleCloseModal = () => {
    handleClose()
  }

  const handleMergeCarts = (strategy: string) => {
    // eslint-disable-next-line no-console
    console.log({ strategy })
  }

  const actionButtons = strategies.map((strategy: string) => {
    let description = ''

    switch (strategy) {
      case ADD:
        description = ADD_DESCRIPTION
        break

      case COMBINE:
        description = COMBINE_DESCRIPTION
        break

      case REPLACE:
        description = REPLACE_DESCRIPTION
        break

      default:
        break
    }

    return (
      <Fragment key={strategy}>
        <div className="w-33 pa5">
          <h3 className="tc black-80">{capitalize(strategy)} Carts</h3>
          <p className="dark-gray t-small">{description}</p>
          <Button block onClick={() => handleMergeCarts(strategy)}>
            {/* <FormattedMessage id="store/crossCart.modal.buttons.merge" /> */}
            Hazlo
          </Button>
        </div>
      </Fragment>
    )
  })

  const savedCartItems = []
  const numOfProductsToShow = items.length <= 4 ? items.length : 4

  for (let i = 0; i < numOfProductsToShow; i++) {
    const {
      id,
      name,
      imageUrls,
      additionalInfo: { brandName },
    } = items[i]

    savedCartItems.push(
      <div key={id} className="w-50 pa3">
        <div
          className="flex items-center w-100 br2 pa1"
          style={{
            boxShadow: 'rgba(61, 62, 64, 0.2) 0px 3px 9px 0px',
            height: '120px',
          }}
        >
          <div className="w-third">
            <img src={imageUrls.at1x} height="90px" alt={name} />
          </div>
          <div className="w-two-thirds">
            <p
              className="gray t-small mb1"
              style={{ textTransform: 'uppercase' }}
            >
              {brandName}
            </p>
            <h4 className="mt0 near-black">{name}</h4>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      centered
      responsiveFullScreen
      onClose={handleCloseModal}
    >
      <div className="merge-options mb7">
        <h3 className="tc mb0">
          <FormattedMessage id="store/crossCart.modal.buttons.title" />
        </h3>
        <div className="flex">{actionButtons}</div>
      </div>

      {showItems && (
        <Fragment>
          <Divider />
          <div className="saved-cart">
            <h3 className="tc mb0">
              <FormattedMessage id="store/crossCart.modal.previous-cart" />
            </h3>
            <div className="saved-cart-items flex flex-wrap justify-center">
              {savedCartItems}
            </div>
            <div>
              {items.length > 4 && (
                <h4 className="tc black-80">
                  + {items.length - 4}{' '}
                  <FormattedMessage id="store/crossCart.modal.more-items" />{' '}
                </h4>
              )}
            </div>
          </div>
        </Fragment>
      )}
    </Modal>
  )
}

export { MergeOptionsModal }
