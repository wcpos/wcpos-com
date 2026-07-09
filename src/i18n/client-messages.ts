type MessageTree = Record<string, unknown>

export const SHARED_CLIENT_NAMESPACES = [
  'common',
  'footer',
  'consent',
  'errors',
  'header',
] as const

function isMessageTree(value: unknown): value is MessageTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readPath(messages: MessageTree, segments: string[]): unknown {
  let current: unknown = messages

  for (const segment of segments) {
    if (!isMessageTree(current) || !(segment in current)) return undefined
    current = current[segment]
  }

  return current
}

function writePath(target: MessageTree, segments: string[], value: unknown) {
  let current = target

  for (const segment of segments.slice(0, -1)) {
    const next = current[segment]
    if (!isMessageTree(next)) {
      current[segment] = {}
    }
    current = current[segment] as MessageTree
  }

  const leaf = segments.at(-1)
  if (leaf) current[leaf] = value
}

export function pickMessages(
  messages: MessageTree,
  keys: readonly string[]
): MessageTree {
  const picked: MessageTree = {}

  for (const key of keys) {
    const segments = key.split('.').filter(Boolean)
    if (segments.length === 0) continue

    const value = readPath(messages, segments)
    if (value === undefined) continue

    writePath(picked, segments, value)
  }

  return picked
}

export function clientMessages(
  messages: MessageTree,
  extras: readonly string[] = []
): MessageTree {
  return pickMessages(messages, [...SHARED_CLIENT_NAMESPACES, ...extras])
}
