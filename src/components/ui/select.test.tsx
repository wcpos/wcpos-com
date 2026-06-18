import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Select } from './select'

describe('Select', () => {
  it('renders its options and selected value', () => {
    render(
      <Select defaultValue="au" aria-label="Country">
        <option value="au">Australia</option>
        <option value="us">United States</option>
      </Select>,
    )
    const select = screen.getByLabelText('Country') as HTMLSelectElement
    expect(select.value).toBe('au')
    expect(screen.getByText('United States')).toBeInTheDocument()
  })

  it('carries the shared focus ring', () => {
    render(
      <Select aria-label="Lang">
        <option>en</option>
      </Select>,
    )
    expect(screen.getByLabelText('Lang').className).toContain(
      'focus-visible:ring-ring',
    )
  })
})
