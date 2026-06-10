/**
 * Persistence for the protective checkout failure states.
 *
 * The "payment received — order pending" and "payment status unknown" notices
 * exist to stop a customer from paying twice. If they lived only in React
 * state, a page reload would restore a fully payable checkout for a customer
 * whose payment may already have succeeded. These helpers persist exactly
 * those two failure kinds in sessionStorage (keyed by cart id) so the notice
 * survives a reload, until a successful order explicitly clears it.
 *
 * Deliberately conservative: nothing else is persisted, and any storage
 * error (private browsing, quota, disabled storage) degrades silently to the
 * previous in-memory-only behaviour.
 */

import type { CheckoutFailure, CheckoutFailureKind } from './checkout-errors'

const STORAGE_KEY_PREFIX = 'wcpos:checkout-pending:'

/** Failure kinds dangerous enough to survive a reload. */
const PERSISTED_KINDS = ['order_pending', 'payment_uncertain'] as const

type PersistedKind = (typeof PERSISTED_KINDS)[number]

interface PersistedPendingFailure {
  kind: PersistedKind
  message: string
  reference: string
  cartId: string
  storedAt: number
}

export interface RestoredPendingFailure {
  cartId: string
  failure: CheckoutFailure
}

export function isPersistedPendingKind(
  kind: CheckoutFailureKind
): kind is PersistedKind {
  return (PERSISTED_KINDS as readonly string[]).includes(kind)
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    // Accessing sessionStorage itself can throw (e.g. storage disabled).
    return null
  }
}

function parseEntry(raw: string | null): PersistedPendingFailure | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const entry = parsed as Record<string, unknown>
    if (
      typeof entry.kind === 'string' &&
      (PERSISTED_KINDS as readonly string[]).includes(entry.kind) &&
      typeof entry.message === 'string' &&
      entry.message.length > 0 &&
      typeof entry.reference === 'string' &&
      entry.reference.length > 0 &&
      typeof entry.cartId === 'string' &&
      entry.cartId.length > 0
    ) {
      return {
        kind: entry.kind as PersistedKind,
        message: entry.message,
        reference: entry.reference,
        cartId: entry.cartId,
        storedAt: typeof entry.storedAt === 'number' ? entry.storedAt : 0,
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Persist a protective failure for a cart. Non-protective kinds
 * (payment_failed / payment_cancelled) are ignored.
 */
export function persistPendingFailure(cartId: string, failure: CheckoutFailure): void {
  if (!cartId || !isPersistedPendingKind(failure.kind)) return
  const storage = getSessionStorage()
  if (!storage) return

  const entry: PersistedPendingFailure = {
    kind: failure.kind,
    message: failure.message,
    reference: failure.reference,
    cartId,
    storedAt: Date.now(),
  }

  try {
    storage.setItem(STORAGE_KEY_PREFIX + cartId, JSON.stringify(entry))
  } catch {
    // Quota exceeded / private mode — fall back to in-memory-only behaviour.
  }
}

/**
 * Read the most relevant persisted protective failure, if any.
 *
 * A reload creates a brand-new cart, so the current cart id will not match
 * the persisted one — all persisted entries are scanned instead. order_pending
 * (money definitely moved without an order) outranks payment_uncertain; ties
 * resolve to the most recent entry. Malformed entries are ignored.
 */
export function readPendingFailure(): RestoredPendingFailure | null {
  const storage = getSessionStorage()
  if (!storage) return null

  const entries: PersistedPendingFailure[] = []
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (!key || !key.startsWith(STORAGE_KEY_PREFIX)) continue
      const entry = parseEntry(storage.getItem(key))
      if (entry) entries.push(entry)
    }
  } catch {
    return null
  }

  if (entries.length === 0) return null

  entries.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'order_pending' ? -1 : 1
    }
    return b.storedAt - a.storedAt
  })

  const top = entries[0]
  return {
    cartId: top.cartId,
    failure: { kind: top.kind, message: top.message, reference: top.reference },
  }
}

/**
 * Remove every persisted protective failure. Called once a checkout
 * definitively succeeds (an order exists) — the do-not-pay-again guard is no
 * longer needed.
 */
export function clearPendingFailures(): void {
  const storage = getSessionStorage()
  if (!storage) return

  try {
    const keys: string[] = []
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) keys.push(key)
    }
    for (const key of keys) {
      storage.removeItem(key)
    }
  } catch {
    // Best effort — worst case the conservative notice shows again.
  }
}
