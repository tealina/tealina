---
"@tealina/client": major
---

Spell a call-site url without the leading slash

`req.get('/health')` is now `req.get('health')`. The record a project generates keys each
route by its logical path, so the slash was never the caller's to write — and the three
spellings a caller meets now agree: `req.get('health')`, `req.post.user[':id'].update()`,
`TakeBody<'post', 'article'>`.

The url a `requester` receives still begins with `/`, whichever way it was written, so one
that composes an absolute path needs no guard of its own. A leading slash is still
tolerated at runtime, but it is no longer a key of the type: `'/health'` is a compile error
rather than a second spelling of the same route.
