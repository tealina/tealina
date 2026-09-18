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

/** @type {Tealina.Open<{ body: LoginPayload }, { token: string }>} */
const handler = async (req, res) => {
  const { body } = req
  console.log(body.account)
  res.send({ token: 'JWT token' })
}

export default convention(openHandler, handler)
