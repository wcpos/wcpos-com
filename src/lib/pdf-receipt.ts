import { readFile } from 'node:fs/promises'
import path from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import notoSansJpUnicode from '@fontsource-variable/noto-sans-jp/unicode.json'
import notoSansKrUnicode from '@fontsource-variable/noto-sans-kr/unicode.json'
import notoSansScUnicode from '@fontsource-variable/noto-sans-sc/unicode.json'
import notoSansTcUnicode from '@fontsource-variable/noto-sans-tc/unicode.json'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type {
  AccountOrderReceiptFact,
  AccountOrderReceiptProfileFact,
} from './account-order-projection'
import { formatOrderAmount } from './order-display'
import { formatDateForLocale } from './date-format'

// Seller identity printed in the receipt footer.
const SELLER_NAME = 'WCPOS'
const SELLER_WEBSITE = 'wcpos.com'
const SELLER_EMAIL = 'support@wcpos.com'
// The ABN footer line is omitted while empty.
const SELLER_ABN = '86 792 035 060'

/**
 * Order receipt PDF.
 *
 * Deliberately monochrome and typographic — receipts get printed in black
 * and white, so there are no filled colour blocks, only text weight,
 * greyscale and hairline rules. The document is titled "Receipt", NOT
 * "Tax Invoice": the seller is not registered for GST in Australia, and
 * only GST-registered businesses may issue tax invoices. The footer states
 * this so the receipt still works as proof of purchase for tax records.
 */

// Greyscale palette — prints faithfully in B&W.
const INK = rgb(0.12, 0.13, 0.15)
const MUTED = rgb(0.42, 0.44, 0.47)
const FAINT = rgb(0.62, 0.64, 0.67)
const LINE = rgb(0.8, 0.82, 0.84)

const PAGE_WIDTH = 595.28 // A4
const PAGE_HEIGHT = 841.89
const MARGIN = 56

type FontSource = {
  slug: string
  packageName: string
  unicode: Record<string, string>
}

type FontRange = {
  source: FontSource
  key: string
  start: number
  end: number
}

type FontFallback = {
  id: string
  font: PDFFont
}

type FontFallbackRequest = {
  id: string
  source: FontSource
  key: string
}

const CJK_FONT_SOURCES: FontSource[] = [
  {
    slug: 'noto-sans-sc',
    packageName: '@fontsource-variable/noto-sans-sc',
    unicode: notoSansScUnicode,
  },
  {
    slug: 'noto-sans-tc',
    packageName: '@fontsource-variable/noto-sans-tc',
    unicode: notoSansTcUnicode,
  },
  {
    slug: 'noto-sans-jp',
    packageName: '@fontsource-variable/noto-sans-jp',
    unicode: notoSansJpUnicode,
  },
  {
    slug: 'noto-sans-kr',
    packageName: '@fontsource-variable/noto-sans-kr',
    unicode: notoSansKrUnicode,
  },
]

