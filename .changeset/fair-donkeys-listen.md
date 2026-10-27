---
"@tealina/doc-ui": patch
---

Fix two ways the playground panel could show nothing instead of the error

A request that never reached the server — server not started, CORS refused, connection
dropped — left the panel exactly as it was. The rejection handler built the `Client Side
Error:` object and returned it, but only the fulfilled branch of the `.then` was wired to the
panel updater, so the object settled a promise nobody read. Both branches go through it now,
custom request handlers included.

An error response with an empty body rendered as a blank box: `await response.text()`
resolves `''` rather than `null`, so `msg ?? response.statusText` never fell through. It is
`||` now, in the playground, the login page and the API document fetch alike.
