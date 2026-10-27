---
"create-tealina": minor
---

The scaffold writes files and stops

`--no-install` is gone because there is no longer an install to skip. `create` never runs
`pnpm install` or `gdoc`; it prints them, together with `pnpm dev`, as the project's first
commands.

Installing into a directory the same command may have just emptied, with a package manager
guessed from the user agent, was doing the risky part invisibly. The commands now run where
the user can see them, with the package manager the project will actually use.

A non-interactive run is a project name plus `--template <fw>`; no other flag was needed
to avoid a prompt.
