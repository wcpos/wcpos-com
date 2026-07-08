import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultLocale, locales } from './config'

const messagesDir = path.resolve(process.cwd(), 'messages')

type Messages = { [key: string]: string | Messages }

function loadMessages(locale: string): Messages {
  const raw = fs.readFileSync(path.join(messagesDir, `${locale}.json`), 'utf8')
  return JSON.parse(raw) as Messages
}

function flattenKeys(messages: Messages, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key
    return typeof value === 'object' && value !== null
      ? flattenKeys(value, fullKey)
      : [fullKey]
  })
}

function valueAtPath(messages: Messages, keyPath: string): string | undefined {
  let value: string | Messages | undefined = messages
  for (const key of keyPath.split('.')) {
    if (typeof value !== 'object' || value === null) return undefined
    value = value[key]
  }
  return typeof value === 'string' ? value : undefined
}

const messageFiles = fs
  .readdirSync(messagesDir)
  .filter((file) => file.endsWith('.json'))
const fileLocales = messageFiles.map((file) => file.replace(/\.json$/, ''))

const enKeys = flattenKeys(loadMessages(defaultLocale))
const otherLocales = fileLocales.filter((locale) => locale !== defaultLocale)
const checkoutRecoveryKeys = enKeys.filter((key) =>
  key.startsWith('pro.checkout.recovery.orderPending.')
)
const auditedFrenchNamespacePrefixes = [
  'roadmap.',
  'support.',
  'downloads.',
  'legal.',
  'home.',
  'about.',
  'account.',
  'pro.',
  'auth.',
  'header.',
  'footer.',
]

const auditedSpanishNamespacePrefixes = [
  'support.',
  'roadmap.',
  'auth.',
  'header.',
  'footer.',
  'account.',
  'pro.',
  'downloads.',
  'about.',
  'home.',
  'legal.',
]

