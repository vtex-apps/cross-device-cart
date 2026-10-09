# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Shopper identity is now derived server-side from the store-user token (VTEX ID); `userId`/`userType` arguments are ignored.
- Saved references are only stored, returned or merged when the orderForm is owned by the shopper or anonymous; foreign references are cleared on read.
- `replaceCart` adopts the saved cart (`checkout.vtex.com` cookie) only when it belongs to the logged-in shopper, and only after the merge succeeded; foreign carts are never read, cleared, written or adopted.
- Adoption also requires the cart's (unmasked) profile email to match the logged-in shopper.
- Saved and current carts must match the browser's own `checkout.vtex.com` cookie.
- `saveAppSettings` requires admin access.

### Changed
- An anonymous saved cart is no longer adopted; its missing items are added to the current cart.
- An empty saved cart is no longer adopted.
- A refused merge is silent in automatic mode; the error toast is shown only in manual mode.

## [1.5.1] - 2026-02-04

### Fixed
- Updating README.

## [1.5.0] - 2024-06-28

## [1.4.9] - 2024-04-25

## [1.4.8] - 2023-12-26

## [1.4.7] - 2023-09-15

## [1.4.6] - 2022-07-22

## [1.4.5] - 2022-07-01

## [1.4.4] - 2022-04-07

### Fixed

- Cookie serialization error

## [1.4.3] - 2022-03-07

### Fixed

- Settings for new accounts

## [1.4.2] - 2022-03-03

### Fixed

- Action bar error handling for UX purposes

## [1.4.1] - 2022-03-03

### Fixed

- Incorrect INPUT type

## [1.4.0] - 2022-03-02

### Fixed

- Missing null assertion

## [1.3.1] - 2022-03-02

### Added

- Log errors

## [1.3.0] - 2022-03-01

### Added

- Modified clients options

## [1.2.2] - 2022-03-01

### Fixed

- Attempt to fix timeouts

## [1.2.1] - 2022-03-01

### Fixed

- Service variables

## [1.2.0] - 2022-03-01

### Added

- Admin settings panel

## [1.1.0] - 2022-02-26

### Added

- Set cookie via Frontend

## [1.0.1] - 2022-02-23

### Fixed

- Fixed settings on first time installation

## [1.0.0] - 2022-02-23

### Added

- New version replacing how the cross cart is handled

## [0.1.0] - 2022-02-17

### Added

- Initial release.
