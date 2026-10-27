import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * A stand-in for JWT, small enough to read in one screen. The payload is base64url
 * JSON, the signature is an HMAC over that payload, and both halves are joined by a
 * dot. It is signed with a fixed demo secret, so it is not something to deploy.
 */
export type TokenClaims = {
  /** User id, kept as a string so the payload survives a round trip unchanged. */
  sub: string
  role: 'CUSTOMER' | 'ADMIN'
  /** Expiry, in seconds since the epoch. */
  exp: number
}

const kSecret = process.env.AUTH_SECRET ?? 'tealina-shop-demo-secret'
const kDefaultTtlSeconds = 60 * 60 * 8

const sign = (payload: string) =>
  createHmac('sha256', kSecret).update(payload).digest('base64url')

export const issueToken = (
  claims: Omit<TokenClaims, 'exp'>,
  ttlSeconds = kDefaultTtlSeconds,
) => {
  const payload = Buffer.from(
    JSON.stringify({
      ...claims,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    }),
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/**
 * Returns the claims for a well-formed, unexpired token and `null` for anything else.
 * The signature comparison is constant-time; a token from another build of the demo
 * simply fails here.
 */
export const readToken = (token: string): TokenClaims | null => {
  const [payload, signature, ...rest] = token.split('.')
  if (payload == null || signature == null || rest.length > 0) return null

  const expected = sign(payload)
  const given = Buffer.from(signature)
  const wanted = Buffer.from(expected)
  if (given.length !== wanted.length) return null
  if (!timingSafeEqual(given, wanted)) return null

  try {
    const claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as TokenClaims
    if (typeof claims.sub !== 'string') return null
    if (claims.role !== 'CUSTOMER' && claims.role !== 'ADMIN') return null
    if (typeof claims.exp !== 'number') return null
    if (claims.exp * 1000 <= Date.now()) return null
    return claims
  } catch {
    return null
  }
}
