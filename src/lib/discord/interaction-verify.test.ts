import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyDiscordInteractionSignature } from './interaction-verify'

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
// Discord hands out the raw 32-byte key (the SPKI DER tail), hex-encoded.
const publicKeyHex = publicKey
  .export({ format: 'der', type: 'spki' })
  .subarray(-32)
  .toString('hex')

function sign(timestamp: string, rawBody: string): string {
  return crypto.sign(null, Buffer.from(timestamp + rawBody), privateKey).toString('hex')
}

describe('verifyDiscordInteractionSignature', () => {
  const timestamp = '1751980000'
  const rawBody = '{"type":1}'

  it('accepts a signature over timestamp + raw body', () => {
    expect(
      verifyDiscordInteractionSignature({
        publicKeyHex,
        signatureHex: sign(timestamp, rawBody),
        timestamp,
        rawBody,
      })
    ).toBe(true)
  })

  it('rejects when the body was tampered with', () => {
    expect(
      verifyDiscordInteractionSignature({
        publicKeyHex,
        signatureHex: sign(timestamp, rawBody),
        timestamp,
        rawBody: '{"type":2}',
      })
    ).toBe(false)
  })

  it('rejects when the timestamp was tampered with', () => {
    expect(
      verifyDiscordInteractionSignature({
        publicKeyHex,
        signatureHex: sign(timestamp, rawBody),
        timestamp: '1751980001',
        rawBody,
      })
    ).toBe(false)
  })

  it('rejects a signature from a different key', () => {
    const other = crypto.generateKeyPairSync('ed25519')
    const foreignSignature = crypto
      .sign(null, Buffer.from(timestamp + rawBody), other.privateKey)
      .toString('hex')
    expect(
      verifyDiscordInteractionSignature({
        publicKeyHex,
        signatureHex: foreignSignature,
        timestamp,
        rawBody,
      })
    ).toBe(false)
  })

  it.each([
    ['non-hex signature', 'zz'.repeat(64)],
    ['truncated signature', 'ab'.repeat(63)],
    ['empty signature', ''],
  ])('rejects malformed input (%s) without throwing', (_label, signatureHex) => {
    expect(
      verifyDiscordInteractionSignature({ publicKeyHex, signatureHex, timestamp, rawBody })
    ).toBe(false)
  })

  it('rejects a malformed public key without throwing', () => {
    expect(
      verifyDiscordInteractionSignature({
        publicKeyHex: 'ab'.repeat(16),
        signatureHex: sign(timestamp, rawBody),
        timestamp,
        rawBody,
      })
    ).toBe(false)
  })
})
