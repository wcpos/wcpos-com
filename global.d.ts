import type messages from './messages/en.json'

declare module 'next-intl' {
  interface AppConfig {
    Locale: import('./src/i18n/config').Locale
    Messages: typeof messages
  }
}
