# AGENTS.md

The server package uses tealina: `server/src/api/v1/` is the route table and each
handler's type annotation is the source of truth. Read `server/AGENTS.md` before changing
anything under `server/src/api/` or `server/types/`.

From the workspace root, run the server's scripts with `pnpm -F server <script>`:
`v1`, `align`, `gdoc`, `dev`, `build`, `start`.

If the project was scaffolded with `--web`, `web/src/api/client.ts` (`client.js` in
`--js` mode) reads the server's types through `server/api/v1`. Renaming a field in a
handler is expected to break the frontend's type check — that is the point, not a bug.
