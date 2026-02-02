📢 Use this project, [contribute](https://github.com/vtex-apps/cross-device-cart) to it or open issues to help evolve it using [Store Discussion](https://github.com/vtex-apps/store-discussion).

# Cross Device Cart

[<i class="fa-brands fa-github"></i> Source code](https://github.com/vtex-apps/cross-device-cart)

> ⚠️ This app is no longer maintained by VTEX. This means support and maintenance are no longer provided.

The Cross Device Cart app keeps a user’s shopping cart synchronized across devices, allowing logged-in users to restore their cart from their most recent session.

## Configuration

1.  Install the app and then import it to your theme's peer dependencies in `manifest.json`,

```json
  "peerDependencies": {
    // ...
    "vtex.cross-device-cart": "1.x"
  }
```

2. Add the `cross-device-cart` block as `children` of your store header, desktop and mobile, for example:

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
     "header-layout.mobile": {
       "children": [
   +     "cross-device-cart",
         "flex-layout.row#1-mobile",
         "sticky-layout#2-mobile"
       ]
     },
   ```

3. (Optional) You can tailor the default experience by accessing the admin app settings.  
   By default, the app handles the replacement automatically. But if you set it to manual, a challenge block will be rendered as an action bar for the user to interact with.

## Customization

| CSS Handles     |
| --------------- |
| `actionBar`     |
| `challengeText` |

<!-- DOCS-IGNORE:start -->

## Contributors

Thanks goes to these wonderful people:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind are welcome!

<!-- DOCS-IGNORE:end -->
