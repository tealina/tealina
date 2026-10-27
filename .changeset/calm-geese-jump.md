---
"create-tealina": patch
---

Spell the template's api calls without the leading slash

The generated barrel keys a route by its logical path, so the scaffold's pages and README
follow `req.get('health')`, `req.post('login')` and `TakeBody<'post', 'article'>` instead of
`/health`. The route table a fresh project starts with — `'health'`, `'login'`, `'article'` —
carried the slash until now, and a scaffold is where the spelling is learned.
