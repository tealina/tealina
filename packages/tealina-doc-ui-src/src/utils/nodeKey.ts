/**
 * A short, stable key for a document node. Rendering used to draw a random one;
 * deriving it from the node keeps react keys and anchor ids identical between
 * renders of the same document.
 */
export const nodeKey = (node: unknown) => {
  const text = JSON.stringify(node)
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

/** Pairs every node with a key that stays unique when a tuple repeats a type. */
export const keyedNodes = <T>(nodes: T[]) => {
  const seen = new Map<string, number>()
  return nodes.map(node => {
    const base = nodeKey(node)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return { key: count === 0 ? base : `${base}-${count}`, node }
  })
}
