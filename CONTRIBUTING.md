# Tealina Contributing Guide

Hi! We are really excited that you are interested in contributing to Tealina. Before submitting your contribution, please make sure to take a moment and read through the following guide:

## Repo Setup

The Tealina repo is a monorepo using pnpm workspaces. The package manager used to install and link dependencies must be [pnpm](https://pnpm.io/).

To develop and test:

1. Run `pnpm install` in root folder

2. Run `pnpm -F tealina test` to test `tealina` package

3. Run
   - `pnpm run test` to run all packages tests

The other commands declared in package.json also run in the same format

## Hints for create new scafold template

A scafold template include two parts below:

1. dynamic [handler file](./packages/create-tealina/src/template-factory)
2. static [files](./packages/create-tealina/template/server)

## Debugging

### VS Code

There's a [gdoc-debug-entry.js](packages/tealina/test/gdoc-debug-entry.js) for debug document generation. you can follow the [guide](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations) create launch.json

## Pull Request Guidelines

- Checkout a topic branch from a base branch, e.g. `main`, and merge back against that branch.

- If adding a new feature:

  - Add accompanying test case.
  - Provide a convincing reason to add this feature. Ideally, you should open a suggestion issue first and have it approved before working on it.

- If fixing bug:

  - If you are resolving a special issue, add `(fix #xxxx[,#xxxx])` (#xxxx is the issue id) in your PR title for a better release log, e.g. `fix: some bug (fix #666)`.
  - Provide a detailed description of the bug in the PR. Live demo preferred.
  - Add appropriate test coverage if applicable.

- It's OK to have multiple small commits as you work on the PR - GitHub can automatically squash them before merging.

- Make sure tests pass!

- Commit messages must follow the [commit message convention](./.github/commit-convention.md) so that changelogs can be automatically generated.
