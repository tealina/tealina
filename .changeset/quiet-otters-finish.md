---
"create-tealina": minor
---

The scaffold writes files and stops

`--no-install` is gone because there is no longer an install to skip. `create` never runs
`pnpm install` or `gdoc`; it prints them, with `pnpm dev`, as the project's first commands.
Installing into a directory the same command may have just emptied, with a package manager
guessed from the user agent, was doing the risky part invisibly.

A non-interactive run is a project name plus `--template <fw>`.
