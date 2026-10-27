import { setTimeout } from 'node:timers/promises'
import type { ActivityEvent } from './model.js'
import { activity } from './store.js'

/** Activity newer than `sinceId`, oldest first, so a stream can replay it in order. */
export const listActivity = (sinceId = 0): ActivityEvent[] =>
  activity.filter(event => event.id > sinceId).sort((a, b) => a.id - b.id)

export const latestActivityId = () =>
  activity.reduce((max, event) => Math.max(max, event.id), 0)

export type ActivityStreamOptions = {
  /** Aborting stops the replay and closes the stream early. */
  signal: AbortSignal
  write: (chunk: string) => void
  /** How many of the newest events replay on connect. */
  replay?: number
  /** How many events to send before the stream closes itself. */
  limit?: number
  /** How long to wait for something new, and the retry hint sent to the browser. */
  intervalMs?: number
}

/**
 * Frame the shop's activity as server-sent events: replay the newest few, then poll
 * until `limit` events have gone out. The caller owns the socket; this function only
 * decides what to write.
 */
export const streamActivity = async ({
  signal,
  write,
  replay = 3,
  limit = 8,
  intervalMs = 1500,
}: ActivityStreamOptions): Promise<void> => {
  write(`retry: ${intervalMs}\n\n`)

  let lastId = Math.max(0, latestActivityId() - replay)
  let sent = 0
  while (!signal.aborted && sent < limit) {
    for (const event of listActivity(lastId)) {
      write(`id: ${event.id}\n`)
      write(`event: ${event.type}\n`)
      write(`data: ${JSON.stringify(event)}\n\n`)
      lastId = event.id
      sent += 1
      if (sent >= limit) break
    }
    if (sent < limit) {
      try {
        await setTimeout(intervalMs, undefined, { signal })
      } catch {
        return
      }
    }
  }

  if (!signal.aborted) {
    write(
      'event: close\ndata: {"message":"Stream finished. Reload to replay it."}\n\n',
    )
  }
}
