import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Markdown } from './markdown'

const content = '[docs](https://docs.wcpos.com/a) ![i](https://evil.example/p.png)'

describe('Markdown', () => {
  it('opens untrusted links in a new tab and suppresses images', () => {
    const { container } = render(<Markdown content={content} untrusted />)
    const link = screen.getByRole('link', { name: 'docs' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')?.split(' ')).toEqual(expect.arrayContaining(['noopener', 'nofollow']))
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders images and leaves link targets unchanged by default', () => {
    const { container } = render(<Markdown content={content} />)
    expect(container.querySelector('img')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'docs' })).not.toHaveAttribute('target')
  })
})
