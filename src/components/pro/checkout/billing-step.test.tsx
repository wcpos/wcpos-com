import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'
import { BillingStep } from './billing-step'
import * as billingCountries from '@/lib/billing-countries'

describe('tax label i18n contract', () => {
  it('exposes translation keys rather than English label helpers', () => {
    expect(billingCountries.taxIdLabelKey('au')).toBe('abn')
    expect(billingCountries.taxIdLabelKey('GB')).toBe('vat')
    expect(billingCountries.taxIdLabelKey('us')).toBe('einTaxId')
    expect(billingCountries.taxIdLabelKey('sg')).toBe('genericTaxId')
    expect('taxIdLabel' in billingCountries).toBe(false)
  })
})

describe('BillingStep prefill', () => {
  const completeAddress = {
    first_name: 'Ada',
    last_name: 'Lovelace',
    address_1: '42 Wallaby Way',
    address_2: '',
    city: 'Sydney',
    province: 'NSW',
    postal_code: '2000',
    country_code: 'au',
  }

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

  it('prefills an optional company from the initial address', () => {
    render(
      <BillingStep
        initialAddress={{
          ...completeAddress,
          company: 'Analytical Engines ApS',
        }}
        onSubmit={vi.fn(async () => {})}
      />
    )

    expect(screen.getByLabelText(/company/i)).not.toBeRequired()
    expect(screen.getByLabelText(/company/i)).toHaveValue(
      'Analytical Engines ApS'
    )
  })

  it('submits a trimmed optional company', async () => {
    const onSubmit = vi.fn(async () => {})
    render(
      <BillingStep initialAddress={completeAddress} onSubmit={onSubmit} />
    )

    fireEvent.change(screen.getByLabelText(/company/i), {
      target: { value: '  Analytical Engines ApS  ' },
    })
    fireEvent.submit(screen.getByTestId('billing-step-form'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ company: 'Analytical Engines ApS' }),
      expect.any(Object)
    )
  })

  it('submits a complete individual address with company blank', async () => {
    const onSubmit = vi.fn(async () => {})
    render(
      <BillingStep initialAddress={completeAddress} onSubmit={onSubmit} />
    )

    fireEvent.submit(screen.getByTestId('billing-step-form'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ company: '' }),
      expect.any(Object)
    )
  })

  it('relabels the tax field when the country changes', () => {
    render(<BillingStep onSubmit={vi.fn(async () => {})} />)

    expect(screen.getByLabelText(/EIN \/ Tax ID/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Country'), {
      target: { value: 'gb' },
    })
    expect(screen.getByLabelText(/VAT number/)).toBeInTheDocument()
  })

  it('requires postal code only for countries whose address metadata requires it', () => {
    render(<BillingStep onSubmit={vi.fn(async () => {})} />)

    const country = screen.getByLabelText('Country')
    const postal = screen.getByLabelText('Postal code')
    expect(postal).toBeRequired()

    fireEvent.change(country, { target: { value: 'cq' } })
    expect(postal).not.toBeRequired()

    fireEvent.change(country, { target: { value: 'gb' } })
    expect(postal).toBeRequired()
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

  it('submits optional address fields when filled', async () => {
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
        company: '',
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

  it('submits empty optional address fields so saved profile values can be cleared', async () => {
    const onSubmit = vi.fn(async () => {})
    render(
      <BillingStep
        initialAddress={{
          first_name: 'Ada',
          last_name: 'Lovelace',
          address_1: '42 Wallaby Way',
          address_2: 'Old Apt',
          city: 'Sydney',
          province: 'Old NSW',
          postal_code: '2000',
          country_code: 'cq',
        }}
        onSubmit={onSubmit}
      />
    )

    fireEvent.change(screen.getByLabelText('Address line 2'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('State / Province / Region'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Postal code'), {
      target: { value: '' },
    })
    fireEvent.submit(screen.getByTestId('billing-step-form'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        address_2: '',
        province: '',
        postal_code: '',
      }),
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
          address_2: '',
          city: 'Perth',
          province: '',
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
