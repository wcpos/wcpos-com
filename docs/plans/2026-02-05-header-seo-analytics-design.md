# Header, SEO & Analytics Design

**Date:** 2026-02-05
**Status:** Approved

## Summary

Three interconnected changes to wcpos.com:

1. Marketing site header with navigation and auth-aware button
2. Full SEO strategy (metadata, OG images, sitemap, structured data)
3. Umami analytics integration with custom event tracking

---

## 1. Header Component

### Architecture

Two separate headers for different contexts:

- **Marketing header** (`src/components/main/site-header.tsx`) — used across all public pages
- **Account header** (`src/components/account/account-header.tsx`) — stays as-is for the dashboard

### Route Group Reorganization

Move public pages into a `(main)` route group with its own layout:

```
src/app/
├── (main)/
│   ├── layout.tsx          # Marketing layout: SiteHeader + footer
│   ├── page.tsx            # Homepage (moved from app/page.tsx)
│   ├── pro/                # Pro pricing (moved from app/pro/)
│   ├── roadmap/            # Roadmap page
│   └── support/            # Support page (or external link)
├── (auth)/
│   ├── layout.tsx          # Stays as-is
│   ├── login/
│   └── register/
├── account/
│   ├── layout.tsx          # Stays as-is (own header + sidebar)
│   └── ...
└── layout.tsx              # Root layout (metadata, fonts, analytics)
```

Route groups in parentheses don't affect URLs. Moving `page.tsx` into `(main)/` still serves it at `/`.

### Marketing Header Spec

```
┌─────────────────────────────────────────────────────────┐
│ [WCPOS Logo]   Docs  Roadmap  Pro  Support    [Sign In] │
└─────────────────────────────────────────────────────────┘
```

- **Component:** Server component, async (reads auth cookie)
- **Position:** Sticky top, backdrop blur, border-bottom
- **Left:** WCPOS logo linking to `/`
- **Center/left:** Nav links
  - Docs → `https://docs.wcpos.com` (external, opens same tab)
  - Roadmap → `/roadmap`
  - Pro → `/pro`
  - Support → TBD (external docs link or dedicated page)
- **Right:** Auth-aware button
  - No session: "Sign In" button → `/login`
  - Has session: "Account" link → `/account`
  - Auth check: reads `medusa-token` cookie via `getAuthToken()` (no API call)
  - Wrapped in `<Suspense>` to keep the header shell static for PPR
- **Mobile:** Hamburger icon → sheet/dropdown with all nav items + auth action

### Account Header

No changes. Keeps its existing layout with logo, breadcrumb, customer email, and logout.

---

## 2. SEO Strategy

### Root Metadata (`src/app/layout.tsx`)

```typescript
export const metadata: Metadata = {
  metadataBase: new URL('https://wcpos.com'),
  title: {
    template: '%s | WCPOS',
    default: 'WCPOS - WooCommerce Point of Sale',
  },
  description: 'Point of Sale for WooCommerce. Fast, reliable POS system for your WooCommerce store.',
  openGraph: {
    type: 'website',
    siteName: 'WCPOS',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
  },
}
```

### Per-Page Metadata

Each public page exports `metadata` with specific title and description:

| Page | Title | Description |
|------|-------|-------------|
| `/` | `WCPOS - WooCommerce Point of Sale` (default) | Main product description |
| `/pro` | `Pro - Premium Features` | Pro plugin features and pricing |
| `/pro/checkout` | `Checkout` | Purchase flow |
| `/roadmap` | `Roadmap` | Product development roadmap |

### Dynamic OG Images

Use `next/og` (ImageResponse) via route segment files:

- `src/app/opengraph-image.tsx` — default OG image with WCPOS branding
- Override per-route where specific imagery makes sense (e.g., `/pro`)
- Template: page title rendered on WCPOS brand colors (#2D6F4F primary)

### Sitemap (`src/app/sitemap.ts`)

Dynamic sitemap listing all public pages:

```typescript
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://wcpos.com', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://wcpos.com/pro', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://wcpos.com/roadmap', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    // ... other public pages
  ]
}
```

### Robots (`src/app/robots.ts`)

```typescript
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/account/', '/api/', '/admin/'] },
    sitemap: 'https://wcpos.com/sitemap.xml',
  }
}
```

### Structured Data (JSON-LD)

Inline `<script type="application/ld+json">` in relevant pages:

- **Root layout:** `Organization` schema (WCPOS name, logo, URL)
- **Homepage:** `SoftwareApplication` schema (WCPOS desktop app)
- **`/pro` page:** `Product` schema (Pro plugin with pricing)

---

## 3. Umami Analytics

### Script Integration

Add Umami tracking script to root layout via Next.js `<Script>`:

```tsx
// src/app/layout.tsx
import Script from 'next/script'

// Only renders when env vars are configured
{process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL && process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
  <Script
    src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
    data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
    strategy="afterInteractive"
  />
)}
```

### Environment Variables

```
NEXT_PUBLIC_UMAMI_SCRIPT_URL=   # e.g., https://analytics.wcpos.com/script.js
NEXT_PUBLIC_UMAMI_WEBSITE_ID=   # Website ID from Umami dashboard
```

Script silently skips when env vars are absent (dev environments).

### Custom Event Tracking

Use `data-umami-event` attributes on key elements (no JS wrapper needed):

| Element | Event Name | Location |
|---------|-----------|----------|
| Pro CTA button | `click-pro-cta` | Homepage, header Pro link |
| Sign In button | `click-sign-in` | Header |
| Start Checkout | `click-start-checkout` | Pro pricing page |
| Download buttons | `click-download` | Homepage / download area |
| Google OAuth | `click-oauth-google` | Login page |
| GitHub OAuth | `click-oauth-github` | Login page |

### Privacy

Umami is cookieless and GDPR-compliant by default. No consent banner required for Umami alone.

---

## Files to Create/Modify

### New Files
- `src/app/(main)/layout.tsx` — marketing layout with header + footer
- `src/components/main/site-header.tsx` — marketing header (replace unused existing one)
- `src/app/opengraph-image.tsx` — default dynamic OG image
- `src/app/sitemap.ts` — dynamic sitemap
- `src/app/robots.ts` — robots config

### Modified Files
- `src/app/layout.tsx` — update metadata, add Umami script, add JSON-LD Organization
- `src/app/(main)/page.tsx` — move from `src/app/page.tsx`, add JSON-LD SoftwareApplication
- `src/app/(main)/pro/page.tsx` — move from `src/app/pro/`, add JSON-LD Product

### Moved Files (into `(main)` route group)
- `src/app/page.tsx` → `src/app/(main)/page.tsx`
- `src/app/pro/` → `src/app/(main)/pro/`

### Deleted Files
- `src/components/site-header.tsx` — replaced by `src/components/main/site-header.tsx`
- `src/components/user-nav.tsx` — unused, not needed
