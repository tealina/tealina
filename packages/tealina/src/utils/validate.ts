//https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
const HTTP_METHODS = [
  'connect',
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put',
  'trace',
]

export const isValidHttpMethod = (method: string) =>
  HTTP_METHODS.includes(method)

export const validateKind = (kind: string) => {
  const isValid = isValidHttpMethod(kind)
  if (isValid) return isValid
  throw new Error(
    `Invalid directory name, Should be http method or "func", got:[${kind}]`,
  )
}
