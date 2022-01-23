📢 Use this project, [contribute](https://github.com/{OrganizationName}/{AppName}) to it or open issues to help evolve it using [Store Discussion](https://github.com/vtex-apps/store-discussion).

# CROSS DEVICE CART

<!-- DOCS-IGNORE:start -->
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-0-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->
<!-- DOCS-IGNORE:end -->

⚠️ **WORK IN PROGRESS - APP NOT PUBLISHED**

The main feature users are looking for is to keep an up-to-date shopping cart through different devices; one of the most important experiences of a truly unified commerce.

To do so, this app was created to expose two blocks to enable `logged in` users to retrieve their items from their recorded last session.

## Configuration

1. Import the app to your theme's dependencies in `manifest.json`, for example:

```json
  "dependencies": {
    // ...
    "vtex.cross-device-cart": "0.x"
  }
```

2. Decide if you will use the automatic challenge `block` or if you opt for the manual one `block`.

   1. If `block` declare the Block as a Challenge of each store template you want to have this feature activated, for i.e:

   ```diff

   ```

   2.If `block`, the block exported is a call to action button that we recommend placing inside the minicart layour, for i.e:

   ```diff

   ```

3. (Optional) You can tailor the default experience by declaring the standalone `block` and configuring it via props

   1. `block`

   ```json
   "cross-device-cart": {
     "props": {
       "challengeType": "floatingBar"
     }
   },
   ```

   2. `block`

   ```json
   "cross-device-cart": {
     "props": {
       "challengeType": "floatingBar"
     }
   },
   ```

### `cross-device-cart` props

| Prop name       | Type    | Description                                                                                                                                                                                                        | Default value             |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| `challengeType` | `enum`  | How the user challenge will be rendered. Possible values are `actionBar` which renders a full width block, `floatingBar` similar to the actionBar but positioned at the bottom, `modal` renders the modal directly | `actionBar`               |
| `strategy`      | `Array` | The selected strategies to resolve the cross cart action. Possible values are `add`, `combine`, `replace`                                                                                                          | `[add, combine, replace]` |

### `manual block` props

| Prop name  | Type    | Description                                                                                               | Default value             |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------- | ------------------------- |
| `strategy` | `Array` | The selected strategies to resolve the cross cart action. Possible values are `add`, `combine`, `replace` | `[add, combine, replace]` |

- `strategy` array:

| value     | Type     | Description                                                                                                                                       |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add`     | `string` | This strategy allows the customer to ADD the missing items to the ones currently in the session. This means that repeated items will be _OMITTED_ |
| `combine` | `string` | Sums both cart's items and quantities                                                                                                             |
| `replace` | `sting`  | Replaces _CURRENT_ cart items with the cross cart ones (last session)                                                                             |

## Modus Operandi _(not mandatory)_

There are scenarios in which an app can behave differently in a store, according to how it was added to the catalog, for example. It's crucial to go through these **behavioral changes** in this section, allowing users to fully understand the **practical application** of the app in their store.

If you feel compelled to give further details about the app, such as it's **relationship with the VTEX admin**, don't hesitate to use this section.

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
