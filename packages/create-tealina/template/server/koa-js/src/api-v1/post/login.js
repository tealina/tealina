import { openHandler } from '../../app/middlewares/auth/openHandler.js'
import { convention } from '../../convention.js'

/**
 * Declare types with `@typedef` rather than inline in the handler's type: like the
 * `interface` keyword in the TypeScript tree, it keeps the type *name* in the API
 * documentation.
 *
 * @typedef {object} LoginPayload
 * @property {string} account
 * @property {string} password - This JSDoc comment will appear in the documentation
 */

/** @type {OpenAPI<{ body: LoginPayload }, { token: string }>} */
const handler = async ctx => {
  const { body } = ctx.request
  console.log(body.account)
  ctx.body = { token: 'JWT token' }
}

export default convention(openHandler, handler)
