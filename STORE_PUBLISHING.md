# Official store publishing

GitHub Releases remain the verifiable source and beta distribution. End users
should install the signed build from the Chrome Web Store, Microsoft Edge
Add-ons or Firefox Add-ons so the browser can verify it and deliver automatic
updates.

The first listing in each store is intentionally manual: the owner must accept
the store agreements, complete identity/account requirements, review the
listing and privacy answers, and choose its visibility. Once those drafts
exist, `.github/workflows/release.yml` submits every enabled tagged release.

## Files already prepared

- Listing text and privacy answers: `.github/store-listing/`
- Store screenshots and promo tile: `.github/store-assets/`
- Public privacy policy: `PRIVACY.md` and
  <https://sticky-reminder.pages.dev/privacy>
- Chrome and Firefox packages, Firefox review sources and checksums: generated
  by the Release workflow
- Native sidebar UI: `side_panel` for Chromium builds and `sidebar_action` for
  Firefox builds

## 1. Bootstrap Chrome Web Store

1. Register the publisher in the
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Create the item, upload the generated Chrome ZIP once, and complete the Store
   listing, Privacy and Distribution tabs using `.github/store-listing/`.
3. Enable the Chrome Web Store API v2, create a service account, and add its
   email to the publisher account. Follow Google's
   [service-account guide](https://developer.chrome.com/docs/webstore/service-accounts).
4. Add these GitHub Actions secrets:
   - `CHROME_EXTENSION_ID`
   - `CHROME_PUBLISHER_ID`
   - `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`
   - `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY` — the complete private key, including
     its BEGIN/END lines
5. Add repository variable `SUBMIT_CHROME=true`.
6. Add repository variable `PUBLIC_CHROME_STORE_URL` with the final listing URL.

Chrome requires two-step verification for publisher accounts. Do not commit the
service-account JSON or private key.

## 2. Bootstrap Firefox Add-ons

1. Create a listed add-on through the
   [AMO developer hub](https://addons.mozilla.org/developers/) using the Firefox
   ZIP and corresponding sources ZIP from the same release.
2. Complete its listing with `.github/store-listing/firefox-add-ons.md` and the
   prepared screenshots.
3. Create AMO API credentials as described in Mozilla's
   [web-ext signing guide](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/#package-sign-and-publish).
4. Add these GitHub Actions secrets:
   - `FIREFOX_EXTENSION_ID` — `sticky-reminder@andersseen`
   - `FIREFOX_JWT_ISSUER`
   - `FIREFOX_JWT_SECRET`
5. Add repository variable `SUBMIT_FIREFOX=true`.
6. Add repository variable `PUBLIC_FIREFOX_STORE_URL` with the final listing
   URL.

## 3. Bootstrap Microsoft Edge Add-ons

The current release workflow does not submit to Edge automatically. Bootstrap
Edge manually first, then decide whether it is worth adding Partner Center API
automation after the first review.

1. Create a developer account in
   [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview).
2. Create the extension listing and upload the generated Chrome ZIP; Edge uses
   the same Chromium MV3 build.
3. Reuse the Chrome listing text, privacy answers and screenshots from
   `.github/store-listing/` and `.github/store-assets/`.
4. Add repository variable `PUBLIC_EDGE_STORE_URL` with the final listing URL.
5. Add the same `PUBLIC_EDGE_STORE_URL` variable to the Cloudflare Pages
   production environment.

## 4. Verify credentials safely

In GitHub Actions, run the **Release** workflow from `main` with:

- `submit_stores`: enabled
- `dry_run`: enabled

The workflow performs the complete audit, build and test suite, then asks WXT
to authenticate without uploading. Disable a store by setting its `SUBMIT_*`
variable to `false` or deleting the variable.

## 5. Publish a version

After the pull request is merged, tag the exact commit with the version from
`apps/extension/package.json`:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The workflow validates the tag, rebuilds and tests both targets, creates the
GitHub Release, then submits enabled stores for review. Store review remains
controlled by Google and Mozilla; a successful workflow means the packages were
accepted for review, not that reviewers have approved them.

Edge review remains manual until an Edge submission step is added to the release
workflow.

## 6. Show official install buttons

GitHub Pages reads `PUBLIC_CHROME_STORE_URL`, `PUBLIC_EDGE_STORE_URL` and
`PUBLIC_FIREFOX_STORE_URL` from repository variables automatically. Add the same
variables to the Cloudflare Pages production environment. Until at least one URL
exists, the download page accurately shows “Store review pending” and keeps
manual install instructions available.