const auditedJapaneseNamespacePrefixes = [
  'support.',
  'auth.',
  'roadmap.',
  'header.',
  'footer.',
  'account.',
  'pro.',
  'downloads.',
  'about.',
  'home.',
  'legal.',
]
const japaneseIdenticalCopyAllowlist = new Set([
  'auth.common.emailPlaceholder',
  'header.pro',
  'footer.copyright',
  'footer.pro',
  'footer.discord',
  'footer.github',
  'footer.wordpressOrg',
  'pro.hero.title',
  'pro.schema.name',
  'pro.checkout.offers.default',
  'pro.checkout.payment.methods.card.hint',
  'pro.checkout.payment.methods.bitcoin.title',
  'account.profile.taxLabels.abn',
  'account.profile.taxLabels.partitaIva',
  'account.profile.googleProvider',
  'account.profile.discordProvider',
  'account.profile.githubProvider',
  'account.receiptPdf.sellerIdentityWithAbn',
  'account.receiptPdf.sellerIdentity',
  'downloads.platforms.mac-arm.name',
  'downloads.platforms.mac-arm.listLabel',
  'downloads.platforms.mac-arm.short',
  'downloads.platforms.mac-intel.name',
  'downloads.platforms.mac-intel.listLabel',
  'downloads.platforms.mac-intel.short',
  'downloads.platforms.win.name',
  'downloads.platforms.win.listLabel',
  'downloads.platforms.win.short',
  'downloads.platforms.linux.name',
  'downloads.platforms.linux.listLabel',
  'downloads.platforms.linux.short',
  'downloads.platforms.ios.name',
  'downloads.platforms.ios.listLabel',
  'downloads.platforms.android.name',
  'downloads.platforms.android.listLabel',
  'downloads.platforms.web.name',
  'downloads.platforms.web.listLabel',
  'downloads.howItFits.diagram.devices.android',
  'downloads.howItFits.diagram.devices.web',
  'downloads.howItFits.diagram.hub.platform',
  'downloads.page.beta',
  'downloads.page.steps.plugin.requirements',
  'downloads.page.steps.plugin.cardTitle',
  'downloads.page.steps.plugin.wordpressOrgCta',
  'downloads.releaseHistory.desktop',
  'about.founder.signature.name',
  'about.timeline.dates.range',
  'home.title',
  'home.useCases.cards.retail.attribution',
  'home.useCases.cards.market.attribution',
  'home.useCases.cards.desktop.attribution',
  'home.pricing.pro.title',
  'home.ecosystem.devices.ios.label',
  'home.ecosystem.devices.android.label',
  'home.ecosystem.devices.desktop.label',
  'home.story.a2.platforms.p1',
  'home.story.a2.platforms.p2',
  'home.story.a2.platforms.p3',
  'home.story.a2.platforms.p4',
  'home.story.a2.platforms.p5',
  'home.story.pos.registerShort',
  'legal.privacy.processors.items.p2.label',
  'legal.privacy.processors.items.p3.label',
  'legal.privacy.processors.items.p4.label',
  'legal.privacy.processors.items.p5.label',
  'legal.privacy.processors.items.p6.label',
  'legal.privacy.processors.items.p7.label',
])
const auditedChineseNamespacePrefixes = [
  'support.',
  'auth.',
  'roadmap.',
  'header.',
  'footer.',
  'account.',
  'pro.',
  'downloads.',
  'about.',
]
const chineseIdenticalCopyAllowlist = new Set([
  'auth.common.emailPlaceholder',
  'header.pro',
  'footer.copyright',
  'footer.pro',
  'footer.discord',
  'footer.github',
  'footer.wordpressOrg',
  'pro.hero.title',
  'pro.schema.name',
  'pro.checkout.offers.default',
  'pro.checkout.payment.methods.card.hint',
  'pro.checkout.payment.methods.bitcoin.title',
  'account.profile.taxLabels.abn',
  'account.profile.taxLabels.partitaIva',
  'account.profile.googleProvider',
  'account.profile.discordProvider',
  'account.profile.githubProvider',
  'account.receiptPdf.sellerIdentityWithAbn',
  'account.receiptPdf.sellerIdentity',
  'downloads.platforms.mac-arm.name',
  'downloads.platforms.mac-arm.listLabel',
  'downloads.platforms.mac-arm.short',
  'downloads.platforms.mac-intel.name',
  'downloads.platforms.mac-intel.listLabel',
  'downloads.platforms.mac-intel.short',
  'downloads.platforms.win.name',
  'downloads.platforms.win.listLabel',
  'downloads.platforms.win.short',
  'downloads.platforms.linux.name',
  'downloads.platforms.linux.listLabel',
  'downloads.platforms.linux.short',
  'downloads.platforms.ios.name',
  'downloads.platforms.ios.listLabel',
  'downloads.platforms.android.name',
  'downloads.platforms.android.listLabel',
  'downloads.platforms.web.name',
  'downloads.platforms.web.listLabel',
  'downloads.howItFits.diagram.devices.android',
  'downloads.howItFits.diagram.devices.web',
  'downloads.howItFits.diagram.hub.platform',
  'downloads.page.beta',
  'downloads.page.steps.plugin.requirements',
  'downloads.page.steps.plugin.cardTitle',
  'downloads.page.steps.plugin.wordpressOrgCta',
  'downloads.releaseHistory.desktop',
  'about.founder.signature.name',
  'about.timeline.dates.range',
])
const auditedGermanNamespacePrefixes = [
  'support.',
  'auth.',
  'roadmap.',
  'header.',
  'footer.',
  'account.',
  'pro.',
  'downloads.',
  'about.',
  'home.',
  'legal.',
]
const germanIdenticalCopyAllowlist = new Set([
  'header.pro',
  'footer.copyright',
  'footer.pro',
  'footer.discord',
  'footer.github',
  'footer.wordpressOrg',
  'pro.hero.title',
  'pro.schema.name',
  'pro.checkout.offers.default',
  'pro.checkout.payment.methods.card.hint',
  'pro.checkout.payment.methods.bitcoin.title',
  'account.profile.taxLabels.abn',
  'account.profile.taxLabels.partitaIva',
  'account.profile.googleProvider',
  'account.profile.discordProvider',
  'account.profile.githubProvider',
  'account.receiptPdf.sellerIdentityWithAbn',
  'account.receiptPdf.sellerIdentity',
  'downloads.meta.title',
  'downloads.platforms.mac-arm.name',
  'downloads.platforms.mac-arm.listLabel',
  'downloads.platforms.mac-arm.short',
  'downloads.platforms.mac-intel.name',
  'downloads.platforms.mac-intel.listLabel',
  'downloads.platforms.mac-intel.short',
  'downloads.platforms.win.name',
  'downloads.platforms.win.listLabel',
  'downloads.platforms.win.short',
  'downloads.platforms.linux.name',
  'downloads.platforms.linux.listLabel',
  'downloads.platforms.linux.short',
  'downloads.platforms.ios.name',
  'downloads.platforms.ios.listLabel',
  'downloads.platforms.android.name',
  'downloads.platforms.android.listLabel',
  'downloads.platforms.web.name',
  'downloads.platforms.web.listLabel',
  'downloads.hero.eyebrow',
  'downloads.hero.versionMeta',
  'downloads.howItFits.diagram.devices.desktop',
  'downloads.howItFits.diagram.devices.android',
  'downloads.howItFits.diagram.devices.web',
  'downloads.howItFits.diagram.hub.platform',
  'downloads.page.beta',
  'downloads.page.steps.plugin.requirements',
  'downloads.page.steps.plugin.cardTitle',
  'downloads.page.steps.plugin.wordpressOrgCta',
  'downloads.releaseHistory.desktop',
  'about.founder.signature.name',
  'about.timeline.dates.range',
  'home.title',
  'home.useCases.cards.retail.attribution',
  'home.useCases.cards.market.attribution',
  'home.useCases.cards.desktop.attribution',
  'home.useCases.cards.desktop.type',
  'home.benefits.visuals.offline.badge',
  'home.benefits.visuals.hardware.tablet',
  'home.pricing.pro.title',
  'home.ecosystem.badge',
  'home.ecosystem.devices.ios.label',
  'home.ecosystem.devices.android.label',
  'home.ecosystem.devices.desktop.label',
  'home.story.a2.platforms.p1',
  'home.story.a2.platforms.p2',
  'home.story.a2.platforms.p3',
  'home.story.a2.platforms.p4',
  'home.story.a2.platforms.p5',
  'legal.privacy.cookies.title',
  'legal.privacy.processors.items.p2.label',
  'legal.privacy.processors.items.p3.label',
  'legal.privacy.processors.items.p4.label',
  'legal.privacy.processors.items.p5.label',
  'legal.privacy.processors.items.p6.label',
  'legal.privacy.processors.items.p7.label',
])
const spanishIdenticalCopyAllowlist = new Set([
  'header.pro',
  'footer.copyright',
  'footer.discord',
  'footer.github',
  'footer.pro',
  'footer.wordpressOrg',
  'header.pro',
  'account.profile.taxLabels.abn',
  'account.profile.taxLabels.partitaIva',
  'account.profile.googleProvider',
  'account.profile.discordProvider',
  'account.profile.githubProvider',
  'account.receiptPdf.sellerIdentityWithAbn',
  'account.receiptPdf.sellerIdentity',
  'account.profile.avatarAlt',
  'account.receiptPdf.subtotal',
  'account.receiptPdf.total',
  'pro.hero.title',
  'pro.schema.name',
  'pro.checkout.offers.default',
  'pro.checkout.payment.methods.card.hint',
  'pro.checkout.payment.methods.bitcoin.title',
  'downloads.platforms.mac-arm.name',
  'downloads.platforms.mac-arm.listLabel',
  'downloads.platforms.mac-arm.short',
  'downloads.platforms.mac-intel.name',
  'downloads.platforms.mac-intel.listLabel',
  'downloads.platforms.mac-intel.short',
  'downloads.platforms.win.name',
  'downloads.platforms.win.listLabel',
  'downloads.platforms.win.short',
  'downloads.platforms.linux.name',
  'downloads.platforms.linux.listLabel',
  'downloads.platforms.linux.short',
  'downloads.platforms.ios.name',
  'downloads.platforms.ios.listLabel',
  'downloads.platforms.android.name',
  'downloads.platforms.android.listLabel',
  'downloads.platforms.web.name',
  'downloads.platforms.web.listLabel',
  'downloads.howItFits.diagram.devices.android',
  'downloads.howItFits.diagram.devices.web',
  'downloads.howItFits.diagram.hub.platform',
  'downloads.page.steps.plugin.requirements',
  'downloads.page.steps.plugin.cardTitle',
  'downloads.page.steps.plugin.wordpressOrgCta',
  'downloads.page.beta',
  'about.founder.signature.name',
  'about.timeline.dates.range',
  'home.title',
  'home.useCases.cards.retail.attribution',
  'home.useCases.cards.market.attribution',
  'home.useCases.cards.desktop.attribution',
  'home.useCases.cards.desktop.type',
  'home.benefits.visuals.offline.badge',
  'home.benefits.visuals.hardware.tablet',
  'home.pricing.pro.title',
  'home.ecosystem.badge',
  'home.ecosystem.devices.ios.label',
  'home.ecosystem.devices.android.label',
  'home.ecosystem.devices.desktop.label',
  'home.story.a2.platforms.p1',
  'home.story.a2.platforms.p2',
  'home.story.a2.platforms.p3',
  'home.story.a2.platforms.p4',
  'home.story.a2.platforms.p5',
  'home.title',
  'home.useCases.cards.retail.attribution',
  'home.useCases.cards.market.attribution',
  'home.useCases.cards.desktop.attribution',
  'home.useCases.cards.desktop.type',
  'home.benefits.visuals.offline.badge',
  'home.benefits.visuals.hardware.tablet',
  'home.pricing.pro.title',
  'home.ecosystem.badge',
  'home.ecosystem.devices.android.label',
  'home.story.a2.platforms.p1',
  'home.story.a2.platforms.p2',
  'home.story.a2.platforms.p3',
  'home.story.a2.platforms.p4',
  'home.story.a2.platforms.p5',
  'home.story.pos.subtotal',
  'legal.privacy.cookies.title',
  'legal.privacy.processors.items.p2.label',
  'legal.privacy.processors.items.p3.label',
  'legal.privacy.processors.items.p4.label',
  'legal.privacy.processors.items.p5.label',
  'legal.privacy.processors.items.p6.label',
  'legal.privacy.processors.items.p7.label',
])

