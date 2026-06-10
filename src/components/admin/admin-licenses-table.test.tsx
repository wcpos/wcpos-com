import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  AdminLicensesTable,
  type AdminLicenseRow,
} from './admin-licenses-table'

function makeRow(overrides: Partial<AdminLicenseRow> = {}): AdminLicenseRow {
  return {
    id: 'lic-1',
    key: 'ABCD-EFGH-IJKL-MNOP',
    status: 'ACTIVE',
    expiry: '2099-01-01T00:00:00Z',
    maxMachines: 2,
    metadata: {},
    policyId: '261cb7e2-6e80-476e-98bd-fe7f406f258d',
    createdAt: '2026-01-01T00:00:00Z',
    machines: [
      {
        id: 'machine-1',
        fingerprint: 'fp-abc123',
        name: 'shop.example.com',
        metadata: {},
        createdAt: '2026-02-01T00:00:00Z',
      },
    ],
    ...overrides,
  }
}

describe('AdminLicensesTable', () => {
  it('shows an empty state when there are no licenses', () => {
    render(<AdminLicensesTable licenses={[]} />)
    expect(screen.getByText('No licenses found.')).toBeInTheDocument()
  })

  it('renders masked key, status, machines count and policy', () => {
    render(<AdminLicensesTable licenses={[makeRow()]} />)

    expect(screen.getByText('****-****-MNOP')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Yearly')).toBeInTheDocument()
    // Full key never appears in the DOM
    expect(screen.queryByText('ABCD-EFGH-IJKL-MNOP')).not.toBeInTheDocument()
  })

  it('displays active-past-expiry licenses as expired', () => {
    render(
      <AdminLicensesTable
        licenses={[makeRow({ expiry: '2020-01-01T00:00:00Z' })]}
      />
    )

    expect(screen.getByText('expired')).toBeInTheDocument()
    expect(screen.queryByText('active')).not.toBeInTheDocument()
  })

  it('shows a dash when machines could not be loaded', () => {
    render(<AdminLicensesTable licenses={[makeRow({ machines: null })]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('expands a row to reveal activated machines', () => {
    render(<AdminLicensesTable licenses={[makeRow()]} />)

    expect(screen.queryByText('fp-abc123')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('****-****-MNOP'))

    expect(screen.getByText('Activated machines')).toBeInTheDocument()
    expect(screen.getByText('shop.example.com')).toBeInTheDocument()
    expect(screen.getByText('fp-abc123')).toBeInTheDocument()

    // Clicking again collapses
    fireEvent.click(screen.getByText('****-****-MNOP'))
    expect(screen.queryByText('fp-abc123')).not.toBeInTheDocument()
  })

  it('shows an empty machines state in the expanded row', () => {
    render(<AdminLicensesTable licenses={[makeRow({ machines: [] })]} />)

    fireEvent.click(screen.getByText('****-****-MNOP'))
    expect(screen.getByText('No activated machines.')).toBeInTheDocument()
  })
})
