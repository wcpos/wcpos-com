import { createHmac, timingSafeEqual } from 'crypto'

interface DownloadTokenPayload {
  customerId: string
  version: string
  expiresAt: number
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signValue(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function createDownloadToken(
  payload: DownloadTokenPayload,
  secret: string
): string {
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = signValue(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

export function verifyDownloadToken(
  token: string,
  secret: string
): DownloadTokenPayload | null {
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  const expectedSignature = signValue(encodedPayload, secret)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (signatureBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null

  try {
    const payload = JSON.parse(
      fromBase64Url(encodedPayload)
    ) as DownloadTokenPayload
    if (
      typeof payload.customerId !== 'string' ||
      typeof payload.version !== 'string' ||
      typeof payload.expiresAt !== 'number'
    ) {
      return null
    }

    if (payload.expiresAt < Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}
