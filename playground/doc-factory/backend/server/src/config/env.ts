// Node's own .env loader (>= 20.12), so this scaffold carries no `dotenv` dependency.
// A missing .env is the normal case: `.env.example` is what lives in version control.
try {
  process.loadEnvFile()
} catch {
  // no .env file — fall through to the defaults below
}

const kDefaultPort = 8000

const toPort = (raw: string | undefined) => {
  if (raw == null || raw === '') return kDefaultPort
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `PORT must be an integer between 1 and 65535, got "${raw}". ` +
        'Fix it in .env, or delete the file to use the default.',
    )
  }
  return port
}

export const PORT = toPort(process.env.PORT)

/**
 * The password the documentation page asks for. The default is the one the demo's
 * README documents; set `DOC_PASSWORD` to change it.
 */
export const DOC_PASSWORD = process.env.DOC_PASSWORD || '123'

/** Signs the session cookie the documentation page's login writes. */
export const SESSION_SECRET = process.env.SESSION_SECRET || 'the-secret-key'
