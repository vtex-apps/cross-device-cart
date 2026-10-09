# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Shopper identity and sales channel are now derived server-side (VTEX ID token and segment); client `userId`, `salesChannel` and `userType` arguments are ignored.
- Saved cart references are validated against the orderForm owner on save, on read and on merge; foreign references are deleted on read.
- `saveAppSettings` now requires an authorized admin.
- `getSavedCart` is now `PRIVATE` cache scope.

### Changed
- Moved to the `graphql` builder 2.x (explicit `@auth` scopes). The runtime dependency `@vtex/api` is now 6.51.0 (the `scope` argument of `@auth` needs 6.50 or later) and the local TypeScript tooling 4.9.5.
- The log of the order event that removes a saved cart reference no longer contains any identifier, and owner and token lookups are never served from a cache.
- The cart mutations and the settings mutation now use a private cache scope, and their client documents request the private route.
- A failed owner lookup on either the saved or the current cart now leaves `replaceCart` as a no-op (nothing written, no cookie, reference kept).
- Checkout failures in the same-cart and empty-saved-cart paths of `replaceCart` are now caught and logged without ids.
- A client-sent `userId` that differs from the authenticated shopper is still ignored and now logs a warning without identifiers.
- The cross-cart block ignores merge results that arrive after the session changed or the block was removed.
- `replaceCart` adopts a saved cart (the `checkout.vtex.com` cookie and the strategy applied on the saved cart, as before) only when it is the shopper's stored reference and owned by the shopper. Anonymous saved carts only add their missing items to the current cart. Any other saved cart is refused and its reference removed.
- The items of a current cart that belongs to another profile are never merged.
- Refused merges no longer show an error toast in automatic mode.

### Deprecated
- GraphQL arguments `userId`, `salesChannel` and `userType` (removed in the next major).

## [2.0.3] - 2024-10-22

### Added
- Save logic using SC.
- Logic not to recover paymentData to the new cart.

## [2.0.2] - 2024-10-21

## [2.0.1] - 2024-10-21

## [2.0.0] - 2024-10-21

## [1.6.0] - 2024-10-21

### Fixed
- Replace cart logic: to return the current orderFormId instead of the previous one

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