const CJK_FONT_ASSET_URLS: Record<string, URL> = {
  'noto-sans-sc:100': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-100-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:101': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-101-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:102': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-102-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:103': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-103-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:104': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-104-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:105': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-105-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:106': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-106-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:107': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-107-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:108': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-108-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:109': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-109-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:110': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-110-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:111': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-111-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:112': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-112-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:113': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-113-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:114': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-114-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:115': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-115-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:116': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-116-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:117': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-117-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:118': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-118-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:119': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-119-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:21': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-21-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:22': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-22-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:23': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-23-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:24': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-24-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:25': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-25-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:26': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-26-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:27': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-27-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:28': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-28-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:29': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-29-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:30': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-30-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:31': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-31-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:32': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-32-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:33': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-33-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:34': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-34-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:35': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-35-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:36': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-36-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:37': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-37-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:38': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-38-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:39': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-39-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:4': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-4-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:40': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-40-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:41': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-41-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:42': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-42-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:43': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-43-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:44': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-44-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:45': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-45-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:46': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-46-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:47': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-47-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:48': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-48-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:49': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-49-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:5': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-5-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:50': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-50-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:51': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-51-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:52': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-52-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:53': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-53-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:54': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-54-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:55': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-55-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:56': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-56-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:57': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-57-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:58': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-58-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:59': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-59-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:6': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-6-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:60': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-60-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:61': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-61-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:62': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-62-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:63': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-63-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:64': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-64-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:65': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-65-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:66': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-66-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:67': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-67-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:68': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-68-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:69': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-69-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:70': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-70-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:71': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-71-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:72': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-72-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:73': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-73-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:74': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-74-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:75': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-75-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:76': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-76-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:77': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-77-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:78': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-78-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:79': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-79-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:80': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-80-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:81': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-81-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:82': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-82-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:83': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-83-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:84': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-84-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:85': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-85-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:86': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-86-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:87': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-87-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:88': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-88-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:89': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-89-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:90': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-90-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:91': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-91-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:97': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-97-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:98': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-98-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:99': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-99-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:cyrillic': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-cyrillic-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:latin-ext': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-latin-ext-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:latin': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-latin-wght-normal.woff2', import.meta.url),
  'noto-sans-sc:vietnamese': new URL('@fontsource-variable/noto-sans-sc/files/noto-sans-sc-vietnamese-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:0': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-0-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:100': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-100-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:101': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-101-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:102': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-102-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:103': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-103-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:104': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-104-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:105': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-105-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:106': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-106-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:107': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-107-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:108': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-108-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:109': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-109-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:110': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-110-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:111': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-111-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:112': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-112-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:113': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-113-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:114': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-114-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:115': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-115-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:116': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-116-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:117': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-117-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:118': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-118-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:119': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-119-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:19': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-19-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:20': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-20-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:21': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-21-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:22': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-22-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:23': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-23-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:24': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-24-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:25': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-25-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:26': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-26-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:27': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-27-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:28': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-28-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:29': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-29-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:30': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-30-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:31': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-31-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:32': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-32-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:33': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-33-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:34': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-34-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:35': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-35-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:36': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-36-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:37': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-37-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:38': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-38-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:39': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-39-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:40': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-40-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:41': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-41-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:42': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-42-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:43': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-43-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:44': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-44-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:45': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-45-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:46': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-46-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:47': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-47-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:48': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-48-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:49': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-49-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:50': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-50-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:51': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-51-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:52': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-52-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:53': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-53-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:54': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-54-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:55': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-55-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:56': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-56-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:57': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-57-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:58': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-58-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:59': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-59-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:6': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-6-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:60': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-60-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:61': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-61-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:62': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-62-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:63': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-63-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:64': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-64-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:65': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-65-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:66': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-66-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:67': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-67-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:68': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-68-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:69': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-69-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:7': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-7-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:70': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-70-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:71': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-71-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:72': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-72-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:73': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-73-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:74': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-74-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:75': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-75-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:76': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-76-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:77': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-77-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:78': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-78-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:79': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-79-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:8': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-8-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:80': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-80-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:81': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-81-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:82': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-82-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:83': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-83-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:84': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-84-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:85': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-85-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:86': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-86-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:87': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-87-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:88': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-88-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:89': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-89-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:90': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-90-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:91': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-91-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:92': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-92-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:97': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-97-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:98': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-98-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:99': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-99-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:cyrillic': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-cyrillic-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:latin-ext': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-latin-ext-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:latin': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-latin-wght-normal.woff2', import.meta.url),
  'noto-sans-tc:vietnamese': new URL('@fontsource-variable/noto-sans-tc/files/noto-sans-tc-vietnamese-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:0': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-0-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:1': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-1-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:10': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-10-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:100': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-100-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:101': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-101-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:102': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-102-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:103': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-103-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:104': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-104-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:105': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-105-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:106': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-106-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:107': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-107-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:108': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-108-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:109': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-109-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:11': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-11-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:110': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-110-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:111': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-111-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:112': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-112-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:113': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-113-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:114': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-114-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:115': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-115-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:116': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-116-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:117': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-117-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:118': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-118-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:119': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-119-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:12': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-12-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:13': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-13-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:14': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-14-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:15': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-15-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:16': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-16-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:17': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-17-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:18': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-18-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:19': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-19-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:2': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-2-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:20': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-20-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:21': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-21-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:22': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-22-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:23': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-23-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:24': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-24-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:25': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-25-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:26': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-26-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:27': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-27-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:28': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-28-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:29': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-29-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:3': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-3-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:30': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-30-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:31': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-31-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:32': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-32-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:33': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-33-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:34': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-34-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:35': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-35-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:36': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-36-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:37': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-37-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:38': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-38-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:39': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-39-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:4': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-4-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:40': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-40-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:41': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-41-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:42': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-42-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:43': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-43-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:44': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-44-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:45': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-45-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:46': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-46-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:47': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-47-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:48': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-48-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:49': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-49-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:5': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-5-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:50': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-50-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:51': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-51-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:52': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-52-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:53': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-53-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:54': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-54-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:55': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-55-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:56': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-56-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:57': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-57-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:58': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-58-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:59': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-59-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:6': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-6-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:60': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-60-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:61': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-61-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:62': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-62-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:63': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-63-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:64': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-64-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:65': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-65-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:66': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-66-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:67': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-67-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:68': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-68-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:69': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-69-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:7': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-7-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:70': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-70-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:71': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-71-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:72': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-72-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:73': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-73-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:74': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-74-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:75': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-75-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:76': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-76-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:77': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-77-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:78': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-78-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:79': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-79-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:8': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-8-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:80': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-80-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:81': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-81-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:82': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-82-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:83': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-83-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:84': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-84-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:85': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-85-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:86': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-86-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:87': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-87-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:88': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-88-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:89': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-89-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:9': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-9-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:90': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-90-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:91': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-91-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:92': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-92-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:93': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-93-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:94': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-94-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:95': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-95-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:96': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-96-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:97': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-97-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:98': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-98-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:99': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-99-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:cyrillic': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-cyrillic-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:latin-ext': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-latin-ext-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:latin': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-latin-wght-normal.woff2', import.meta.url),
  'noto-sans-jp:vietnamese': new URL('@fontsource-variable/noto-sans-jp/files/noto-sans-jp-vietnamese-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:0': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-0-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:1': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-1-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:10': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-10-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:100': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-100-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:101': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-101-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:102': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-102-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:103': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-103-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:104': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-104-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:105': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-105-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:106': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-106-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:107': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-107-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:108': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-108-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:109': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-109-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:11': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-11-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:110': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-110-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:111': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-111-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:112': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-112-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:113': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-113-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:114': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-114-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:115': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-115-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:116': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-116-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:117': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-117-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:118': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-118-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:119': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-119-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:12': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-12-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:13': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-13-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:14': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-14-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:15': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-15-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:16': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-16-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:17': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-17-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:18': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-18-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:19': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-19-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:2': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-2-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:20': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-20-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:21': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-21-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:22': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-22-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:23': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-23-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:24': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-24-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:25': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-25-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:26': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-26-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:27': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-27-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:28': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-28-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:29': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-29-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:3': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-3-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:30': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-30-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:31': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-31-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:32': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-32-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:33': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-33-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:34': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-34-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:35': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-35-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:36': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-36-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:37': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-37-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:38': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-38-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:39': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-39-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:4': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-4-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:40': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-40-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:41': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-41-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:42': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-42-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:43': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-43-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:44': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-44-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:45': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-45-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:46': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-46-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:47': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-47-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:48': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-48-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:49': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-49-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:5': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-5-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:50': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-50-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:51': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-51-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:52': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-52-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:53': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-53-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:54': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-54-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:55': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-55-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:56': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-56-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:57': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-57-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:58': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-58-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:59': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-59-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:6': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-6-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:60': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-60-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:61': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-61-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:62': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-62-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:63': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-63-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:64': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-64-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:65': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-65-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:66': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-66-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:67': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-67-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:68': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-68-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:69': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-69-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:7': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-7-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:70': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-70-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:71': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-71-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:72': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-72-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:73': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-73-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:74': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-74-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:75': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-75-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:76': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-76-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:77': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-77-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:78': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-78-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:79': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-79-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:8': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-8-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:80': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-80-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:81': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-81-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:82': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-82-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:83': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-83-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:84': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-84-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:85': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-85-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:86': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-86-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:87': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-87-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:88': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-88-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:89': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-89-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:9': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-9-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:90': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-90-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:91': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-91-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:92': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-92-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:93': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-93-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:94': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-94-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:95': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-95-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:96': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-96-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:97': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-97-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:98': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-98-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:99': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-99-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:cyrillic': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-cyrillic-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:latin-ext': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-latin-ext-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:latin': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-latin-wght-normal.woff2', import.meta.url),
  'noto-sans-kr:vietnamese': new URL('@fontsource-variable/noto-sans-kr/files/noto-sans-kr-vietnamese-wght-normal.woff2', import.meta.url),
}

const fontBytes = new Map<string, Promise<Uint8Array>>()
const fontRangesBySource = new Map<string, FontRange[]>()

function parseUnicodeRange(range: string): Array<[number, number]> {
  return range
    .split(',')
    .map((part) => part.trim().match(/^U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const start = Number.parseInt(match[1], 16)
      const end = Number.parseInt(match[2] ?? match[1], 16)
      return [start, end]
    })
}

function normalizeFontKey(key: string): string {
  return key.replace(/^\[(.+)\]$/, '$1')
}

function fontRangesForSource(source: FontSource): FontRange[] {
  const cached = fontRangesBySource.get(source.packageName)
  if (cached) return cached

  const ranges = Object.entries(source.unicode).flatMap(([key, value]) =>
    parseUnicodeRange(value).map(([start, end]) => ({
      source,
      key: normalizeFontKey(key),
      start,
      end,
    }))
  )

  fontRangesBySource.set(source.packageName, ranges)
  return ranges
}

function fontSourcesForLocale(locale: string): FontSource[] {
  const normalized = locale.toLowerCase()
  const bySlug = new Map(CJK_FONT_SOURCES.map((source) => [source.slug, source]))
  const preferred = normalized.startsWith('ko')
    ? 'noto-sans-kr'
    : normalized.startsWith('ja')
      ? 'noto-sans-jp'
      : normalized.includes('tw') || normalized.includes('hant')
        ? 'noto-sans-tc'
        : normalized.startsWith('zh')
          ? 'noto-sans-sc'
          : 'noto-sans-sc'

  return [
    bySlug.get(preferred),
    ...CJK_FONT_SOURCES.filter((source) => source.slug !== preferred),
  ].filter((source): source is FontSource => Boolean(source))
}

function fallbackRequestForCodePoint(
  codePoint: number,
  sources: FontSource[]
): FontFallbackRequest | null {
  for (const source of sources) {
    const range = fontRangesForSource(source).find(
      (candidate) => codePoint >= candidate.start && codePoint <= candidate.end
    )
    if (range) {
      return {
        id: `${range.source.slug}:${range.key}`,
        source: range.source,
        key: range.key,
      }
    }
  }

  return null
}

async function loadFontBytes(source: FontSource, key: string): Promise<Uint8Array> {
  const id = `${source.slug}:${key}`
  const cached = fontBytes.get(id)
  if (cached) return cached

  const assetUrl = CJK_FONT_ASSET_URLS[id]
  const nodeModulesPath = path.join(
    process.cwd(),
    'node_modules',
    source.packageName,
    'files',
    `${source.slug}-${key}-wght-normal.woff2`
  )
  const readableAssetUrl = assetUrl?.protocol === 'file:' ? assetUrl : null
  const pending = readFile(readableAssetUrl ?? nodeModulesPath)
    .catch((error: NodeJS.ErrnoException) => {
      if (readableAssetUrl && error.code === 'ENOENT') {
        return readFile(nodeModulesPath)
      }
      throw error
    })
    .then((bytes) => new Uint8Array(bytes))
  fontBytes.set(id, pending)
  return pending
}

function fontCanEncode(font: PDFFont, text: string): boolean {
  try {
    font.encodeText(text)
    return true
  } catch {
    return false
  }
}

async function embedUnicodeFallbacks(
  pdf: PDFDocument,
  text: string,
  locale: string,
  primaryFonts: PDFFont[]
): Promise<FontFallback[]> {
  const sources = fontSourcesForLocale(locale)
  const requests = new Map<string, FontFallbackRequest>()

  for (const char of text.normalize('NFC')) {
    if (primaryFonts.some((font) => fontCanEncode(font, char))) continue

    const codePoint = char.codePointAt(0)
    if (codePoint == null) continue

    const request = fallbackRequestForCodePoint(codePoint, sources)
    if (request) requests.set(request.id, request)
  }

  const fallbacks: FontFallback[] = []
  for (const request of requests.values()) {
    const bytes = await loadFontBytes(request.source, request.key)
    fallbacks.push({
      id: request.id,
      font: await pdf.embedFont(bytes, { subset: true }),
    })
  }

  return fallbacks
}

function normalize(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }

  return ''
}

