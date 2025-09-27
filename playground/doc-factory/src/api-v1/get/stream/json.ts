import { setTimeout } from 'node:timers/promises'
import type { EmptyObj, OpenHandler } from '../../../../types/handler.js'

type ApiType = OpenHandler<
  EmptyObj,
  AsyncGenerator<{ id: number; name: string; email: string; role: string }>
>

const handler: ApiType = async (req, res) => {
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
    const jsonStr = JSON.stringify(user)
    const suffix = user == lastOne ? '\n]}' : ',\n'
    res.write(jsonStr + suffix)
  }
  res.end()
}

export default handler
