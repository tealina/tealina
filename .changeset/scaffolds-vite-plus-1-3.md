---
"create-tealina": patch
---

Scaffolds pin Vite+ 1.3.0

The generated `pnpm-workspace.yaml` catalogs `vite-plus` 1.3.0 and aliases `vite` to the
matching `@voidzero-dev/vite-plus-core`, so a new project installs the current toolchain and
still resolves a single copy of Vite. The catalog is the scaffold's own pin; upgrading the
global `vp` does not change it.
