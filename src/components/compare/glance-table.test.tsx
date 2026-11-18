import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { GlanceTable } from './glance-table'

const rows = [
  { label: 'Price', wcpos: 'Free core', other: 'Monthly fee' },
  { label: 'Offline', wcpos: 'Yes', other: 'No' },
]

describe('GlanceTable', () => {
  it('renders the headers and every row with their scope attributes', () => {
    render(<GlanceTable wcposHeader="WCPOS" otherHeader="Other" rows={rows} />)

    expect(
      screen.getByRole('columnheader', { name: 'WCPOS' })
    ).toHaveAttribute('scope', 'col')
    expect(
      screen.getByRole('columnheader', { name: 'Other' })
    ).toHaveAttribute('scope', 'col')

    for (const row of rows) {
      const rowHeader = screen.getByRole('rowheader', { name: row.label })
      expect(rowHeader).toHaveAttribute('scope', 'row')
      const tr = rowHeader.closest('tr')!
      const cells = within(tr).getAllByRole('cell')
      // The answer is the cell's text minus its aria-hidden phone label.
      expect(cells.map((cell) => cell.lastChild?.textContent)).toEqual([
        row.wcpos,
        row.other,
      ])
    }
  })

  it('labels each answer with its product below sm', () => {
    const { container } = render(
      <GlanceTable wcposHeader="WCPOS" otherHeader="Other" rows={rows} />
    )

    for (const row of rows) {
      const tr = screen.getByRole('rowheader', { name: row.label }).closest('tr')!
      const cells = within(tr).getAllByRole('cell')
      cells.forEach((cell, i) => {
        const label = cell.querySelector('[aria-hidden="true"]')
        expect(label?.textContent).toBe(i === 0 ? 'WCPOS' : 'Other')
        expect(label).toHaveClass('sm:hidden')
      })
    }
    expect(screen.getAllByRole('columnheader')).toHaveLength(2)
    expect(container.querySelector('thead tr')).toHaveClass('max-sm:sr-only')
  })

  it('stacks each row label above its answers below sm', () => {
    render(<GlanceTable wcposHeader="WCPOS" otherHeader="Other" rows={rows} />)

    for (const row of rows) {
      expect(screen.getByRole('rowheader', { name: row.label })).toHaveClass(
        'max-sm:col-span-2'
      )
    }
    for (const tr of screen.getAllByRole('row')) {
      expect(tr).toHaveClass('max-sm:grid')
    }
  })

  it('hides an empty td corner on phones when there is no featureHeader', () => {
    const { container } = render(
      <GlanceTable wcposHeader="WCPOS" otherHeader="Other" rows={rows} />
    )

    const corner = container.querySelector('thead tr')!.firstElementChild!
    expect(corner.tagName).toBe('TD')
    expect(corner).toBeEmptyDOMElement()
    expect(corner).toHaveClass('max-sm:hidden')
    expect(screen.getAllByRole('columnheader')).toHaveLength(2)
  })

  it('renders the featureHeader as a column header hidden on phones', () => {
    render(
      <GlanceTable
        featureHeader="Feature"
        wcposHeader="WCPOS"
        otherHeader="Other"
        rows={rows}
      />
    )

    const feature = screen.getByRole('columnheader', { name: 'Feature' })
    expect(feature).toHaveAttribute('scope', 'col')
    expect(feature).toHaveClass('max-sm:hidden')
    expect(feature.closest('tr')!.querySelector('td')).toBeNull()
  })

  it('renders the caption when given', () => {
    render(
      <GlanceTable
        wcposHeader="WCPOS"
        otherHeader="Other"
        rows={rows}
        caption="At a glance"
      />
    )

    expect(screen.getByRole('table', { name: 'At a glance' })).toBeInTheDocument()
    expect(screen.getByText('At a glance').tagName).toBe('CAPTION')
    expect(screen.getByText('At a glance')).toHaveClass('max-sm:order-last')
  })
})
