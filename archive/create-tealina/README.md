# Create Tealina

Scaffold a Tealina-preconfigured full-stack project that adds type safety and type-driven API documentation to Express, Fastify, and Koa.

## ⚡ Quick Start

Choose your package manager:

```bash
# Using pnpm
pnpm create tealina

# Using bun  
bun create tealina

# Using npm
npm create tealina@latest

# Using yarn
yarn create tealina
```
Follow the interactive prompts to select your server framework and frontend preferences, It'll automatically set up everything.
> The frontend via `create-vite`.

## 🛠️ Pre-Configured Tech Stack

### Ready-to-Run Tealina Commands
```json
{
  "exports": {
    "./api/v1": {
      "types": "./types/api-v1.d.ts" // export types to Frontend
    }
  },
  "scripts": {
    "v1": "tealina api-v1",      // Already works
  }
}
```

### Complete Project Structure
```
your-project/
  packages/
    server/
      tealina.config.ts   # Pre-configured Tealina settings
      types/handler.d.ts  # Framework-specific handler types
    shared-types/   # Shared TypeScript types (frontend & backend)
    web/
      api/
        client.ts # Type-safe API client, supporting both RPC-style or trational calling conventions
  
  
```

## 📖 Learn More

Visit [Tealina Documentation](https://www.tealina.dev) to explore advanced features. 

---
