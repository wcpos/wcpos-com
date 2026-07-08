import crypto from 'node:crypto'

// Discord publishes the application verify key as a raw 32-byte Ed25519
// public key in hex. node:crypto only imports structured keys, so the raw
// key is wrapped in the fixed SPKI DER header for Ed25519 (RFC 8410).
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')
const RAW_PUBLIC_KEY_BYTES = 32
const SIGNATURE_BYTES = 64

function fromHex(value: string, expectedBytes: number): Buffer | null {
  if (!/^[0-9a-fA-F]+$/.test(value) || value.length !== expectedBytes * 2) {
    return null
  }
  return Buffer.from(value, 'hex')
}

/**
 * Verifies a Discord interaction request signature (Ed25519 over
 * timestamp + raw body). Every failure mode — malformed hex, wrong lengths,
 * crypto errors — returns false rather than throwing: the route treats any
 * unverifiable request as unauthenticated.
 */
export function verifyDiscordInteractionSignature({
  publicKeyHex,
  signatureHex,
  timestamp,
  rawBody,
}: {
  publicKeyHex: string
  signatureHex: string
  timestamp: string
  rawBody: string
}): boolean {
  const rawKey = fromHex(publicKeyHex, RAW_PUBLIC_KEY_BYTES)
  const signature = fromHex(signatureHex, SIGNATURE_BYTES)
  if (!rawKey || !signature) return false

  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, rawKey]),
      format: 'der',
      type: 'spki',
    })
    return crypto.verify(null, Buffer.from(timestamp + rawBody), publicKey, signature)
  } catch {
    return false
  }
}
