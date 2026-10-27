---
"@tealina/client": major
---

Spell a call-site url without the leading slash

`req.get('/health')` is now `req.get('health')`. The generated record keys each route by its
logical path, so the slash was never the caller's to write, and the three spellings agree:
`req.get('health')`, `req.post.user[':id'].update()`, `TakeBody<'post', 'article'>`.

The url a `requester` receives still begins with `/`. A leading slash is tolerated at runtime,
but it is no longer a key of the type: `'/health'` is a compile error.
