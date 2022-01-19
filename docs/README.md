📢 Use this project, [contribute](https://github.com/{OrganizationName}/{AppName}) to it or open issues to help evolve it using [Store Discussion](https://github.com/vtex-apps/store-discussion).

# CROSS DEVICE CART

<!-- DOCS-IGNORE:start -->
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-0-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->
<!-- DOCS-IGNORE:end -->

The main feature users are looking for is to keep an up-to-date shopping cart through different devices; one of the most important experiences of a truly unified commerce.

To do so in VTEX we created a feature that enables `logged in` users to retrieve their items on any session.

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

3. (Optional) Declare the `cross-device-cart` block, using its props to define the Challenge UI that will be rendered:

```json
"cross-device-cart": {
  "props": {
    "challengeType": "notification"
  }
},
```

### `cross-device-cart` props

| Prop name       | Type     | Description                                                                                                      | Default value |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------------------- | ------------- |
| `challengeType` | `string` | How the user challenge will be rendered. Possible values are `actionBar`, `floatingBar`, `notification`, `modal` | `actionBar`   |

## Customization

`No CSS Handles are available yet for the app customization.`

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
