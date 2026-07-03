import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField } from './form-field'
import { Input } from './input'

describe('FormField', () => {
  it('associates the label with the control via htmlFor', () => {
    render(
      <FormField label="First name" htmlFor="first-name">
        <Input id="first-name" />
      </FormField>,
    )
    expect(screen.getByLabelText('First name')).toBeInTheDocument()
  })

  it('renders a muted hint under the control when provided', () => {
    render(
      <FormField label="Avatar" htmlFor="avatar" hint="PNG or JPG, up to 2MB">
        <Input id="avatar" />
      </FormField>,
    )
    const hint = screen.getByText('PNG or JPG, up to 2MB')
    expect(hint.className).toContain('text-muted-foreground')
  })

  it('associates hint text with the control', () => {
    render(
      <FormField label="Avatar" htmlFor="avatar" hint="PNG or JPG, up to 2MB">
        <Input id="avatar" />
      </FormField>,
    )
    const input = screen.getByLabelText('Avatar')
    const hint = screen.getByText('PNG or JPG, up to 2MB')
    expect(hint).toHaveAttribute('id', 'avatar-hint')
    expect(input).toHaveAttribute('aria-describedby', 'avatar-hint')
  })

  it('renders no hint element by default', () => {
    const { container } = render(
      <FormField label="City" htmlFor="city">
        <Input id="city" />
      </FormField>,
    )
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })
})
