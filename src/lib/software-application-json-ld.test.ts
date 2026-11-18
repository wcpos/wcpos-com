import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  WCPOS_SOFTWARE_REQUIREMENTS,
  wcposSoftwareApplication,
} from './software-application-json-ld'

describe('wcposSoftwareApplication', () => {
  it('serialises to the home page object unchanged', () => {
    expect(JSON.stringify(wcposSoftwareApplication())).toBe(
      '{"@context":"https://schema.org","@type":"SoftwareApplication","name":"WCPOS","applicationCategory":"BusinessApplication","operatingSystem":"Windows, macOS, Linux, iOS, Android, Web","url":"https://wcpos.com","image":"https://wcpos.com/icon.png","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"softwareRequirements":"WordPress 5.6+, WooCommerce 9.0+, PHP 7.4+"}'
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

  it('lists the web app and the plugin requirements', () => {
    const app = wcposSoftwareApplication()
    expect(app.operatingSystem).toMatch(/, Web$/)
    expect(app.softwareRequirements).toBe(WCPOS_SOFTWARE_REQUIREMENTS)
  })

  it('matches the visible plugin requirements copy', () => {
    const messages = JSON.parse(
      readFileSync(join(process.cwd(), 'messages', 'en.json'), 'utf8'),
    )
    const visible: string = messages.downloads.page.steps.plugin.requirements
    const parts = WCPOS_SOFTWARE_REQUIREMENTS.split(', ')
    expect(parts).toHaveLength(3)
    for (const part of parts) {
      expect(visible).toContain(part)
    }
  })

  it('lets extra fields override the defaults', () => {
    expect(wcposSoftwareApplication({ url: 'x' }).url).toBe('x')
  })
})
