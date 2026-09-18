---
"@tealina/doc-ui": patch
---

Fix two ways the playground panel could show nothing instead of the error

A request that never reached the server — server not started, CORS refused, connection
dropped — left the panel exactly as it was. The rejection handler built the
`Client Side Error:` object and returned it, but only the fulfilled branch of the `.then`
was wired to the function that updates the panel, so the object settled a promise nobody
read. Both branches go through it now, custom request handlers included. This is the case
where the reason matters most and there was least to see.

An error response with an empty body rendered as a blank box. The fallback to
`response.statusText` was written as `msg ?? response.statusText`, but `await
response.text()` resolves `''` for an empty body rather than `null`, so `??` never fell
through. It is `||` now, in the playground, the login page and the API document fetch
alike — a bare status code with no body now shows as its status text.
