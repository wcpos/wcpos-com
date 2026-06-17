import 'server-only'

import { cookies } from 'next/headers'

const COOKIE_NAME = 'discord-link-state'
const MAX_AGE_SECONDS = 10 * 60

export interface DiscordOAuthStatePayload {
  state: string
  returnTo: string
  licenseKey?: string
}

function encode(payload: DiscordOAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decode(value: string): DiscordOAuthStatePayload | null {
  try {
    const payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as DiscordOAuthStatePayload
    if (!payload.state || !payload.returnTo) return null
    return payload
  } catch {
    return null
  }
}

export async function setDiscordOAuthState(payload: DiscordOAuthStatePayload): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, encode(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function consumeDiscordOAuthState(): Promise<DiscordOAuthStatePayload | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)
  cookieStore.delete(COOKIE_NAME)
  return cookie?.value ? decode(cookie.value) : null
}