function fontForChar(font: PDFFont, fallbacks: FontFallback[], char: string): PDFFont | null {
  if (fontCanEncode(font, char)) return font
  return fallbacks.find((fallback) => fontCanEncode(fallback.font, char))?.font ?? null
}

function sanitizeTextForFont(font: PDFFont, value: unknown, fallbacks: FontFallback[] = []): string {
  const normalizedValue = normalize(value)
  if (!normalizedValue) return ''

  let safeText = ''

  for (const char of normalizedValue.normalize('NFC')) {
    safeText += fontForChar(font, fallbacks, char) ? char : '?'
  }

  return safeText.replace(/\?{2,}/g, '?')
}

function widthOfText(font: PDFFont, text: string, size: number, fallbacks: FontFallback[] = []): number {
  let width = 0
  for (const char of text) {
    const drawFont = fontForChar(font, fallbacks, char) ?? font
    width += drawFont.widthOfTextAtSize(fontCanEncode(drawFont, char) ? char : '?', size)
  }
  return width
}

export interface ReceiptPdfCopy {
  title: string
  orderNumber: (id: string) => string
  billedTo: string
  details: string
  noEmailProvided: string
  taxId: (taxNumber: string) => string
  orderDate: string
  payment: string
  currency: string
  legacyNotice: (legacyDisplayId: number) => string
  description: string
  quantity: string
  unitPrice: string
  amount: string
  untitledItem: string
  subtotal: string
  tax: string
  total: string
  noTaxAdded: string
  sellerIdentity: (sellerName: string, sellerAbn: string | null) => string
  gstNotice: (sellerName: string) => string
  proofOfPurchase: string
  questions: (website: string, email: string) => string
  generated: (date: string) => string
  paymentStatus: {
    paid: string
    refunded: string
    partiallyRefunded: string
    canceled: string
    unknown: string
  }
}

