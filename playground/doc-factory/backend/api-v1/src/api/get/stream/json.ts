import type { EmptyObj, OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import { setTimeout } from 'node:timers/promises'
import type { MultiTarget, WithHeaders } from 'tealina/utility-types'

interface UserSummary {
  id: number
  name: string
  email: string
  role: string
}

type ApiType = OpenHandler<
  EmptyObj,
  MultiTarget<{
    client: AsyncGenerator<UserSummary>
    doc: WithHeaders<
      {
        'Content-Type': 'application/json'
        'Transfer-Encoding': 'chunked'
      },
      UserSummary
    >
    server: void
  }>
>

/**
 * Stream users as newline-delimited JSON, one object at a time
 */
const handler: ApiType = async (_req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Transfer-Encoding': 'chunked',
  })

  const lastOne = {
    id: 5,
    name: 'Charlie Wilson',
    email: 'charlie@example.com',
    role: 'user',
  }
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user' },
    {
      id: 4,
      name: 'Alice Brown',
      email: 'alice@example.com',
      role: 'moderator',
    },
    lastOne,
  ]

  res.write('{"users":[\n')
  for (const user of users) {
    await setTimeout(2000)
    const suffix = user === lastOne ? '\n]}' : ',\n'
    res.write(JSON.stringify(user) + suffix)
  }
  res.end()
}

export default openApi(handler)