const frenchIdenticalCopyAllowlist = new Set([
  'downloads.platforms.mac-arm.name',
  'downloads.platforms.mac-arm.listLabel',
  'downloads.platforms.mac-arm.short',
  'downloads.platforms.mac-intel.name',
  'downloads.platforms.mac-intel.listLabel',
  'downloads.platforms.mac-intel.short',
  'downloads.platforms.win.name',
  'downloads.platforms.win.listLabel',
  'downloads.platforms.win.short',
  'downloads.platforms.linux.name',
  'downloads.platforms.linux.listLabel',
  'downloads.platforms.linux.short',
  'downloads.platforms.ios.name',
  'downloads.platforms.ios.listLabel',
  'downloads.platforms.android.name',
  'downloads.platforms.android.listLabel',
  'downloads.platforms.web.name',
  'downloads.platforms.web.listLabel',
  'downloads.hero.versionMeta',
  'downloads.howItFits.diagram.devices.android',
  'downloads.howItFits.diagram.devices.web',
  'downloads.howItFits.diagram.hub.platform',
  'downloads.page.steps.plugin.requirements',
  'downloads.page.steps.plugin.cardTitle',
  'downloads.page.steps.plugin.wordpressOrgCta',
  'legal.privacy.processors.items.p2.label',
  'legal.privacy.processors.items.p3.label',
  'legal.privacy.processors.items.p4.label',
  'legal.privacy.processors.items.p5.label',
  'legal.privacy.processors.items.p6.label',
  'legal.privacy.processors.items.p7.label',
  'home.title',
  'home.useCases.cards.retail.attribution',
  'home.useCases.cards.market.attribution',
  'home.useCases.cards.desktop.attribution',
  'home.useCases.cards.desktop.type',
  'home.benefits.visuals.offline.badge',
  'home.benefits.visuals.hardware.tablet',
  'home.pricing.pro.title',
  'home.ecosystem.devices.android.label',
  'home.story.a2.platforms.p1',
  'home.story.a2.platforms.p2',
  'home.story.a2.platforms.p3',
  'home.story.a2.platforms.p4',
  'home.story.a2.platforms.p5',
  'about.founder.signature.name',
  'about.timeline.dates.range',
  'home.title',
  'home.useCases.cards.retail.attribution',
  'home.useCases.cards.market.attribution',
  'home.useCases.cards.desktop.attribution',
  'home.useCases.cards.desktop.type',
  'home.benefits.visuals.offline.badge',
  'home.benefits.visuals.hardware.tablet',
  'home.pricing.pro.title',
  'home.ecosystem.badge',
  'home.ecosystem.devices.ios.label',
  'home.ecosystem.devices.android.label',
  'home.ecosystem.devices.desktop.label',
  'home.story.a2.platforms.p1',
  'home.story.a2.platforms.p2',
  'home.story.a2.platforms.p3',
  'home.story.a2.platforms.p4',
  'home.story.a2.platforms.p5',
  'account.profile.taxLabels.abn',
  'account.profile.taxLabels.partitaIva',
  'account.profile.googleProvider',
  'account.profile.discordProvider',
  'account.profile.githubProvider',
  'account.receiptPdf.sellerIdentityWithAbn',
  'account.receiptPdf.sellerIdentity',
  'account.profile.avatarAlt',
  'account.receiptPdf.subtotal',
  'account.receiptPdf.total',
  'pro.hero.title',
  'pro.schema.name',
  'pro.checkout.offers.default',
  'pro.checkout.payment.methods.card.hint',
  'pro.checkout.payment.methods.bitcoin.title',
  'header.pro',
  'footer.copyright',
  'footer.discord',
  'footer.github',
  'footer.pro',
  'footer.wordpressOrg',
])