function formatAmount(amount: unknown, currencyCode: unknown, locale: string): string {
  const numericAmount =
    typeof amount === 'number'
      ? amount
      : typeof amount === 'string'
        ? Number.parseFloat(amount)
        : Number.NaN

  if (!Number.isFinite(numericAmount)) {
    return '--'
  }

  const normalizedCurrency = normalize(currencyCode).toUpperCase()

  if (/^[A-Z]{3}$/.test(normalizedCurrency)) {
    try {
      return formatOrderAmount(numericAmount, normalizedCurrency, locale)
    } catch {
      // fall back below
    }
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount)
}

/** Human label for Medusa payment_status values. */
function paymentLabel(status: unknown, copy: ReceiptPdfCopy): string | null {
  const normalized = normalize(status).toLowerCase()
  if (!normalized) return null

  switch (normalized) {
    case 'captured':
    case 'paid':
      return copy.paymentStatus.paid
    case 'refunded':
      return copy.paymentStatus.refunded
    case 'partially_refunded':
      return copy.paymentStatus.partiallyRefunded
    case 'canceled':
      return copy.paymentStatus.canceled
    default:
      return copy.paymentStatus.unknown
  }
}

const POSTAL_CODE_FIRST_COUNTRIES = new Set([
  'AT',
  'BE',
  'CH',
  'CZ',
  'DE',
  'DK',
  'ES',
  'FI',
  'FR',
  'IT',
  'NL',
  'NO',
  'PL',
  'PT',
  'SE',
])

