---
"@tealina/doc-ui": patch
---

Read and show a route by its logical path

A doc keys each route the way the generated barrel does, which no longer carries a leading
slash. The detail header joins `baseURL` and the path with a slash of its own rather than
concatenating them, so the url it displays is unchanged; `openApi2apiDoc` strips the slash
from a spec's path, so a document that went through `convertToOpenApiJson` comes back to
the same key it went in as.
