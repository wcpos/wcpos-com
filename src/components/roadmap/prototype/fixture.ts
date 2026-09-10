// THROWAWAY: release briefs versus milestone items; A / B / C on /roadmap?variant=.
import type { Release } from './types'
import { formatDateForLocale } from '@/lib/date-format'

const url = 'https://github.com/orgs/wcpos/projects/4'
export const FIXTURE: Release[] = [
  {
    version: 'v1.11.0', theme: 'Checkout & payments', group: 'now', dueOn: '2026-09-30', shippedOn: null, url,
    why: "Every sale used to finish on WooCommerce's order-pay page, which capped what the POS could do at the till: one payment method per order, no cash without a round trip to the server, and no card terminal talking directly to the POS. 1.11.0 replaces that with a checkout that belongs to the POS. Cash, split payments and card terminals connected straight to the register all become possible, and refunds and receipts follow the same money model.\n\nAround the new checkout, 1.11.0 also brings the first customer-facing display, a quick discount at the till that replaces negative fees, and the first two configurable parts of the register layout.",
    notInRelease: ['Tap to Pay and Bluetooth card readers driven from the phone or tablet itself', 'Tips and surcharges in the money model', 'Third-party extension points for the register layout', 'Fiscal compliance (NF525, VeriFactu)'],
    epics: [
      { title: 'Split payments', state: 'in_progress', progress: { completed: 3, total: 7 }, summary: 'Take one order as several payments: part cash, part card, a gift card and the rest on a terminal. Change and refunds follow each payment.', url },
      { title: 'Customer-facing display', state: 'in_progress', progress: { completed: 2, total: 5 }, summary: 'A second screen shows the cart, totals and payment status to the customer as the order is rung up. Pairs over the local network, no cables.', url },
      { title: 'Desktop app builds standalone', state: 'in_progress', progress: { completed: 1, total: 3 }, summary: 'The Windows, macOS and Linux apps are built from their own repository. Merchants see no change; updates arrive the same way.', url },
      { title: 'Quick discount at the till', state: 'planned', summary: 'Knock an amount or a percentage off the order in one tap. Behind the scenes it is a coupon, so reports and refunds stay accurate.', url },
      { title: 'Quick filter buttons', state: 'planned', summary: 'A configurable row of buttons above the product list: categories, tags or any saved search, one tap to filter.', url },
      { title: 'Tax settings that stick', state: 'planned', summary: 'Which tax settings a cashier may change per order, and which are locked to the store, decided and enforced.', url },
      { title: 'Cart on the left or the right', state: 'done', summary: 'Choose which side of the screen the cart sits on. Left-handed cashiers and unusual counters welcome.', url },
      { title: 'Terminal provider audit', state: 'planned', summary: null, url },
    ],
  },
  {
    version: 'v1.12.0', theme: 'Reports & reconciliation', group: 'next', dueOn: '2026-10-31', shippedOn: null, url,
    why: 'Closing the shop should end with a clear account of the day. End-of-day reports and Z-reports bring sales, refunds and payment totals together in one place.\n\nCash reconciliation connects those totals to the money in the drawer. Count the cash, compare it with the expected balance, and record any difference before the next shift.',
    notInRelease: ['Multi-store consolidated reports'],
    epics: [
      { title: 'End-of-day report', state: 'planned', summary: 'Review sales, refunds and payments for the shift, then close the day with a Z-report.', url },
      { title: 'Cash drawer reconciliation', state: 'planned', summary: 'Count the drawer against the expected cash balance and record the difference at closing.', url },
      { title: 'Refunds report', state: 'planned', summary: null, url },
    ],
  },
  {
    version: 'v2.0.0', theme: 'Tablet-first POS', group: 'later', dueOn: null, shippedOn: null, url,
    why: 'The register should feel at home on a tablet, not like a desktop squeezed onto a smaller screen. A new touch-first layout makes the everyday sale easier to reach, with offline work built in from the moment the app opens.',
    notInRelease: [],
    epics: [
      { title: 'New register layout', state: 'planned', summary: 'A touch-first register with room for the cart, products and the actions cashiers use most.', url },
      { title: 'Offline-first from the first screen', state: 'planned', summary: 'Open the register and start selling with locally available products, even before a connection is restored.', url },
    ],
  },
  {
    version: 'v1.10.0', theme: 'Offline & stock-state correctness', group: 'shipped', dueOn: null, shippedOn: '2026-08-25', url,
    why: 'A dropped connection should not lose a sale, and stale stock should not promise an item that is already gone. This release keeps offline work queued and checks stock with the server when it matters.',
    notInRelease: [],
    epics: [
      { title: 'Offline queue for orders, emails and customers', state: 'done', summary: 'Keep orders, receipt emails and customer changes queued until the connection returns.', url },
      { title: 'Prevent overselling at the POS', state: 'done', summary: 'Respect available stock when adding products and changing quantities at the till.', url },
      { title: 'Barcode scan falls back to the server', state: 'done', summary: 'Look up a scanned barcode on the server when it is missing from the local catalogue.', url },
      { title: 'Server-side stock validation', state: 'done', summary: 'Check current stock on the server before accepting an order.', url },
    ],
  },
  {
    version: 'v1.9.0', theme: 'Receipts & printing', group: 'shipped', dueOn: null, shippedOn: '2026-06-12', url,
    why: 'Give customers a clear record of their purchase, on paper or by email. Receipt layouts and printing controls make the last step of a sale fit the shop and its hardware.',
    notInRelease: [],
    epics: [
      { title: 'Customisable receipt layouts', state: 'done', summary: 'Choose the shop details and footer message that appear on every receipt.', url },
      { title: 'Thermal receipt printing', state: 'done', summary: 'Print a compact receipt sized for the thermal printer at the register.', url },
      { title: 'Email and reprint receipts', state: 'done', summary: 'Send a receipt by email or print another copy from an existing order.', url },
    ],
  },
]
const order = { in_progress: 0, planned: 1, done: 2 }
export const visibleEpics = (release: Release) => release.epics.filter(e => e.summary !== null).sort((a, b) => order[a.state] - order[b.state])
export const releaseDate = (release: Release) => release.shippedOn ? `Shipped ${formatDateForLocale(release.shippedOn, 'en', { dateStyle: 'medium' })}` : release.dueOn ? `Due ${formatDateForLocale(release.dueOn, 'en', { dateStyle: 'medium' })}` : 'No date yet'
export const groups = ['now', 'next', 'later', 'shipped'] as const
export const phaseTone = { now: 'bg-wcpos-red text-white', next: 'border border-slate-300 text-muted-foreground dark:border-slate-600', later: 'border border-dotted border-slate-400 text-muted-foreground', shipped: 'border border-emerald-500/40 text-emerald-600 dark:text-emerald-400' }
export const stateLabel = { in_progress: 'In progress', planned: 'Planned', done: 'Done' }
export const stateTone = { in_progress: 'text-wcpos-red-accent', planned: 'text-muted-foreground', done: 'text-emerald-600 dark:text-emerald-400' }
