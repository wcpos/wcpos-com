import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CodeRef } from './code-ref'

describe('CodeRef', () => {
  it('renders the value in a <code> element', () => {
    render(<CodeRef>WCPOS-ABCD-1234</CodeRef>)
    const el = screen.getByText('WCPOS-ABCD-1234')
    expect(el.tagName).toBe('CODE')
  })

  it('is selectable and wraps long values', () => {
    render(<CodeRef>key</CodeRef>)
    const el = screen.getByText('key')
    expect(el.className).toContain('select-all')
    expect(el.className).toContain('break-all')
    expect(el.className).toContain('font-mono')
  })
})
