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
  it('lists worldwide country options', () => {
    render(<BillingStep onSubmit={vi.fn(async () => {})} />)

    const countrySelect = screen.getByLabelText('Country')
    const options = Array.from(countrySelect.querySelectorAll('option')).map(
      (option) => option.textContent
    )

    expect(options.length).toBeGreaterThan(200)
    expect(options.some((label) => label?.includes('Afghanistan'))).toBe(true)
    expect(options.some((label) => label?.includes('Zimbabwe'))).toBe(true)
  })

  it('prefills the form from initialAddress and initialTaxNumber', () => {
    render(
      <BillingStep
        initialAddress={{
          first_name: 'Paul',
          last_name: 'Kilmurray',
          address_1: '1 Example St',
          address_2: 'Unit 4',
          city: 'Perth',
          province: 'WA',
          postal_code: '6000',
          country_code: 'au',
        }}
        initialTaxNumber="51 824 753 556"
        onSubmit={vi.fn(async () => {})}
      />
    )

    expect(screen.getByLabelText('First name')).toHaveValue('Paul')
    expect(screen.getByLabelText('Address line 1')).toHaveValue('1 Example St')
    expect(screen.getByLabelText('Address line 2')).toHaveValue('Unit 4')
    expect(screen.getByLabelText('City')).toHaveValue('Perth')
    expect(screen.getByLabelText('State / Province / Region')).toHaveValue('WA')
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
          address_2: 'Unit 4',
          city: 'Perth',
          province: 'WA',
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
      expect.objectContaining({
        address_2: 'Unit 4',
        country_code: 'au',
        city: 'Perth',
        province: 'WA',
      }),
      { taxNumber: '51 824 753 556' }
    )
  })

  it('submits optional address line 2 and province only when filled', async () => {
    const onSubmit = vi.fn(async () => {})
    render(<BillingStep onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Ada' },
    })
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: 'Lovelace' },
    })
    fireEvent.change(screen.getByLabelText('Address line 1'), {
      target: { value: '  42 Wallaby Way  ' },
    })
    fireEvent.change(screen.getByLabelText('Address line 2'), {
      target: { value: '  Apt 7  ' },
    })
    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: '  Sydney  ' },
    })
    fireEvent.change(screen.getByLabelText('State / Province / Region'), {
      target: { value: '  NSW  ' },
    })
    fireEvent.change(screen.getByLabelText('Postal code'), {
      target: { value: '  2000  ' },
    })
    fireEvent.change(screen.getByLabelText('Country'), {
      target: { value: 'au' },
    })
    fireEvent.submit(screen.getByTestId('billing-step-form'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      {
        first_name: 'Ada',
        last_name: 'Lovelace',
        address_1: '42 Wallaby Way',
        address_2: 'Apt 7',
        city: 'Sydney',
        province: 'NSW',
        postal_code: '2000',
        country_code: 'au',
      },
      { taxNumber: '' }
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
