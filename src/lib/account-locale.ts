import type { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionCustomer } from '@/lib/medusa-auth'
import { supportedBaseLocale } from '@/lib/locale-preferences'
import type { Locale } from '@/i18n/config'

/**
 * next-intl reads this cookie to choose the served locale (URL prefix > this
 * cookie > Accept-Language). Seeding it from the account on sign-in is how a
 * saved language preference wins over the browser's Accept-Language on a fresh
 * browser — the durable preference set in Profile / the language switcher.
 */
export const LOCALE_COOKIE = 'NEXT_LOCALE'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

const localeCookieOptions = {
  path: '/',
  maxAge: ONE_YEAR_SECONDS,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}

/** The signed-in customer's saved language, if it is a supported locale. */
export async function savedCustomerLocale(): Promise<Locale | null> {
  const customer = await getSessionCustomer()
  const raw = customer?.metadata?.locale
  return typeof raw === 'string' ? supportedBaseLocale(raw) ?? null : null
}

/** Seed NEXT_LOCALE via the request cookie store (routes that return JSON). */
export async function writeLocaleCookie(locale: Locale): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, locale, localeCookieOptions)
}

/** Seed NEXT_LOCALE on a specific response (routes that redirect). */
export function setLocaleCookieOnResponse(
  response: NextResponse,
  locale: Locale
): void {
  response.cookies.set(LOCALE_COOKIE, locale, localeCookieOptions)
}
