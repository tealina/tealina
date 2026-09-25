---
"create-tealina": patch
---

Annotate the JavaScript scaffold's config with `TealinaConfig`

`template/common/js/tealina.config.js` typed itself through
`import('tealina').TealinaConifg` in its JSDoc. That name is now deprecated in favour of
`TealinaConfig`, and the scaffold should not be what teaches a user the misspelling. It
needs a `tealina` that exports the corrected name, which is why this follows that release.
