import { describe, expect, it } from 'vitest'
import { getAnalyticsConfig } from './config'

describe('getAnalyticsConfig', () => {
  it('disables analytics when PostHog keys are missing', () => {
    expect(getAnalyticsConfig({} as NodeJS.ProcessEnv).enabled).toBe(false)
  })

  it('enables analytics when host + key exist', () => {
    const config = getAnalyticsConfig({
      NEXT_PUBLIC_POSTHOG_HOST: 'https://analytics.wcpos.com',
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_test',
    } as NodeJS.ProcessEnv)

    expect(config.enabled).toBe(true)
  })
})
