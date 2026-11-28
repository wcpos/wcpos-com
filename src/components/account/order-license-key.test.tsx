import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'
import { OrderLicenseKey } from './order-license-key'

describe('OrderLicenseKey', () => {
  it('masks the key, reveals it on Show key and copies the full key', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(<OrderLicenseKey licenseKey="ABCD-EFGH-IJKL-MNOP" />)

    expect(screen.getByText('••••-••••-MNOP')).toBeInTheDocument()
    expect(screen.queryByText('ABCD-EFGH-IJKL-MNOP')).toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: 'Show license key ending in MNOP' })
    )
    expect(screen.getByText('ABCD-EFGH-IJKL-MNOP')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Copy license key ending in MNOP' })
    )
    expect(writeText).toHaveBeenCalledWith('ABCD-EFGH-IJKL-MNOP')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })
})
