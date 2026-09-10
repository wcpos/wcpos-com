import type { Epic, Release, RoadmapData } from '@/types/roadmap'

// Illustrative release briefs for credential-free local development, not live promises.
const epic = (
  number: number,
  title: string,
  summary: string,
  state: Epic['state'],
  completed: number,
  total: number
): Epic => ({
  number, title, summary, state,
  progress: { completed, total },
  url: `https://github.com/wcpos/roadmap/issues/${number}`,
})
const release = (
  major: number,
  minor: number,
  theme: string,
  dueOn: string | null
): Release => ({
  version: `v${major}.${minor}.0`,
  major, minor, theme, dueOn,
  why: 'Make daily work at the counter simpler and more predictable.',
  notInRelease: '- Changes outside this release’s focus',
  prose: '',
  url: `https://github.com/wcpos/roadmap/issues/${major * 100 + minor}`,
  epics: [],
  hiddenEpicCount: 0,
  shippedOn: null,
})

export const ROADMAP_DEV_FIXTURE: RoadmapData = {
  now: {
    ...release(1, 11, 'Checkout & payments', '2026-10-01'),
    why: 'Keep checkout moving, even when an order needs **more than one payment method**.\n\n- Make the remaining balance clear\n- Give cashiers a predictable path from cart to receipt',
    notInRelease: '- Fiscal compliance\n- Multi-store inventory',
    prose: 'These examples illustrate the public release brief; the live scope is maintained on GitHub.',
    epics: [
      epic(
        1, 'Split payments',
        'Accept cash and card on the same order. Every payment stays visible, with the remaining balance shown before the next payment.',
        'in_progress', 3, 8
      ),
      epic(
        2, 'Payment terminals',
        'Connect the terminal flow to checkout so cashiers can follow a payment from request to confirmation.',
        'in_progress', 2, 5
      ),
      epic(
        3, 'Checkout conditions',
        'Configure the checks that must pass before checkout, including required customers and minimum totals.',
        'planned', 0, 4
      ),
      epic(
        4, 'Saved carts',
        'Put an order aside and return to it without rebuilding the cart while another customer waits.',
        'planned', 0, 3
      ),
      epic(
        5, 'Payment recovery',
        'Make interrupted payments visible so the cashier knows what happened and which action is available next.',
        'planned', 0, 4
      ),
      epic(
        6, 'Cash rounding',
        'Show cash rounding separately from the order total so the amount collected is clear.',
        'done', 3, 3
      ),
      epic(
        7, 'Payment receipts',
        'Include each payment and its amount on the receipt, keeping mixed-payment orders easy to understand.',
        'done', 2, 2
      ),
    ],
  },
  next: [{
    ...release(1, 12, 'Reports & daily close', '2026-11-01'),
    epics: [epic(
        8, 'Daily close',
        'Review the day’s payments and reconcile the register before closing.',
        'planned', 0, 5
      )],
  }],
  later: [release(2, 0, 'The next generation', null)],
  shipped: [
    {
      ...release(1, 10, 'Offline & stock reliability', null),
      shippedOn: '2026-09-01T00:00:00Z',
      epics: [epic(
        9, 'Offline queue',
        'Keep offline changes queued until they can sync.',
        'done', 6, 6
      )],
    },
    {
      ...release(1, 9, 'Receipts & refunds', null),
      shippedOn: '2026-08-01T00:00:00Z',
      epics: [epic(
        10, 'Refunds',
        'Process refunds from the register and reflect them on receipts.',
        'done', 4, 4
      )],
    },
  ],
}