const POSTAL_REGION_CITY_COUNTRIES = new Set([
  'CN',
  'HK',
  'JP',
  'KR',
  'MO',
  'TW',
])

function displayCountryName(countryCode: unknown, locale: string): string {
  const code = normalize(countryCode).toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return code

  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

function localityLine(profile: AccountOrderReceiptProfileFact): string {
  const countryCode = normalize(profile.countryCode).toUpperCase()
  const city = normalize(profile.city)
  const region = normalize(profile.region)
  const postalCode = normalize(profile.postalCode)
  const distinctRegion = region && region !== city ? region : ''

  if (POSTAL_REGION_CITY_COUNTRIES.has(countryCode)) {
    return [postalCode, distinctRegion || region, city].filter(Boolean).join(' ')
  }

  if (POSTAL_CODE_FIRST_COUNTRIES.has(countryCode)) {
    const postalCity = [postalCode, city].filter(Boolean).join(' ')
    return [postalCity, distinctRegion].filter(Boolean).join(', ')
  }

  const regionPostal = [distinctRegion || region, postalCode]
    .filter(Boolean)
    .join(' ')
  return [city, regionPostal].filter(Boolean).join(', ')
}

function billingAddressLines(
  profile: AccountOrderReceiptProfileFact,
  locale: string
): string[] {
  const lines = [
    normalize(profile.addressLine1),
    normalize(profile.addressLine2),
    localityLine(profile),
    displayCountryName(profile.countryCode, locale),
  ]
  return lines.filter(Boolean)
}

/** Greedy word-wrap against real glyph widths. */
function wrapText(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number,
  fallbacks: FontFallback[] = []
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (widthOfText(font, candidate, size, fallbacks) <= maxWidth || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines
}

/**
 * Single-line fit: returns text unchanged if it fits maxWidth, otherwise
 * trims words and appends an ellipsis so it can't overprint an adjacent
 * column. Used for values drawn on a shared baseline (item titles beside the
 * numeric columns, billed-to lines beside the details column).
 */
function truncateToWidth(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number,
  fallbacks: FontFallback[] = []
): string {
  // Measure the encodable form — widthOfTextAtSize throws on glyphs the
  // standard font can't encode (e.g. emoji), which drawText would replace.
  text = sanitizeTextForFont(font, text, fallbacks)
  if (widthOfText(font, text, size, fallbacks) <= maxWidth) return text

  const ellipsis = '…'
  let truncated = text
  while (
    truncated &&
    widthOfText(font, truncated + ellipsis, size, fallbacks) > maxWidth
  ) {
    truncated = truncated.slice(0, -1).trimEnd()
  }
  return truncated ? truncated + ellipsis : ellipsis
}

type TextStyle = {
  font: PDFFont
  size: number
  color?: ReturnType<typeof rgb>
  fallbacks?: FontFallback[]
}

function drawTextRuns(page: PDFPage, text: string, x: number, y: number, style: TextStyle) {
  const safe = sanitizeTextForFont(style.font, text, style.fallbacks)
  if (!safe) return

  let runFont: PDFFont | null = null
  let runText = ''
  let runX = x

  const flush = () => {
    if (!runText || !runFont) return
    page.drawText(runText, {
      x: runX,
      y,
      font: runFont,
      size: style.size,
      color: style.color ?? INK,
    })
    runX += runFont.widthOfTextAtSize(runText, style.size)
    runText = ''
  }

  for (const char of safe) {
    const nextFont = fontForChar(style.font, style.fallbacks ?? [], char) ?? style.font
    if (runFont && nextFont !== runFont) flush()
    runFont = nextFont
    runText += fontCanEncode(nextFont, char) ? char : '?'
  }

  flush()
}

function drawLeft(page: PDFPage, text: string, x: number, y: number, style: TextStyle) {
  drawTextRuns(page, text, x, y, style)
}

function drawRight(page: PDFPage, text: string, rightX: number, y: number, style: TextStyle) {
  const safe = sanitizeTextForFont(style.font, text, style.fallbacks)
  if (!safe) return
  drawTextRuns(page, safe, rightX - widthOfText(style.font, safe, style.size, style.fallbacks), y, style)
}

function drawRule(page: PDFPage, y: number, fromX = MARGIN, toX = PAGE_WIDTH - MARGIN) {
  page.drawLine({
    start: { x: fromX, y },
    end: { x: toX, y },
    thickness: 0.75,
    color: LINE,
  })
}


function collectReceiptText(
  receipt: AccountOrderReceiptFact,
  copy: ReceiptPdfCopy,
  locale: string
): string {
  const values: string[] = [
    SELLER_NAME,
    SELLER_WEBSITE,
    SELLER_EMAIL,
    copy.title,
    copy.orderNumber(normalize(receipt.displayId) || '--'),
    copy.billedTo,
    copy.details,
    copy.noEmailProvided,
    copy.orderDate,
    copy.payment,
    copy.currency,
    copy.description,
    copy.quantity,
    copy.unitPrice,
    copy.amount,
    copy.untitledItem,
    copy.subtotal,
    copy.tax,
    copy.total,
    copy.noTaxAdded,
    copy.sellerIdentity(SELLER_NAME, SELLER_ABN || null),
    copy.gstNotice(SELLER_NAME),
    copy.proofOfPurchase,
    copy.questions(`${SELLER_WEBSITE}/discord`, SELLER_EMAIL),
    copy.generated(formatDateForLocale(new Date().toISOString(), locale)),
    copy.paymentStatus.paid,
    copy.paymentStatus.refunded,
    copy.paymentStatus.partiallyRefunded,
    copy.paymentStatus.canceled,
    formatDateForLocale(receipt.createdAt, locale),
    normalize(receipt.displayId) || '--',
    normalize(receipt.customerName),
    normalize(receipt.customerEmail),
    ...billingAddressLines(receipt.billingProfile, locale),
    normalize(receipt.currencyCode).toUpperCase() || '--',
  ]

  const taxNumber = normalize(receipt.billingProfile.taxNumber)
  if (taxNumber) values.push(copy.taxId(taxNumber))
  if (receipt.legacyDisplayId) values.push(copy.legacyNotice(receipt.legacyDisplayId))

  const payment = paymentLabel(receipt.paymentStatus, copy)
  if (payment) values.push(payment)

  for (const item of receipt.items ?? []) {
    values.push(
      normalize(item?.title) || copy.untitledItem,
      normalize(item?.quantity) || '--',
      formatAmount(item?.unitPrice, receipt.currencyCode, locale),
      formatAmount(item?.total, receipt.currencyCode, locale)
    )
  }

  values.push(
    formatAmount(receipt.totals.subtotal, receipt.currencyCode, locale),
    formatAmount(receipt.totals.tax, receipt.currencyCode, locale),
    formatAmount(receipt.totals.total, receipt.currencyCode, locale)
  )

  return values.filter(Boolean).join('\n')
}

export async function buildReceiptPdf(
  receipt: AccountOrderReceiptFact,
  copy: ReceiptPdfCopy,
  locale: string = 'en-US'
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const fallbackText = collectReceiptText(receipt, copy, locale)
  const fallbacks = await embedUnicodeFallbacks(pdf, fallbackText, locale, [regular, bold])
  const style = (textStyle: TextStyle): TextStyle => ({ ...textStyle, fallbacks })

  const rightEdge = PAGE_WIDTH - MARGIN

  // ── Header ────────────────────────────────────────────────────────────
  let y = PAGE_HEIGHT - 78
  drawLeft(page, SELLER_NAME, MARGIN, y, style({ font: bold, size: 22 }))
  drawLeft(page, SELLER_WEBSITE, MARGIN, y - 16, style({ font: regular, size: 9, color: MUTED }))

  drawRight(page, copy.title, rightEdge, y, style({ font: bold, size: 22 }))
  drawRight(page, copy.orderNumber(normalize(receipt.displayId) || '--'), rightEdge, y - 16, style({
    font: regular,
    size: 10,
    color: MUTED,
  }))

  y -= 42
  drawRule(page, y)

  // ── Billed to / order details columns ─────────────────────────────────
  y -= 26
  const detailX = 330
  const columnTop = y

  drawLeft(page, copy.billedTo, MARGIN, y, style({ font: bold, size: 8, color: FAINT }))
  y -= 16

  const billingLines: Array<{ text: string; isName?: boolean }> = []
  const customerName = normalize(receipt.customerName)
  if (customerName) billingLines.push({ text: customerName, isName: true })
  const email = normalize(receipt.customerEmail)
  billingLines.push({ text: email || copy.noEmailProvided, isName: !customerName })

  const addressLines = billingAddressLines(receipt.billingProfile, locale)
  const taxNumber = normalize(receipt.billingProfile.taxNumber)

  for (const line of addressLines) {
    billingLines.push({ text: line })
  }
  if (taxNumber) billingLines.push({ text: copy.taxId(taxNumber) })

  // Keep billed-to text clear of the DETAILS column that shares these rows.
  const billedToWidth = detailX - MARGIN - 16
  for (const line of billingLines) {
    const font = line.isName ? bold : regular
    drawLeft(page, truncateToWidth(font, line.text, 10, billedToWidth, fallbacks), MARGIN, y, style({
      font,
      size: 10,
      color: line.isName ? INK : MUTED,
    }))
    y -= 14
  }

  let detailY = columnTop
  drawLeft(page, copy.details, detailX, detailY, style({ font: bold, size: 8, color: FAINT }))
  detailY -= 16

  const detailRows: Array<[string, string]> = []
  detailRows.push([copy.orderDate, formatDateForLocale(receipt.createdAt, locale)])
  const payment = paymentLabel(receipt.paymentStatus, copy)
  if (payment) detailRows.push([copy.payment, payment])
  detailRows.push([copy.currency, normalize(receipt.currencyCode).toUpperCase() || '--'])

  for (const [label, value] of detailRows) {
    drawLeft(page, label, detailX, detailY, style({ font: regular, size: 10, color: MUTED }))
    drawLeft(page, value, detailX + 80, detailY, style({ font: regular, size: 10 }))
    detailY -= 14
  }

  y = Math.min(y, detailY) - 14

  // ── Legacy order-number notice ────────────────────────────────────────
  // Orders migrated from the old WooCommerce store carried a different
  // order number. Flag it so customers can reconcile older records.
  const legacyDisplayId = receipt.legacyDisplayId
  if (legacyDisplayId) {
    const noticeText = copy.legacyNotice(legacyDisplayId)
    const noticeLines = wrapText(regular, noticeText, 9, rightEdge - MARGIN - 24, fallbacks)
    const boxHeight = noticeLines.length * 12 + 18

    page.drawRectangle({
      x: MARGIN,
      y: y - boxHeight,
      width: rightEdge - MARGIN,
      height: boxHeight,
      borderWidth: 0.75,
      borderColor: LINE,
    })

    let noticeY = y - 15
    for (const line of noticeLines) {
      drawLeft(page, line, MARGIN + 12, noticeY, style({ font: regular, size: 9, color: MUTED }))
      noticeY -= 12
    }

    y -= boxHeight + 24
  } else {
    y -= 10
  }

  // ── Items table ───────────────────────────────────────────────────────
  const qtyRight = 380
  const unitRight = 460
  const amountRight = rightEdge

  drawLeft(page, copy.description, MARGIN, y, style({ font: bold, size: 8, color: FAINT }))
  drawRight(page, copy.quantity, qtyRight, y, style({ font: bold, size: 8, color: FAINT }))
  drawRight(page, copy.unitPrice, unitRight, y, style({ font: bold, size: 8, color: FAINT }))
  drawRight(page, copy.amount, amountRight, y, style({ font: bold, size: 8, color: FAINT }))
  y -= 8
  drawRule(page, y)
  y -= 18

  for (const item of receipt.items ?? []) {
    const itemTitle =
      typeof item?.title === 'string' && item.title.trim()
        ? item.title.trim()
        : copy.untitledItem

    // Keep the title clear of the right-aligned QTY column on the same row.
    const titleWidth = qtyRight - MARGIN - 30
    drawLeft(page, truncateToWidth(regular, itemTitle, 10, titleWidth, fallbacks), MARGIN, y, style({
      font: regular,
      size: 10,
    }))
    drawRight(page, normalize(item.quantity) || '--', qtyRight, y, style({
      font: regular,
      size: 10,
    }))
    drawRight(page, formatAmount(item.unitPrice, receipt.currencyCode, locale), unitRight, y, style({
      font: regular,
      size: 10,
    }))
    drawRight(page, formatAmount(item.total, receipt.currencyCode, locale), amountRight, y, style({
      font: regular,
      size: 10,
    }))
    y -= 18
  }

  y += 4
  drawRule(page, y)

  // ── Totals ────────────────────────────────────────────────────────────
  const totalsLabelX = 380
  y -= 20

  drawLeft(page, copy.subtotal, totalsLabelX, y, style({ font: regular, size: 10, color: MUTED }))
  drawRight(page, formatAmount(receipt.totals.subtotal, receipt.currencyCode, locale), amountRight, y, style({
    font: regular,
    size: 10,
  }))
  y -= 16

  // No GST registration → tax is always zero; only render a tax row in the
  // unexpected case a nonzero amount ever appears, so it's never hidden.
  const taxAmount =
    typeof receipt.totals.tax === 'number' && Number.isFinite(receipt.totals.tax)
      ? receipt.totals.tax
      : 0
  if (taxAmount > 0) {
    drawLeft(page, copy.tax, totalsLabelX, y, style({ font: regular, size: 10, color: MUTED }))
    drawRight(page, formatAmount(taxAmount, receipt.currencyCode, locale), amountRight, y, style({
      font: regular,
      size: 10,
    }))
    y -= 16
  }

  drawRule(page, y + 4, totalsLabelX, amountRight)
  y -= 8
  drawLeft(page, copy.total, totalsLabelX, y, style({ font: bold, size: 12 }))
  drawRight(page, formatAmount(receipt.totals.total, receipt.currencyCode, locale), amountRight, y, style({
    font: bold,
    size: 12,
  }))
  // Only reassure "no tax" when no Tax row was drawn — otherwise the receipt
  // would show a Tax line and a contradicting "no tax" note directly below it.
  if (taxAmount <= 0) {
    y -= 16
    drawRight(page, copy.noTaxAdded, amountRight, y, style({
      font: regular,
      size: 8.5,
      color: MUTED,
    }))
  }

  // ── Footer ────────────────────────────────────────────────────────────
  const footerLines: Array<{ text: string; style: TextStyle }> = []
  const sellerIdentity = copy.sellerIdentity(SELLER_NAME, SELLER_ABN || null)
  footerLines.push({ text: sellerIdentity, style: { font: bold, size: 9 } })
  footerLines.push({
    text: copy.gstNotice(SELLER_NAME),
    style: { font: regular, size: 9, color: MUTED },
  })
  footerLines.push({
    text: copy.proofOfPurchase,
    style: { font: regular, size: 9, color: MUTED },
  })
  footerLines.push({
    text: copy.questions(`${SELLER_WEBSITE}/discord`, SELLER_EMAIL),
    style: { font: regular, size: 9, color: MUTED },
  })

  let footerY = MARGIN + footerLines.length * 13
  drawRule(page, footerY + 14)
  drawRight(page, copy.generated(formatDateForLocale(new Date().toISOString(), locale)), rightEdge, footerY, style({
    font: regular,
    size: 8,
    color: FAINT,
  }))
  for (const line of footerLines) {
    drawLeft(page, line.text, MARGIN, footerY, style(line.style))
    footerY -= 13
  }

  return pdf.save({
    useObjectStreams: false,
  })
}
