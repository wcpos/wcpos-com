import { defaultLocale } from '@/i18n/config'

const CHECKOUT_SUCCESS_PATH = '/pro/checkout/success'

export function checkoutSuccessReturnUrl(origin: string, locale: string): string {
  const normalizedOrigin = origin.replace(/\/+$/, '')
  const localePrefix = locale === defaultLocale ? '' : `/${locale}`
  return `${normalizedOrigin}${localePrefix}${CHECKOUT_SUCCESS_PATH}`
}
