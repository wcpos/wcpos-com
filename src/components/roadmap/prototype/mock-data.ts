import type { RoadmapData } from '@/types/roadmap'

/**
 * PROTOTYPE — realistic mock roadmap data, mirroring the live content of
 * beta.wcpos.com/roadmap (2026-07). Used as a dev-only fallback when GitHub
 * credentials are not configured locally. Delete with the prototype.
 */
export const MOCK_ROADMAP_DATA: RoadmapData = {
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
      title: 'v1.9.x',
      description: 'Stabilization patches for the 1.9 line (rolling patch lane).',
      dueOn: null,
      state: 'open',
      progress: { total: 2, completed: 2 },
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
    {
      title: '2026.3',
      description: 'Tax & receipts polish.',
      dueOn: '2026-03-31T00:00:00Z',
      state: 'closed',
      progress: { total: 2, completed: 2 },
      features: [
        {
          id: 'f8',
          title: 'Receipt template gallery',
          description:
            'A gallery of ready-made receipt templates (standard, thermal 58mm/80mm) selectable from POS settings.',
          status: 'done',
          type: 'feature',
          url: 'https://github.com/wcpos/woocommerce-pos/issues/11',
        },
        {
          id: 'f9',
          title: 'Per-register tax rate overrides',
          description:
            'Allow each register to pin a tax location, so pop-up locations charge the right rate.',
          status: 'done',
          type: 'feature',
          url: 'https://github.com/wcpos/woocommerce-pos/issues/12',
        },
      ],
      bugs: [],
    },
  ],
}
