import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const mockReplace = vi.fn()
const mockFetch = vi.fn()

vi.stubGlobal('fetch', mockFetch)

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => (key === 'language' ? 'Language' : key),
}))

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/pro',
}))

import { LanguageSelector } from './language-selector'

describe('LanguageSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true })
  })

  it('persists the selected locale preference without blocking navigation', () => {
    render(<LanguageSelector />)

    fireEvent.change(screen.getByLabelText('Language'), {
      target: { value: 'fr' },
    })

    expect(mockReplace).toHaveBeenCalledWith('/pro', { locale: 'fr' })
    expect(mockFetch).toHaveBeenCalledWith('/api/account/locale', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'fr' }),
    })
  })

  it('marks the current language in the desktop list and switches from it', () => {
    render(<LanguageSelector />)

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Language: English' }),
      { button: 0, ctrlKey: false }
    )

    const current = screen.getByRole('menuitem', { name: 'English' })
    expect(current).toHaveAttribute('aria-current', 'true')
    expect(current).toHaveClass('text-wcpos-red-accent', 'bg-primary/10')

    fireEvent.click(screen.getByRole('menuitem', { name: 'Deutsch' }))
    expect(mockReplace).toHaveBeenCalledWith('/pro', { locale: 'de' })
  })
})
