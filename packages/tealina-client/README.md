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

## Fetch Integration

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
import { createFetchClient } from '@tealina/client'

const req = createFetchClient<ApiTypesRecord, RequestInit>(async (url, config) => {
  const response = await fetch(url, config)
  const data = await response.json()
  return data
})

// Usage
req.get('/status').then(result => console.log(result))
```

## Axios Integration

### RPC Style

```ts
import { createAxiosRPC } from '@tealina/client'
import { axios } from 'axios'
import type { AxiosRequestConfig } from 'axios'

const rpc = createAxiosRPC<ApiTypesRecord, AxiosRequestConfig>(
  config => axios.request(config).then(response => response.data)
)
```

### Traditional Style

```ts
import { createAxiosClient } from '@tealina/client'

const req = createAxiosClient<ApiTypesRecord, AxiosRequestConfig>(config =>
  axios.request(config).then(response => response.data)
)
```

### Raw Axios Response (Full Response Access)

```ts
import { createRawAxiosRPC } from '@tealina/client'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

const rpc = createRawAxiosRPC<ApiTypesRecord, AxiosRequestConfig, AxiosResponse>(
  axios.request
)

// Access full response object
rpc.get.status().then(rawResponse => console.log(rawResponse.status))
```

## How It Works

The `createXX` functions handle type adaptation and parameter conversion, returning a proxy object that ultimately invokes your provided handler function. This approach ensures:

- **Full type safety** throughout the request/response cycle
- **Autocompletion** for all endpoints and parameters
- **Flexible adapter pattern** for any HTTP client library

## Key Features

- 🔒 **Type Safety**: Complete end-to-end type checking
- 🎯 **IntelliSense**: Full autocompletion for API endpoints and parameters
- 🔌 **Adapter Support**: Works with Fetch, Axios, or any custom HTTP client
- 🏗️ **Two Styles**: Choose between RPC-style or traditional HTTP-style
- 📦 **Lightweight**: Zero dependencies, minimal bundle impact

## Notes

- Ensure your TypeScript configuration has strict null checks enabled for optimal type safety
- The RPC-style client uses JavaScript proxies for method chaining
- All create functions are generic and support custom configuration types
- Error handling should be implemented in your provided handler function