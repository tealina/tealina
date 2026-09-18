// Node's own .env loader (>= 20.12), so this scaffold carries no `dotenv` dependency.
// A missing .env is the normal case: `.env.example` is what lives in version control.
try {
  process.loadEnvFile()
} catch {
  // no .env file — fall through to the defaults below
}

const kDefaultPort = 8000

/**
 * @param {string | undefined} raw
 * @returns {number}
 */
const toPort = raw => {
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
