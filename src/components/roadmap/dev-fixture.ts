import type { RoadmapData } from '@/types/roadmap'

/**
 * Dev-only roadmap fixture, mirroring the live GitHub project board content
 * (2026-07). Substituted when the roadmap fetch returns empty in non-prod —
 * local dev has no GitHub App credentials, and an empty page makes layout
 * work on /roadmap impossible. Never used in production.
 */
export const ROADMAP_DEV_FIXTURE: RoadmapData = {
  active: [
    {
      title: 'v1.10.0',
      description:
        'Offline & stock-state correctness: offline queues, overselling prevention, barcode reliability. Monthly dot-release cadence.',
      dueOn: '2026-09-01T00:00:00Z',
      state: 'open',
      progress: { total: 9, completed: 3 },
      features: [
        {
          id: 'f1',
          title: 'Sync engine & offline overhaul: queuing architecture',
          description:
            'Epic: major update to the sync engine and offline capabilities. The sync engine gets a queuing architecture so writes made offline replay reliably when the connection returns.',
          status: 'in_progress',
          type: 'feature',
          url: 'https://github.com/wcpos/monorepo/issues/1',
          subIssueProgress: { total: 8, completed: 3 },
        },
        {
          id: 'f2',
          title: 'Offline queue: email, order sync, customer sync',
          description:
            'Phase 5 (offline rendering) disables the email button when offline rather than queuing emails. This is a stopgap — the broader question is how queued side-effects replay.',
          status: 'in_progress',
          type: 'feature',
          url: 'https://github.com/wcpos/monorepo/issues/2',
          subIssueProgress: { total: 6, completed: 2 },
        },
        {
          id: 'f3',
          title: 'Barcode scan: online fallback with auto-add',
          description:
            'When a barcode scan finds no local match, the user currently sees a "not found" toast and has to manually trigger a server search. This two-step process should be one.',
          status: 'in_progress',
          type: 'feature',
          url: 'https://github.com/wcpos/monorepo/issues/3',
        },
        {
          id: 'f4',
          title: 'Prevent overselling at POS',
          description:
            'One of the longest-standing feature requests. The WC REST API does not prevent overselling — orders created via the API (or WP Admin) skip stock validation entirely.',
          status: 'planned',
          type: 'feature',
          url: 'https://github.com/wcpos/monorepo/issues/4',
          subIssueProgress: { total: 3, completed: 0 },
        },
      ],
      bugs: [
        {
          id: 'b1',
          title: 'Cart: fee lines dropped after cashier switch',
          description: '',
          status: 'done',
          type: 'bug',
          url: 'https://github.com/wcpos/monorepo/issues/5',
        },
        {
          id: 'b2',
          title: 'Receipt preview blank when template file is missing',
          description: '',
          status: 'in_progress',
          type: 'bug',
          url: 'https://github.com/wcpos/monorepo/issues/6',
        },
      ],
    },
  ],
  upcoming: [
    {
      title: 'v1.11.0',
      description:
        'Checkout & payments: split payments, checkout conditions. Monthly dot-release cadence.',
      dueOn: '2026-07-31T00:00:00Z',
      state: 'open',
      progress: { total: 2, completed: 0 },
      features: [
        {
          id: 'f10',
          title: 'Split payment support',
          description:
            'Accept more than one payment method on a single order — cash plus card, gift card plus cash — with sub-order handling on the WooCommerce side.',
          status: 'planned',
          type: 'feature',
          url: 'https://github.com/wcpos/roadmap/issues/3',
          subIssueProgress: { total: 2, completed: 0 },
        },
        {
          id: 'f11',
          title: 'Checkout conditions system',
          description:
            'Configurable rules that must be satisfied before checkout completes — required customer, minimum totals, custom prompts.',
          status: 'planned',
          type: 'feature',
          url: 'https://github.com/wcpos/monorepo/issues/43',
        },
      ],
      bugs: [],
    },
    {
      title: 'Compliance / Fiscalization',
      description:
        'NF525 (France) / VeriFactu (Spain) fiscal compliance framework — VeriFactu deadline Jan 2027.',
      dueOn: '2027-01-01T00:00:00Z',
      state: 'open',
      progress: { total: 1, completed: 0 },
      features: [
        {
          id: 'f6',
          title:
            'Fiscal compliance framework: NF525 (France), VeriFactu (Spain), and beyond',
          description:
            'Countries worldwide are mandating that POS/cash register software guarantee transaction integrity through cryptographic mechanisms. We need a pluggable framework.',
          status: 'planned',
          type: 'feature',
          url: 'https://github.com/wcpos/woocommerce-pos-pro/issues/8',
        },
      ],
      bugs: [],
    },
  ],
  shipped: [
    {
      title: 'v1.9.x',
      description: 'Stabilization patches for the 1.9 line (rolling patch lane).',
      dueOn: null,
      state: 'closed',
      progress: { total: 1, completed: 1 },
      features: [
        {
          id: 'f5',
          title:
            'Add server-side thermal engine renderer (gate server preview for thermal templates)',
          description:
            'PR #596 introduces thermal engine templates in the gallery. However, the server-side receipt rendering path (includes/Templates/Receipt.php) cannot render them yet.',
          status: 'done',
          type: 'feature',
          url: 'https://github.com/wcpos/woocommerce-pos/issues/7',
        },
      ],
      bugs: [],
    },
    {
      title: '2026.4',
      description: null,
      dueOn: '2026-04-30T00:00:00Z',
      state: 'closed',
      progress: { total: 3, completed: 3 },
      features: [
        {
          id: 'f7',
          title: 'Refund support',
          description:
            'Support processing refunds directly from the POS. WooCommerce already exposes a refunds endpoint on orders — we wrap that in the Pro plugin and surface it in the cart.',
          status: 'done',
          type: 'feature',
          url: 'https://github.com/wcpos/woocommerce-pos-pro/issues/9',
        },
      ],
      bugs: [
        {
          id: 'b3',
          title: 'Refund rounding mismatch on inclusive-tax stores',
          description: '',
          status: 'done',
          type: 'bug',
          url: 'https://github.com/wcpos/woocommerce-pos-pro/issues/10',
        },
      ],
    },
  ],
}
