import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BillingStep, taxIdLabel } from './billing-step'

describe('taxIdLabel', () => {
  it('names the field per country', () => {
    expect(taxIdLabel('au')).toBe('ABN')
    expect(taxIdLabel('GB')).toBe('VAT number')
    expect(taxIdLabel('us')).toBe('EIN / Tax ID')
  })

  it('falls back to a generic label', () => {
    expect(taxIdLabel('sg')).toBe('Tax ID / VAT number')
  })
})

describe('BillingStep prefill', () => {
  it('prefills the form from initialAddress and initialTaxNumber', () => {
    render(
      <BillingStep
        initialAddress={{
          first_name: 'Paul',
          last_name: 'Kilmurray',
          address_1: '1 Example St',
          city: 'Perth',
          postal_code: '6000',
          country_code: 'au',
        }}
        initialTaxNumber="51 824 753 556"
        onSubmit={vi.fn(async () => {})}
      />
    )

    expect(screen.getByLabelText('First name')).toHaveValue('Paul')
    expect(screen.getByLabelText('Address')).toHaveValue('1 Example St')
    expect(screen.getByLabelText('City')).toHaveValue('Perth')
    expect(screen.getByLabelText('Postal code')).toHaveValue('6000')
    expect(screen.getByLabelText('Country')).toHaveValue('au')
    // AU renders the field as ABN, prefilled from the profile.
    expect(screen.getByLabelText(/ABN/)).toHaveValue('51 824 753 556')
  })

  it('relabels the tax field when the country changes', () => {
    render(<BillingStep onSubmit={vi.fn(async () => {})} />)

    expect(screen.getByLabelText(/EIN \/ Tax ID/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Country'), {
      target: { value: 'gb' },
    })
    expect(screen.getByLabelText(/VAT number/)).toBeInTheDocument()
  })

  it('submits the trimmed tax number alongside the address', async () => {
    const onSubmit = vi.fn(async () => {})
    render(
      <BillingStep
        initialAddress={{
          first_name: 'Paul',
          last_name: 'K',
          address_1: '1 Example St',
          city: 'Perth',
          postal_code: '6000',
          country_code: 'au',
        }}
        onSubmit={onSubmit}
      />
    )

    fireEvent.change(screen.getByLabelText(/ABN/), {
      target: { value: '  51 824 753 556  ' },
    })
    fireEvent.submit(screen.getByTestId('billing-step-form'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ country_code: 'au', city: 'Perth' }),
      { taxNumber: '51 824 753 556' }
    )
  })

  it('submits an empty tax number when the field is left blank', async () => {
    const onSubmit = vi.fn(async () => {})
    render(
      <BillingStep
        initialAddress={{
          first_name: 'Paul',
          last_name: 'K',
          address_1: '1 Example St',
          city: 'Perth',
          postal_code: '6000',
          country_code: 'us',
        }}
        onSubmit={onSubmit}
      />
    )

    fireEvent.submit(screen.getByTestId('billing-step-form'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), { taxNumber: '' })
  })
})
