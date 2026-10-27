---
"@tealina/doc-ui": patch
---

Read and show a route by its logical path

A doc keys each route the way the generated barrel does, with no leading slash. The detail
header joins `baseURL` and the path with a slash of its own rather than concatenating, so the
displayed url is unchanged; `openApi2apiDoc` strips the slash from a spec's path, so a
document that went through `convertToOpenApiJson` keeps the key it went in with.
