# Type-Safe API Client Utilities

A collection of functions for creating fully type-safe API request clients with seamless integration for both Fetch and Axios.

## Overview

These utilities provide type-safe API client creation with two distinct styles:
- **RPC-style**: Method-chain syntax for intuitive API calls
- **Traditional-style**: Familiar HTTP method functions with endpoint paths

## Installation

```bash
npm install @tealina/client
```

## Defining API Types

First, define your API structure using TypeScript interfaces:

```ts
import type { ApiTypesRecord } from '@tealina/client'

type ApiTypesRecord = {
  // First level represents HTTP methods
  get: {
    // Second level defines endpoint URLs
    '/status': {  
      response: {} 
      // Optional request payload definitions
      params?: {}
      query?: {}
      headers?: {}
      body?: {}
    }
    '/user/:id': { // Named parameters are supported
      response: { name: string }
      params: { id: string }
      //... other request options
    }
    // ... other API endpoints
  }

  post: {
    // ... POST endpoints
  }
  
  // Support for other HTTP methods (put, delete, patch, etc.)
}
```
It's recommend using [create-tealina](https://www.npmjs.com/package/create-tealina) to scaffold your project, which provides pre-configured `ApiTypeRecord` imports from the server - no manual setup required.

### RPC Style (Method Chaining)
```ts
import { createFetchRPC } from '@tealina/client'
import type { ApiTypesRecord } from 'server/api/v1'

const rpc = createFetchRPC<ApiTypesRecord, RequestInit>(async (url, config) => {
  const response = await fetch(url, config)
  const data = await response.json()
  return data
})

// Usage examples
rpc.get.status().then(result => console.log(result))

rpc.get.user[':id']({ params: { id: 'user_id' } }).then(user => console.log(user.name))
```

### Traditional Style

```ts
import axios, { type AxiosRequestConfig } from 'axios'
import { createAxiosClient } from '@tealina/client'
import type { ApiTypesRecord } from 'server/api/v1'

const instance = axios.create({
  baseURL: '/api/v1/',
})

export const req = createAxiosClient<ApiTypesRecord, AxiosRequestConfig>(c =>
  instance.request(c).then(v => v.data),
)

// Usage
req.get('/status').then(result => console.log(result))
```

## How It Works

The `createXX` functions handle type adaptation and parameter conversion, returning a proxy object that ultimately invokes your provided handler function. This approach ensures:

- **Autocompletion** for all endpoints and parameters
- **Flexible adapter pattern** for any HTTP client library

## Key Features

- 🔒 **Type Safety**: Complete end-to-end type checking
- 🎯 **IntelliSense**: Full autocompletion for API endpoints and parameters
- 🔌 **Adapter Support**: Works with Fetch, Axios, or any custom HTTP client
- 🏗️ **Two Styles**: Choose between RPC-style or traditional HTTP-style
- 📦 **Lightweight**: Zero dependencies, minimal bundle impact