describe('messages key parity', () => {
  it('has a messages file for every configured locale', () => {
    const missingFiles = locales.filter(
      (locale) => !fileLocales.includes(locale)
    )
    expect(
      missingFiles,
      'Locales configured in src/i18n/config.ts without a messages/<locale>.json file'
    ).toEqual([])
  })

  it('has a configured locale for every messages file', () => {
    const strayFiles = fileLocales.filter(
      (locale) => !(locales as readonly string[]).includes(locale)
    )
    expect(
      strayFiles,
      'messages/*.json files without a matching locale in src/i18n/config.ts'
    ).toEqual([])
  })

  it(`${defaultLocale}.json has at least one key`, () => {
    expect(enKeys.length).toBeGreaterThan(0)
  })

  it.each(otherLocales)(
    `%s.json has the same keys as ${defaultLocale}.json`,
    (locale) => {
      const localeKeys = flattenKeys(loadMessages(locale))
      const missing = enKeys.filter((key) => !localeKeys.includes(key))
      const extra = localeKeys.filter((key) => !enKeys.includes(key))

      expect(
        { missing, extra },
        [
          `messages/${locale}.json has drifted from messages/${defaultLocale}.json.`,
          missing.length > 0
            ? `Missing keys: ${missing.join(', ')}`
            : undefined,
          extra.length > 0
            ? `Extra keys not in ${defaultLocale}.json: ${extra.join(', ')}`
            : undefined,
        ]
          .filter(Boolean)
          .join('\n')
      ).toEqual({ missing: [], extra: [] })
    }
  )

  it.each(otherLocales)(
    '%s.json translates the payment-received checkout recovery copy',
    (locale) => {
      const english = loadMessages(defaultLocale)
      const localized = loadMessages(locale)
      const untranslatedKeys = checkoutRecoveryKeys.filter((key) => {
        const englishValue = valueAtPath(english, key)
        const localizedValue = valueAtPath(localized, key)
        return englishValue !== undefined && localizedValue === englishValue
      })

      expect(
        untranslatedKeys,
        `messages/${locale}.json must not copy English money-at-risk checkout recovery copy verbatim`
      ).toEqual([])
    }
  )

  it('fr.json translates the audited public support, roadmap, downloads, legal, home, about, account, pro, auth, header, and footer copy', () => {
    const english = loadMessages(defaultLocale)
    const french = loadMessages('fr')
    const auditedKeys = enKeys.filter(
      (key) =>
        auditedFrenchNamespacePrefixes.some((prefix) =>
          key.startsWith(prefix)
        ) &&
        !frenchIdenticalCopyAllowlist.has(key)
    )
    const untranslatedKeys = auditedKeys.filter((key) => {
      const englishValue = valueAtPath(english, key)
      const frenchValue = valueAtPath(french, key)
      return (
        englishValue !== undefined &&
        frenchValue === englishValue &&
        /[A-Za-z]{3}/.test(englishValue)
      )
    })

    expect(
      untranslatedKeys,
      'messages/fr.json must not copy audited support/roadmap/downloads/legal/home/about/account/pro/auth/header/footer English strings verbatim'
    ).toEqual([])
  })

  it('de.json translates the audited support, auth, roadmap, header, footer, account, pro, downloads, about, home, and legal copy', () => {
    const english = loadMessages(defaultLocale)
    const german = loadMessages('de')
    const auditedKeys = enKeys.filter(
      (key) =>
        auditedGermanNamespacePrefixes.some((prefix) =>
          key.startsWith(prefix)
        ) && !germanIdenticalCopyAllowlist.has(key)
    )
    const untranslatedKeys = auditedKeys.filter((key) => {
      const englishValue = valueAtPath(english, key)
      const germanValue = valueAtPath(german, key)
      return (
        englishValue !== undefined &&
        germanValue === englishValue &&
        /[A-Za-z]{3}/.test(englishValue)
      )
    })

    expect(
      untranslatedKeys,
      'messages/de.json must not copy audited support/auth/roadmap/header/footer/account/pro/downloads/about/home/legal English strings verbatim'
    ).toEqual([])
  })


  it('ja.json translates the audited support, auth, roadmap, header, footer, account, pro, downloads, about, home, and legal copy', () => {
    const english = loadMessages(defaultLocale)
    const japanese = loadMessages('ja')
    const auditedKeys = enKeys.filter(
      (key) =>
        auditedJapaneseNamespacePrefixes.some((prefix) =>
          key.startsWith(prefix)
        ) && !japaneseIdenticalCopyAllowlist.has(key)
    )
    const untranslatedKeys = auditedKeys.filter((key) => {
      const englishValue = valueAtPath(english, key)
      const japaneseValue = valueAtPath(japanese, key)
      return (
        englishValue !== undefined &&
        japaneseValue === englishValue &&
        /[A-Za-z]{3}/.test(englishValue)
      )
    })

    expect(
      untranslatedKeys,
      'messages/ja.json must not copy audited support/auth/roadmap/header/footer/account/pro/downloads/about/home/legal English strings verbatim'
    ).toEqual([])
  })

  it('zh.json translates the audited support, auth, roadmap, header, footer, account, pro, downloads, and about copy', () => {
    const english = loadMessages(defaultLocale)
    const chinese = loadMessages('zh')
    const auditedKeys = enKeys.filter(
      (key) =>
        auditedChineseNamespacePrefixes.some((prefix) =>
          key.startsWith(prefix)
        ) && !chineseIdenticalCopyAllowlist.has(key)
    )
    const untranslatedKeys = auditedKeys.filter((key) => {
      const englishValue = valueAtPath(english, key)
      const chineseValue = valueAtPath(chinese, key)
      return (
        englishValue !== undefined &&
        chineseValue === englishValue &&
        /[A-Za-z]{3}/.test(englishValue)
      )
    })

    expect(
      untranslatedKeys,
      'messages/zh.json must not copy audited support/auth/roadmap/header/footer/account/pro/downloads/about English strings verbatim'
    ).toEqual([])
  })

  it('es.json translates the audited support, roadmap, auth, header, footer, account, pro, downloads, about, home, and legal copy', () => {
    const english = loadMessages(defaultLocale)
    const spanish = loadMessages('es')
    const auditedKeys = enKeys.filter(
      (key) =>
        auditedSpanishNamespacePrefixes.some((prefix) =>
          key.startsWith(prefix)
        ) && !spanishIdenticalCopyAllowlist.has(key)
    )
    const untranslatedKeys = auditedKeys.filter((key) => {
      const englishValue = valueAtPath(english, key)
      const spanishValue = valueAtPath(spanish, key)
      return (
        englishValue !== undefined &&
        spanishValue === englishValue &&
        /[A-Za-z]{3}/.test(englishValue)
      )
    })

    expect(
      untranslatedKeys,
      'messages/es.json must not copy audited support/roadmap/auth/header/footer/account/pro/downloads/about/home/legal English strings verbatim'
    ).toEqual([])
  })
})
