import type { ReactElement, ReactNode } from 'react'
import {
  render,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../messages/en.json'

/**
 * Wraps components in the real next-intl provider, resolving the real
 * English messages. Tests keep asserting the actual rendered copy, and a
 * missing message key fails the test instead of rendering a fallback.
 */
export function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider
      locale="en"
      messages={messages}
      onError={(error) => {
        throw error
      }}
    >
      {children}
    </NextIntlClientProvider>
  )
}

export function renderWithIntl(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  return render(ui, { wrapper: IntlWrapper, ...options })
}
