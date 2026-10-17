import { defineConfig } from 'vite'
import { API_BASE_URL } from 'api-v1/version'

export default defineConfig({
  server: {
    // The page and the API are one origin here, which is why no backend template sends
    // CORS headers. Point this at whatever `PORT` the server is running on — the default
    // is 8000, from the root `.env.example`.
    proxy: { [API_BASE_URL]: 'http://localhost:8000' },
  },
})
