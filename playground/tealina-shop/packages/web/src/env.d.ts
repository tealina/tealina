/**
 * Vite injects a stylesheet imported for its side effect; the type checker only needs
 * to know the specifier resolves. `vite/client` is left out of `types` on purpose (see
 * `tsconfig.json`), so this is the one declaration it would otherwise have supplied.
 */
declare module '*.css'
