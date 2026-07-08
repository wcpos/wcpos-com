import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultLocale, localeDirections, locales } from './config'

const messagesDir = path.resolve(process.cwd(), 'messages')

type Messages = { [key: string]: string | Messages }
type IcuFormat = { signature: string; options: string[] }

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


function placeholders(value: string): string[] {
  return Array.from(
    value.matchAll(/\{\s*([A-Za-z][A-Za-z0-9_]*)\s*(?:,[^}]*)?\}/g),
    (match) => match[1] ?? ''
  ).sort()
}

function richTextTags(value: string): string[] {
  return Array.from(
    value.matchAll(/<\/?([A-Za-z][A-Za-z0-9_-]*)\b[^>]*>/g),
    (match) => match[0] ?? ''
  ).sort()
}

function icuFormats(value: string): IcuFormat[] {
  return Array.from(
    value.matchAll(
      /\{\s*([A-Za-z][A-Za-z0-9_]*)\s*,\s*(plural|select|selectordinal)\s*,/g
    ),
    (match) => {
      const formatStart = match.index ?? -1
      const formatEnd = findMatchingBrace(value, formatStart)
      const options =
        formatEnd === -1
          ? []
          : icuOptionSelectors(value.slice(formatStart + match[0].length, formatEnd))

      return {
        signature: `${match[1]}:${match[2]}`,
        options,
      }
    }
  ).sort((a, b) => a.signature.localeCompare(b.signature))
}

function findMatchingBrace(value: string, start: number): number {
  if (start < 0 || value[start] !== '{') return -1

  let depth = 0
  for (let index = start; index < value.length; index += 1) {
    if (value[index] === '{') depth += 1
    if (value[index] === '}') depth -= 1
    if (depth === 0) return index
  }

  return -1
}

function icuOptionSelectors(value: string): string[] {
  const selectors: string[] = []
  let index = 0

  while (index < value.length) {
    while (/[\s,]/.test(value[index] ?? '')) index += 1

    const tokenStart = index
    while (/[^{}\s]/.test(value[index] ?? '')) index += 1

    const token = value.slice(tokenStart, index)
    while (/\s/.test(value[index] ?? '')) index += 1

    if (token && value[index] === '{') selectors.push(token)
    if (value[index] !== '{') {
      index += 1
      continue
    }

    let depth = 0
    do {
      if (value[index] === '{') depth += 1
      if (value[index] === '}') depth -= 1
      index += 1
    } while (index < value.length && depth > 0)
  }

  return selectors.sort()
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
const sharedAuditedNamespacePrefixes = [
  'common.',
  'consent.',
  'errors.',
  'metadata.',
]
const checkoutRecoveryKeys = enKeys.filter((key) =>
  key.startsWith('pro.checkout.recovery.orderPending.')
)
const receiptPdfEnglishPhrases = [
  'Receipt',
  'Order #',
  'BILLED TO',
  'DETAILS',
  'No email provided',
  'Tax ID:',
  'Order date',
  'Payment',
  'Currency',
  'This order was originally',
  'previous store system',
  'Older emails',
  'DESCRIPTION',
  'QTY',
  'UNIT PRICE',
  'AMOUNT',
  'Untitled item',
  'No tax has been added',
  'not registered for GST in Australia',
  'no GST has been charged',
  'tax invoice',
  'proof of purchase',
  'tax records',
  'Generated',
  'Partially refunded',
  'Canceled',
  'Unknown',
]
const releaseNoteFallbackEnglishOnlyKeys = [
  'downloads.releaseHistory.fallback.v196',
  'downloads.releaseHistory.fallback.v195',
  'downloads.releaseHistory.fallback.v194',
  'downloads.releaseHistory.fallback.v190',
]
const globallyLanguageNeutralOrEnglishOnlyKeys = new Set([
  ...releaseNoteFallbackEnglishOnlyKeys,
  'about.founder.signature.name',
  'about.timeline.dates.range',
  // Brand/technical labels — kept verbatim across locales by design.
  'account.licenses.instanceId',
  'account.licenses.pluginVersionLabel',
  'account.licenses.wpVersionLabel',
  'account.licenses.wcVersionLabel',
  'account.profile.taxLabels.partitaIva',
  'account.receiptPdf.sellerIdentityWithAbn',
  'auth.common.emailPlaceholder',
  'downloads.hero.versionMeta',
  'downloads.page.steps.plugin.requirements',
  'downloads.page.steps.plugin.wordpressOrgCta',
  'downloads.platforms.ios.listLabel',
  'downloads.platforms.ios.name',
  'downloads.platforms.linux.short',
  'downloads.platforms.mac-arm.listLabel',
  'downloads.platforms.mac-arm.short',
  'downloads.platforms.mac-intel.listLabel',
  'downloads.platforms.mac-intel.name',
  'downloads.platforms.mac-intel.short',
  'downloads.platforms.win.short',
  'footer.copyright',
  'footer.pro',
  'footer.wordpressOrg',
  'home.benefits.visuals.hardware.tablet',
  'home.benefits.visuals.ownership.chips.openSource',
  'home.ecosystem.devices.desktop.label',
  'home.ecosystem.devices.ios.label',
  'home.story.nav.s1',
  'home.useCases.cards.desktop.type',
  'pro.checkout.offers.default',
  'pro.checkout.payment.methods.card.hint',
  'pro.hero.title',
  'pro.schema.name',
])
const auditedItalianNamespacePrefixes = [
  ...sharedAuditedNamespacePrefixes,
  'support.',
  'auth.',
  'roadmap.',
  'footer.',
  'header.',
  'common.',
  'account.',
  'pro.checkout.errors.',
  'pro.checkout.recovery.',
  'pro.checkout.successPage.',
  'home.title',
  'home.subtitle',
  'home.meta.',
  'home.benefits.',
  'home.features.',
  'home.pricing.',
  'home.ecosystem.',
  'home.story.',
  'downloads.',
  'about.',
  'pro.',
  'legal.',
]
const italianIdenticalCopyAllowlist = new Set([
  'account.licenses.instanceId',
  'account.licenses.pluginVersionLabel',
  'account.licenses.wpVersionLabel',
  'account.licenses.wcVersionLabel',
  ...releaseNoteFallbackEnglishOnlyKeys,
  'account.orderDetail.emailLabel',
  'account.profile.email',
  'account.profile.taxLabels.abn',
  'account.profile.taxLabels.partitaIva',
  'account.profile.googleProvider',
  'account.profile.discordProvider',
  'account.profile.githubProvider',
  'account.receiptPdf.sellerIdentityWithAbn',
  'account.receiptPdf.sellerIdentity',
  'home.title',
  'home.pricing.pro.title',
  'home.ecosystem.devices.ios.label',
  'home.ecosystem.devices.android.label',
  'home.story.a2.platforms.p1',
  'home.story.a2.platforms.p2',
  'home.story.a2.platforms.p3',
  'home.story.a2.platforms.p4',
  'home.story.a2.platforms.p5',
  'home.story.pos.registerShort',
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
  'pro.hero.title',
  'pro.schema.name',
  'pro.checkout.offers.default',
  'pro.checkout.payment.methods.card.hint',
  'pro.checkout.payment.methods.bitcoin.title',
  'legal.privacy.processors.items.p2.label',
  'legal.privacy.processors.items.p3.label',
  'legal.privacy.processors.items.p4.label',
  'legal.privacy.processors.items.p5.label',
  'legal.privacy.processors.items.p6.label',
  'legal.privacy.processors.items.p7.label',
  'header.pro',
  'footer.copyright',
  'footer.discord',
  'footer.github',
  'footer.pro',
  'footer.wordpressOrg',
])

const auditedDutchNamespacePrefixes = [
  ...sharedAuditedNamespacePrefixes,
  'support.',
  'auth.',
  'roadmap.',
  'common.',
  'header.',
  'footer.',
  'downloads.',
  'account.',
  'pro.checkout.',
  'legal.',
  'home.',
  'about.',
]
const dutchIdenticalCopyAllowlist = new Set([
  'account.licenses.instanceId',
  'account.licenses.pluginVersionLabel',
  'account.licenses.wpVersionLabel',
  'account.licenses.wcVersionLabel',
  ...releaseNoteFallbackEnglishOnlyKeys,
  'about.founder.signature.name',
  'about.timeline.dates.range',
  'home.title',
  'home.useCases.cards.retail.attribution',
  'home.useCases.cards.market.attribution',
  'home.useCases.cards.desktop.attribution',
  'home.benefits.visuals.offline.badge',
  'home.benefits.visuals.ownership.chips.openSource',
  'home.pricing.pro.title',
  'home.ecosystem.devices.ios.label',
  'home.ecosystem.devices.android.label',
  'home.story.a2.platforms.p1',
  'home.story.a2.platforms.p2',
  'home.story.a2.platforms.p3',
  'home.story.a2.platforms.p4',
  'home.story.a2.platforms.p5',
  'home.story.nav.s1',
  'home.story.pos.registerShort',
  'account.nav.downloads',
  'account.meta.downloads.title',
  'account.orderDetail.statusLabel',
  'account.licenses.downloads',
  'account.downloads.heading',
  'account.profile.postalLabels.postcode',
  'account.profile.taxLabels.abn',
  'account.profile.taxLabels.partitaIva',
  'account.profile.googleProvider',
  'account.profile.discordProvider',
  'account.profile.githubProvider',
  'account.receiptPdf.sellerIdentityWithAbn',
  'account.receiptPdf.sellerIdentity',
  'downloads.meta.title',
  'downloads.hero.eyebrow',
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
  'downloads.howItFits.diagram.devices.desktop',
  'downloads.howItFits.diagram.devices.android',
  'downloads.howItFits.diagram.devices.web',
  'downloads.howItFits.diagram.hub.platform',
  'downloads.page.steps.plugin.requirements',
  'downloads.page.steps.plugin.cardTitle',
  'downloads.page.steps.plugin.wordpressOrgCta',
  'downloads.releaseHistory.desktop',
  'header.pro',
  'footer.copyright',
  'footer.pro',
  'footer.discord',
  'footer.github',
  'footer.wordpressOrg',
  'pro.checkout.offers.default',
  'pro.checkout.steps.account',
  'pro.checkout.payment.methods.card.hint',
  'pro.checkout.payment.methods.bitcoin.title',
  'legal.privacy.cookies.title',
  'legal.privacy.processors.items.p2.label',
  'legal.privacy.processors.items.p3.label',
  'legal.privacy.processors.items.p4.label',
  'legal.privacy.processors.items.p5.label',
  'legal.privacy.processors.items.p6.label',
  'legal.privacy.processors.items.p7.label',
  'legal.privacy.contact.title',
  'legal.terms.contact.title',
])

const auditedKoreanNamespacePrefixes = [
  ...sharedAuditedNamespacePrefixes,
  'support.',
  'auth.',
  'roadmap.',
  'common.',
  'header.',
  'footer.',
  'downloads.',
  'account.',
  'pro.checkout.',
  'legal.',
  'home.',
  'about.',
]
const koreanIdenticalCopyAllowlist = new Set([
  'account.licenses.instanceId',
  'account.licenses.pluginVersionLabel',
  'account.licenses.wpVersionLabel',
  'account.licenses.wcVersionLabel',
  ...releaseNoteFallbackEnglishOnlyKeys,
  'about.founder.signature.name',
  'about.timeline.dates.range',
  'home.title',
  'home.useCases.cards.retail.attribution',
  'home.useCases.cards.market.attribution',
  'home.useCases.cards.desktop.attribution',
  'home.pricing.pro.title',
  'home.ecosystem.devices.ios.label',
  'home.ecosystem.devices.android.label',
  'home.story.a2.platforms.p1',
  'home.story.a2.platforms.p2',
  'home.story.a2.platforms.p3',
  'home.story.a2.platforms.p4',
  'home.story.a2.platforms.p5',
  'home.story.pos.registerShort',
  'auth.common.emailPlaceholder',
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
  'downloads.releaseHistory.desktop',
  'account.profile.taxLabels.abn',
  'account.profile.taxLabels.partitaIva',
  'account.profile.googleProvider',
  'account.profile.discordProvider',
  'account.profile.githubProvider',
  'account.receiptPdf.sellerIdentityWithAbn',
  'account.receiptPdf.sellerIdentity',
  'header.pro',
  'footer.copyright',
  'footer.pro',
  'footer.discord',
  'footer.github',
  'footer.wordpressOrg',
  'pro.checkout.offers.default',
  'pro.checkout.payment.methods.card.hint',
  'pro.checkout.payment.methods.bitcoin.title',
  'legal.privacy.processors.items.p2.label',
  'legal.privacy.processors.items.p3.label',
  'legal.privacy.processors.items.p4.label',
  'legal.privacy.processors.items.p5.label',
  'legal.privacy.processors.items.p6.label',
  'legal.privacy.processors.items.p7.label',
])

const auditedFrenchNamespacePrefixes = [
  ...sharedAuditedNamespacePrefixes,
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
  ...sharedAuditedNamespacePrefixes,
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
  'home.meta.',
  'home.benefits.',
  'home.features.',
  'home.pricing.',
  'home.ecosystem.',
]

const auditedPortugueseNamespacePrefixes = [
  ...sharedAuditedNamespacePrefixes,
  'support.',
  'auth.',
  'roadmap.',
  'header.',
  'footer.',
  'downloads.',
  'account.',
  'about.',
  'pro.',
  'legal.',
  'home.meta.',
  'home.benefits.',
  'home.features.',
  'home.pricing.',
  'home.ecosystem.',
  'home.story.',
  'home.subtitle',
]
const portugueseIdenticalCopyAllowlist = new Set([
  'account.licenses.instanceId',
  'account.licenses.pluginVersionLabel',
  'account.licenses.wpVersionLabel',
  'account.licenses.wcVersionLabel',
  ...releaseNoteFallbackEnglishOnlyKeys,
  'header.pro',
  'footer.copyright',
  'footer.discord',
  'footer.github',
  'footer.pro',
  'footer.wordpressOrg',
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
  'account.orderDetail.totalLabel',
  'account.profile.discordProvider',
  'account.profile.githubProvider',
  'account.profile.googleProvider',
  'account.profile.taxLabels.abn',
  'account.profile.taxLabels.partitaIva',
  'account.receiptPdf.sellerIdentity',
  'account.receiptPdf.sellerIdentityWithAbn',
  'account.receiptPdf.subtotal',
  'account.receiptPdf.total',
  'about.founder.signature.name',
  'about.timeline.dates.range',
  'pro.checkout.offers.default',
  'pro.checkout.payment.methods.bitcoin.title',
  'pro.checkout.payment.methods.card.hint',
  'pro.checkout.summary.total',
  'pro.hero.title',
  'pro.schema.name',
  'legal.privacy.processors.items.p2.label',
  'legal.privacy.processors.items.p3.label',
  'legal.privacy.processors.items.p4.label',
  'legal.privacy.processors.items.p5.label',
  'legal.privacy.processors.items.p6.label',
  'legal.privacy.processors.items.p7.label',
  'home.ecosystem.badge',
  'home.ecosystem.devices.android.label',
  'home.ecosystem.devices.desktop.label',
  'home.ecosystem.devices.ios.label',
  'home.pricing.pro.title',
  'home.story.a2.platforms.p1',
  'home.story.a2.platforms.p2',
  'home.story.a2.platforms.p3',
  'home.story.a2.platforms.p4',
  'home.story.a2.platforms.p5',
  'home.story.pos.subtotal',
])

const auditedJapaneseNamespacePrefixes = [
  ...sharedAuditedNamespacePrefixes,
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
  'home.meta.',
  'home.benefits.',
  'home.features.',
  'home.pricing.',
  'home.ecosystem.',
]
const japaneseIdenticalCopyAllowlist = new Set([
  'account.licenses.instanceId',
  'account.licenses.pluginVersionLabel',
  'account.licenses.wpVersionLabel',
  'account.licenses.wcVersionLabel',
  ...releaseNoteFallbackEnglishOnlyKeys,
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
  'home.ecosystem.badge',
  'home.ecosystem.devices.android.label',
  'home.ecosystem.devices.desktop.label',
  'home.ecosystem.devices.ios.label',
  'home.pricing.pro.title',
])
const auditedChineseNamespacePrefixes = [
  ...sharedAuditedNamespacePrefixes,
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
  'home.meta.',
  'home.benefits.',
  'home.features.',
  'home.pricing.',
  'home.ecosystem.',
]
const chineseIdenticalCopyAllowlist = new Set([
  'account.licenses.instanceId',
  'account.licenses.pluginVersionLabel',
  'account.licenses.wpVersionLabel',
  'account.licenses.wcVersionLabel',
  ...releaseNoteFallbackEnglishOnlyKeys,
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
  'home.ecosystem.devices.android.label',
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
  'home.ecosystem.badge',
  'home.ecosystem.devices.android.label',
  'home.ecosystem.devices.desktop.label',
  'home.ecosystem.devices.ios.label',
  'home.pricing.pro.title',
])
const auditedGermanNamespacePrefixes = [
  ...sharedAuditedNamespacePrefixes,
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
  'home.meta.',
  'home.benefits.',
  'home.features.',
  'home.pricing.',
  'home.ecosystem.',
]
const germanIdenticalCopyAllowlist = new Set([
  'account.licenses.instanceId',
  'account.licenses.pluginVersionLabel',
  'account.licenses.wpVersionLabel',
  'account.licenses.wcVersionLabel',
  ...releaseNoteFallbackEnglishOnlyKeys,
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
  'home.ecosystem.badge',
  'home.ecosystem.devices.android.label',
  'home.ecosystem.devices.desktop.label',
  'home.ecosystem.devices.ios.label',
  'home.pricing.pro.title',
])
const spanishIdenticalCopyAllowlist = new Set([
  'account.licenses.instanceId',
  'account.licenses.pluginVersionLabel',
  'account.licenses.wpVersionLabel',
  'account.licenses.wcVersionLabel',
  ...releaseNoteFallbackEnglishOnlyKeys,
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
  'home.ecosystem.badge',
  'home.ecosystem.devices.android.label',
  'home.ecosystem.devices.desktop.label',
  'home.ecosystem.devices.ios.label',
  'home.pricing.pro.title',
])

const frenchIdenticalCopyAllowlist = new Set([
  'account.licenses.instanceId',
  'account.licenses.pluginVersionLabel',
  'account.licenses.wpVersionLabel',
  'account.licenses.wcVersionLabel',
  ...releaseNoteFallbackEnglishOnlyKeys,
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

  it('defines an explicit text direction for every configured locale', () => {
    expect(Object.keys(localeDirections).sort()).toEqual([...locales].sort())
    expect(Object.values(localeDirections).every((dir) => dir === 'ltr' || dir === 'rtl')).toBe(true)
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
    `%s.json preserves ICU/message placeholders from ${defaultLocale}.json`,
    (locale) => {
      const english = loadMessages(defaultLocale)
      const localized = loadMessages(locale)
      const mismatches = enKeys
        .map((key) => ({
          key,
          expected: placeholders(valueAtPath(english, key) ?? ''),
          actual: placeholders(valueAtPath(localized, key) ?? ''),
        }))
        .filter(({ expected, actual }) => expected.join(',') !== actual.join(','))

      expect(
        mismatches,
        `messages/${locale}.json must keep the same interpolation placeholders as messages/${defaultLocale}.json`
      ).toEqual([])
    }
  )

  it.each(otherLocales)(
    `%s.json preserves rich-text tags from ${defaultLocale}.json`,
    (locale) => {
      const english = loadMessages(defaultLocale)
      const localized = loadMessages(locale)
      const mismatches = enKeys
        .map((key) => ({
          key,
          expected: richTextTags(valueAtPath(english, key) ?? ''),
          actual: richTextTags(valueAtPath(localized, key) ?? ''),
        }))
        .filter(({ expected, actual }) => expected.join('|') !== actual.join('|'))

      expect(
        mismatches,
        `messages/${locale}.json must keep the same rich-text tags as messages/${defaultLocale}.json`
      ).toEqual([])
    }
  )

  it.each(otherLocales)(
    `%s.json preserves ICU plural/select formats from ${defaultLocale}.json`,
    (locale) => {
      const english = loadMessages(defaultLocale)
      const localized = loadMessages(locale)
      const mismatches = enKeys
        .map((key) => ({
          key,
          expected: icuFormats(valueAtPath(english, key) ?? '').map(
            (format) => format.signature
          ),
          actual: icuFormats(valueAtPath(localized, key) ?? '').map(
            (format) => format.signature
          ),
        }))
        .filter(({ expected, actual }) => expected.join(',') !== actual.join(','))

      expect(
        mismatches,
        `messages/${locale}.json must keep the same ICU plural/select formats as messages/${defaultLocale}.json`
      ).toEqual([])
    }
  )

  it.each(fileLocales)('%s.json gives every ICU plural/select an other fallback', (locale) => {
    const messages = loadMessages(locale)
    const missingFallbacks = enKeys.flatMap((key) =>
      icuFormats(valueAtPath(messages, key) ?? '')
        .filter((format) => !format.options.includes('other'))
        .map((format) => `${key} (${format.signature})`)
    )

    expect(
      missingFallbacks,
      `messages/${locale}.json ICU plural/select messages must include an other fallback`
    ).toEqual([])
  })

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

  it.each(otherLocales)(
    '%s.json keeps PDF receipt copy free of key English phrases',
    (locale) => {
      const messages = loadMessages(locale)
      const receiptValues = enKeys
        .filter((key) => key.startsWith('account.receiptPdf.'))
        .map((key) => valueAtPath(messages, key))
        .filter((value): value is string => value !== undefined)
      const receiptText = receiptValues.join('\n')

      const leakedPhrases = receiptPdfEnglishPhrases.filter((phrase) =>
        receiptText.includes(phrase)
      )

      expect(
        leakedPhrases,
        `messages/${locale}.json account.receiptPdf copy must not retain high-signal English receipt phrases`
      ).toEqual([])
    }
  )

  it.each(otherLocales)(
    '%s.json keeps release-note fallback bodies in English',
    (locale) => {
      const english = loadMessages(defaultLocale)
      const localized = loadMessages(locale)
      const fallbackKeys = enKeys.filter((key) =>
        key.startsWith('downloads.releaseHistory.fallback.')
      )
      const translatedFallbacks = fallbackKeys
        .map((key) => ({
          key,
          english: valueAtPath(english, key),
          localized: valueAtPath(localized, key),
        }))
        .filter(({ english, localized }) => localized !== english)

      expect(
        translatedFallbacks,
        `messages/${locale}.json release-note fallbacks must stay English; GitHub release notes are not translated`
      ).toEqual([])
    }
  )

  it('non-English locale files do not copy English prose outside intentional exceptions', () => {
    const english = loadMessages(defaultLocale)
    const copiedEnglish = otherLocales.flatMap((locale) => {
      const localized = loadMessages(locale)

      return enKeys
        .map((key) => ({
          locale,
          key,
          value: valueAtPath(english, key),
          localizedValue: valueAtPath(localized, key),
        }))
        .filter(
          ({ key, value, localizedValue }) =>
            value !== undefined &&
            localizedValue === value &&
            !globallyLanguageNeutralOrEnglishOnlyKeys.has(key) &&
            /[A-Za-z]{3}/.test(value) &&
            /[\s.!?]/.test(value)
        )
        .map(({ locale, key }) => `${locale}:${key}`)
    })

    expect(
      copiedEnglish,
      'Non-English message files must not copy English prose verbatim unless the key is explicitly documented as language-neutral or English-only.'
    ).toEqual([])
  })

  it('it.json translates the audited Italian support, auth, account, checkout, roadmap, common, header, and footer copy', () => {
    const english = loadMessages(defaultLocale)
    const italian = loadMessages('it')
    const auditedKeys = enKeys.filter(
      (key) =>
        auditedItalianNamespacePrefixes.some((prefix) =>
          key.startsWith(prefix)
        ) && !italianIdenticalCopyAllowlist.has(key)
    )
    const untranslatedKeys = auditedKeys.filter((key) => {
      const englishValue = valueAtPath(english, key)
      const italianValue = valueAtPath(italian, key)
      return (
        englishValue !== undefined &&
        italianValue === englishValue &&
        /[A-Za-z]{3}/.test(englishValue)
      )
    })

    expect(
      untranslatedKeys,
      'messages/it.json must not copy audited Italian support/auth/account/checkout/roadmap/common/header/footer English strings verbatim'
    ).toEqual([])
  })

  it('nl.json translates the audited support, auth, roadmap, common, header, footer, downloads, account, checkout, legal, home, and about copy', () => {
    const english = loadMessages(defaultLocale)
    const dutch = loadMessages('nl')
    const auditedKeys = enKeys.filter(
      (key) =>
        auditedDutchNamespacePrefixes.some((prefix) =>
          key.startsWith(prefix)
        ) && !dutchIdenticalCopyAllowlist.has(key)
    )
    const untranslatedKeys = auditedKeys.filter((key) => {
      const englishValue = valueAtPath(english, key)
      const dutchValue = valueAtPath(dutch, key)
      return (
        englishValue !== undefined &&
        dutchValue === englishValue &&
        /[A-Za-z]{3}/.test(englishValue)
      )
    })

    expect(
      untranslatedKeys,
      'messages/nl.json must not copy audited support/auth/roadmap/common/header/footer/downloads English strings verbatim'
    ).toEqual([])
  })

  it('ko.json translates the audited support, auth, roadmap, common, header, footer, downloads, account, checkout, legal, home, and about copy', () => {
    const english = loadMessages(defaultLocale)
    const korean = loadMessages('ko')
    const auditedKeys = enKeys.filter(
      (key) =>
        auditedKoreanNamespacePrefixes.some((prefix) =>
          key.startsWith(prefix)
        ) && !koreanIdenticalCopyAllowlist.has(key)
    )
    const untranslatedKeys = auditedKeys.filter((key) => {
      const englishValue = valueAtPath(english, key)
      const koreanValue = valueAtPath(korean, key)
      return (
        englishValue !== undefined &&
        koreanValue === englishValue &&
        /[A-Za-z]{3}/.test(englishValue)
      )
    })

    expect(
      untranslatedKeys,
      'messages/ko.json must not copy audited support/auth/roadmap/common/header/footer/downloads/account English strings verbatim'
    ).toEqual([])
  })

  it('nl.json and ko.json translate short support feedback labels that are too short for the broad English-copy regex', () => {
    const english = loadMessages(defaultLocale)

    for (const [locale, expectedNo] of [
      ['nl', 'Nee'],
      ['ko', '아니요'],
    ] as const) {
      const localized = loadMessages(locale)
      const localizedNo = valueAtPath(localized, 'support.chat.feedback.no')

      expect(localizedNo).toBe(expectedNo)
      expect(localizedNo).not.toBe(
        valueAtPath(english, 'support.chat.feedback.no')
      )
    }
  })

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

  it('zh.json translates the audited support, auth, roadmap, header, footer, account, pro, downloads, about, home, and legal copy', () => {
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
      'messages/zh.json must not copy audited support/auth/roadmap/header/footer/account/pro/downloads/about/home/legal English strings verbatim'
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

  it('pt.json translates the audited support, auth, roadmap, downloads, account, about, pro, legal, and homepage section copy', () => {
    const english = loadMessages(defaultLocale)
    const portuguese = loadMessages('pt')
    const auditedKeys = enKeys.filter(
      (key) =>
        auditedPortugueseNamespacePrefixes.some((prefix) =>
          key.startsWith(prefix)
        ) && !portugueseIdenticalCopyAllowlist.has(key)
    )
    const untranslatedKeys = auditedKeys.filter((key) => {
      const englishValue = valueAtPath(english, key)
      const portugueseValue = valueAtPath(portuguese, key)
      return (
        englishValue !== undefined &&
        portugueseValue === englishValue &&
        /[A-Za-z]{3}/.test(englishValue)
      )
    })

    expect(
      untranslatedKeys,
      'messages/pt.json must not copy audited support/auth/roadmap/header/footer/downloads/account/about/pro/legal/homepage-section/story English strings verbatim'
    ).toEqual([])
  })
})
