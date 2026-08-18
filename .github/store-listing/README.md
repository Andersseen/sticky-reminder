# Official store listing kit

This directory is the source of truth for the Chrome Web Store and Firefox
Add-ons listings. Keep its claims aligned with the manifest, `PRIVACY.md` and
the released build.

## Public URLs

- Homepage: <https://sticky-reminder.pages.dev/>
- Support: <https://github.com/Andersseen/sticky-reminder/issues>
- Privacy policy: <https://sticky-reminder.pages.dev/privacy>
- Source: <https://github.com/Andersseen/sticky-reminder>

## Release checklist

1. Copy the listing text and permission answers from this directory.
2. Upload the matching browser ZIP from the GitHub Release.
3. Upload the PNG files from `.github/store-assets/`.
4. Confirm the store version equals `apps/extension/package.json`.
5. Confirm the privacy-policy URL is public without authentication.
6. Recheck every data-use answer whenever permissions or network behavior
   change.

Store credentials, extension IDs and signing secrets must never be committed.

