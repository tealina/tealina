### A set of functions to create a type-safe API request client.

To use these functions, you need to specify the shape of the API type as shown below:

### Usage (with Fetch)
1. RPC style
  ```ts
  import { createFetchRPC } from '@tealina/client'
  import type { ApiTypesRecord } from 'server/api/v1'
 
  type ApiTypesRecord = {
    // First level is http method
    get: {
      // Second level is url endpoint
      status:{  
        response:{} 
        /// request payload
        parmas?:{}
        query?:{}
        headers?:{}
        body?:{}
      }
      'user/:id': { // Named parmas are supported
        response: { name: string }
        parmas: { id: string }
        //...
      }
      /// ...other apis
    };

    post: {
      ///....
    }
  }

  const rpc = createFetchRPC<ApiTypesRecord, RequestInit>(async (url, config) => {
     const response = await fetch(url, config)
     const data = await response.json()
     return data
  })
  
  rpc.get.status().then(result => console.log(result))
  rpc.get.user[':id']({ parmas: { id: 'user_id' }}).then(user => console.log(user.name))

  ```
 > The createXX function mainly handles type adaptation and parameter conversion. The actual return is a proxy object, which ultimately calls the handler you provided during initialization.
 
2. Traditional style
  ```ts
  import { createFetchClient } from '@tealina/client'

  type ApiTypesRecord = {
    //....
  }
 
  const req = createFetchClient<ApiTypesRecord, RequestInit>(async (url, config) => {
     const response = await fetch(url, config)
     const data = await response.json()
     return data
  })

  req.get('/status').then(result => console.log(result))

  ```

### Usage (with Axios)

1.  RPC style 
  ```ts
  import { createRawAxiosRPC } from '@tealina/client'
  import { axios } from 'axios'
  import type { AxiosRequestConfig } from 'axios'

  type ApiTypesRecord = {
    //....
  }

  const rpc = createAxiosRPC<ApiTypesRecord, AxiosRequestConfig>(
   c => axios.request(c).then(v => v.data)
  )
  ```
 
1. Traditional style
  ```ts
  import { createAxiosClient } from '@tealina/client'
  import { axios } from 'axios'
  import type { AxiosRequestConfig } from 'axios'

  type ApiTypesRecord = {
    //....
  }

  const req = createAxiosClient<ApiTypesRecord, AxiosRequestConfig>(c =>
   axios.request(c).then(v => v.data),
  )
  ```
  
1. Keep aixos raw response
```ts
  import { createRawAxiosRPC } from '@tealina/client'
  import { axios } from 'axios'
  import type { AxiosRequestConfig, AxiosResponse } from 'axios'

  type ApiTypesRecord = {
    //....
  }
 
  const rpc = createRawAxiosRPC<ApiTypesRecord, AxiosRequestConfig, AxiosResponse>(axios.request)

  rpc.get.status().then(rawResponse =>  rawResponse.status )
```

