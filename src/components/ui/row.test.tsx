import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DividedList, Row, FieldRow } from './row'

describe('DividedList', () => {
  it('renders children and draws dividers between them', () => {
    const { container } = render(
      <DividedList>
        <div>one</div>
        <div>two</div>
      </DividedList>,
    )
    const list = container.firstChild as HTMLElement
    expect(list.className).toContain('divide-y')
    expect(screen.getByText('one')).toBeInTheDocument()
    expect(screen.getByText('two')).toBeInTheDocument()
  })

  it('merges a custom className', () => {
    const { container } = render(<DividedList className="mt-2" />)
    expect((container.firstChild as HTMLElement).className).toContain('mt-2')
  })
})

describe('Row', () => {
  it('renders content', () => {
    render(<Row>row content</Row>)
    expect(screen.getByText('row content')).toBeInTheDocument()
  })
})

describe('FieldRow', () => {
  it('renders label and value', () => {
    render(<FieldRow label="Status" value="Active" />)
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('accepts node values', () => {
    render(<FieldRow label="Plan" value={<span>Pro</span>} />)
    expect(screen.getByText('Pro')).toBeInTheDocument()
  })
})
