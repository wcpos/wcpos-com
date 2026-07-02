# Social card (opengraph-image.png)

`src/app/opengraph-image.png` is rendered from `og-card.html`. To regenerate
after a branding or copy change, edit the template and run:

```sh
node_modules/.bin/playwright screenshot --viewport-size=1200,630 \
  scripts/og-image/og-card.html src/app/opengraph-image.png
```

The logo paths in the template mirror `src/components/icons/wcpos-logo.tsx`
(bubble fill lightened to #3F4956 so it reads on the slate background).
