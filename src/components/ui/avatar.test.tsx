import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Avatar, AvatarFallback } from './avatar'

describe('AvatarFallback', () => {
  it('uses the muted disc by default', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>PK</AvatarFallback>
      </Avatar>,
    )
    expect(container.innerHTML).toContain('bg-muted')
  })

  it('tints the disc with the brand tone', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback tone="brand">PK</AvatarFallback>
      </Avatar>,
    )
    expect(container.innerHTML).toContain('bg-wcpos-red/10')
    expect(container.innerHTML).toContain('text-wcpos-red-accent')
  })
})
