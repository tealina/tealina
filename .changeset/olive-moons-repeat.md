---
"@tealina/doc-ui": patch
---

Rebuild the document page on the current majors of jotai, kbar and the syntax highlighter

The page is a self-contained bundle, so these move inside it rather than in the app that embeds
it. What an app sees is the page itself: kbar's search palette is now the released 1.0 instead of
the old beta, and jotai, react-syntax-highlighter and the test-only jsdom come up to date.
