---
"create-tealina": patch
---

Spell the template's api calls without the leading slash

The generated barrel now keys a route by its logical path, so the scaffold's own pages and
its README follow `req.get('health')`, `req.post('login')` and `TakeBody<'post', 'article'>`
instead of the `/health` spelling. The route table a fresh project starts with —
`'health'`, `'login'`, `'article'` — carried the slash until now, and a scaffold is where
the spelling is learned.
