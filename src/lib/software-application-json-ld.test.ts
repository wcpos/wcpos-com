import { describe, expect, it } from 'vitest'
import { wcposSoftwareApplication } from './software-application-json-ld'

describe('wcposSoftwareApplication', () => {
  it('serialises to the home page object unchanged', () => {
    expect(JSON.stringify(wcposSoftwareApplication())).toBe(
      '{"@context":"https://schema.org","@type":"SoftwareApplication","name":"WCPOS","applicationCategory":"BusinessApplication","operatingSystem":"Windows, macOS, Linux, iOS, Android","url":"https://wcpos.com","image":"https://wcpos.com/icon.png","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}}'
    )
  })

  it('appends extra keys after the shared ones', () => {
    const object = wcposSoftwareApplication({
      downloadUrl: 'https://wcpos.com/downloads',
    })
    expect(Object.keys(object).at(-1)).toBe('downloadUrl')
    expect(object).toMatchObject({ downloadUrl: 'https://wcpos.com/downloads' })
    expect(object.name).toBe('WCPOS')
  })
})
