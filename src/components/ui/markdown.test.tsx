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

  it('wraps long tokens in prose blocks and keeps the pre scroll class', () => {
    const md = [
      '## A heading',
      '',
      'A paragraph.',
      '',
      '- A list item',
      '',
      '| Hook | Use |',
      '| --- | --- |',
      '| `a_hook` | Filter |',
      '',
      '```',
      'const hook = 1',
      '```',
    ].join('\n')
    const { container } = render(<Markdown content={md} />)
    const root = container.firstElementChild as HTMLElement
    expect(root.classList).toContain('[&_:is(p,li,h1,h2,h3,blockquote)]:[overflow-wrap:anywhere]')
    expect(root.classList).toContain('[&_pre]:overflow-x-auto')
    for (const tag of ['h2', 'p', 'li', 'table', 'pre']) {
      expect(root.querySelector(tag)).not.toBeNull()
    }
  })
})
