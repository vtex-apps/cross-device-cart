📢 Use this project, [contribute](https://github.com/{OrganizationName}/{AppName}) to it or open issues to help evolve it using [Store Discussion](https://github.com/vtex-apps/store-discussion).

# CROSS DEVICE CART

<!-- DOCS-IGNORE:start -->
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-0-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->
<!-- DOCS-IGNORE:end -->

The main feature users are looking for is to keep an up-to-date shopping cart through different devices; one of the most important experiences of a truly unified commerce.

To do so, this app was created to to enable `logged in` users to retrieve their items from their last session.

## Configuration

1. Import the app to your theme's dependencies in `manifest.json`, for example:

   ```json
     "dependencies": {
       // ...
       "vtex.cross-device-cart": "0.x"
     }
   ```

2. Add the `cross-device-cart` block as a children of your store header, for i.e:

   ```diff
   "header-layout.desktop": {
       "children": [
   +     "cross-device-cart",
         "flex-layout.row#1-desktop",
         "flex-layout.row#2-desktop",
         "flex-layout.row#3-desktop",
         "sticky-layout#4-desktop"
       ]
     },
   ```

3. (Optional) You can tailor the default experience by declaring the standalone block and configuring it via props

   ```json
   "cross-device-cart": {
     "props": {
       "isAutomatic": "false",
       "mergeStrategy": "REPLACE"
     }
   },
   ```

### `cross-device-cart` props

| Prop name         | Type      | Description                                                                                                                                                                                                 | Default value |
| ----------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `isAutomatic`     | `boolean` | If the items merge is done automatically or requires user input via a challenge block. If `false`, an action bar will be rendered where the block is declared on your store-theme                           | `true`        |
| `mergeStrategy`   | `enum`    | The default strategy for merging carts `ADD`, `COMBINE`, `REPLACE`                                                                                                                                          | `ADD`         |
| `advancedOptions` | `boolean` | (Dependency of `isAutomatic`) If isAutomatic is set to `false`, you can opt to enable this prop. This renders a modal when the user accepts the challenge, with all the 3 strategies for the user to decide | `false`       |

- `mergeStrategy` enum:

| value     | Type     | Description                                                                                          |
| --------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `ADD`     | `string` | ADDS the missing items to the current cart session. This means that repeated items will be _OMITTED_ |
| `COMBINE` | `string` | SUMS both cart's items and quantities into one                                                       |
| `REPLACE` | `sting`  | REPLACES current cart items                                                                          |

## Customization

| CSS Handles     |
| --------------- |
| `actionBar`     |
| `challengeText` |

<!-- DOCS-IGNORE:start -->

## Contributors ✨

Thanks goes to these wonderful people:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind are welcome!

<!-- DOCS-IGNORE:end -->
