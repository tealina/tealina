import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // The page and the API are one origin here, which is why no server template sends
    // CORS headers. Point this at whatever `PORT` the server is running on — the default
    // is 8000, from the root `.env.example`.
    proxy: { '/api': 'http://localhost:8000' },
  },
})
