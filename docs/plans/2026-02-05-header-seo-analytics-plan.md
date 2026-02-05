# Header, SEO & Analytics Implementation Plan

> **For Claude:** REQUIRED: Use /execute-plan to implement this plan task-by-task.

**Goal:** Add a marketing site header with nav and auth button, full SEO metadata/sitemap/OG images, and Umami analytics integration.

**Architecture:** Create a `(main)` route group for public pages with its own layout containing the site header. SEO metadata set at root layout with per-page overrides. Umami script in root layout gated by env vars.

**Tech Stack:** Next.js 16 (App Router, PPR), React 19, Tailwind CSS v4, Radix UI (Sheet for mobile menu), shadcn/ui, next/og for OG images.

---

### Task 1: Add Sheet UI component (mobile menu dependency)

The mobile hamburger menu needs a Sheet (slide-out drawer) component. It doesn't exist yet.

**Files:**
- Create: `src/components/ui/sheet.tsx`

**Step 1: Install the Sheet component via shadcn CLI**

Run: `cd /Users/kilbot/Projects/wcpos-com/.worktrees/header-seo-analytics && pnpm dlx shadcn@latest add sheet`

This will create `src/components/ui/sheet.tsx` using the project's existing Radix Dialog dependency.

**Step 2: Verify the file was created**

Run: `ls src/components/ui/sheet.tsx`
Expected: File exists.

**Step 3: Commit**

```bash
git add src/components/ui/sheet.tsx
git commit -m "chore: add shadcn sheet component for mobile nav"
```

---

### Task 2: Create (main) route group and move pages

Move public pages into `src/app/(main)/` so they share a marketing layout. Route groups in parentheses don't affect URLs.

**Files:**
- Create: `src/app/(main)/layout.tsx`
- Move: `src/app/page.tsx` -> `src/app/(main)/page.tsx`
- Move: `src/app/pro/` -> `src/app/(main)/pro/`

**Step 1: Create the (main) route group directory and move files**

```bash
cd /Users/kilbot/Projects/wcpos-com/.worktrees/header-seo-analytics
mkdir -p src/app/\(main\)
git mv src/app/page.tsx src/app/\(main\)/page.tsx
git mv src/app/pro src/app/\(main\)/pro
```

**Step 2: Create the (main) layout**

Create `src/app/(main)/layout.tsx`:

```tsx
export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
```

This is a pass-through for now. The header gets added in Task 3.

**Step 3: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds. URLs `/` and `/pro` still work (route groups are invisible to the router).

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: move public pages into (main) route group"
```

---

### Task 3: Build the marketing site header

**Files:**
- Create: `src/components/main/site-header.tsx`
- Modify: `src/app/(main)/layout.tsx`
- Delete: `src/components/site-header.tsx` (unused old version)
- Delete: `src/components/user-nav.tsx` (unused)

**Step 1: Create the site header component**

Create `src/components/main/site-header.tsx`:

```tsx
import { Suspense } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { getAuthToken } from '@/lib/medusa-auth'

const navLinks = [
  { label: 'Docs', href: 'https://docs.wcpos.com' },
  { label: 'Roadmap', href: '/roadmap' },
  { label: 'Pro', href: '/pro', umamiEvent: 'click-pro-cta' },
  { label: 'Support', href: 'https://docs.wcpos.com/support' },
]

async function AuthButton() {
  const token = await getAuthToken()

  if (token) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link href="/account">Account</Link>
      </Button>
    )
  }

  return (
    <Button size="sm" asChild data-umami-event="click-sign-in">
      <Link href="/login">Sign In</Link>
    </Button>
  )
}

function AuthButtonFallback() {
  return <div className="h-9 w-20" />
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto">
        {/* Logo + Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">
            WCPOS
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
                {...(link.umamiEvent && { 'data-umami-event': link.umamiEvent })}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop Auth Button */}
        <div className="hidden md:block">
          <Suspense fallback={<AuthButtonFallback />}>
            <AuthButton />
          </Suspense>
        </div>

        {/* Mobile Hamburger */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="text-lg font-bold">WCPOS</SheetTitle>
            <nav className="flex flex-col gap-4 mt-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                  {...(link.umamiEvent && { 'data-umami-event': link.umamiEvent })}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t pt-4 mt-2">
                <Suspense fallback={<AuthButtonFallback />}>
                  <AuthButton />
                </Suspense>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
```

**Step 2: Update the (main) layout to include the header**

Replace `src/app/(main)/layout.tsx`:

```tsx
import { SiteHeader } from '@/components/main/site-header'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  )
}
```

**Step 3: Delete unused old components**

```bash
git rm src/components/site-header.tsx
git rm src/components/user-nav.tsx
```

**Step 4: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds. No import errors from deleted files (they were unused).

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add marketing site header with nav and auth button"
```

---

### Task 4: Update root metadata and add Umami script

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Update the root layout**

Replace the full contents of `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import Script from 'next/script'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://wcpos.com'),
  title: {
    template: '%s | WCPOS',
    default: 'WCPOS - WooCommerce Point of Sale',
  },
  description:
    'Point of Sale for WooCommerce. Fast, reliable POS system for your WooCommerce store.',
  openGraph: {
    type: 'website',
    siteName: 'WCPOS',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL &&
          process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
            <Script
              src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
              data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
              strategy="afterInteractive"
            />
          )}
      </body>
    </html>
  )
}
```

**Step 2: Update per-page metadata to use the title template**

Modify `src/app/(main)/pro/page.tsx` metadata:

```typescript
export const metadata = {
  title: 'Pro - Premium Features',
  description:
    'Unlock the full potential of WooCommerce POS with Pro features including advanced reporting, multi-outlet support, and priority support.',
}
```

(Title changes from `'WooCommerce POS Pro - Premium Features'` to `'Pro - Premium Features'` since the template appends `| WCPOS`.)

Modify `src/app/(main)/pro/checkout/page.tsx` metadata:

```typescript
export const metadata = {
  title: 'Checkout',
  description: 'Complete your purchase of WooCommerce POS Pro',
}
```

**Step 3: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add root SEO metadata, title template, and Umami analytics script"
```

---

### Task 5: Add JSON-LD structured data

**Files:**
- Modify: `src/app/layout.tsx` (Organization schema)
- Modify: `src/app/(main)/page.tsx` (SoftwareApplication schema)
- Modify: `src/app/(main)/pro/page.tsx` (Product schema)

**Step 1: Add Organization JSON-LD to root layout**

In `src/app/layout.tsx`, add inside the `<body>` tag before `{children}`:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'WCPOS',
      url: 'https://wcpos.com',
      logo: 'https://wcpos.com/icon.png',
      sameAs: ['https://github.com/wcpos'],
    }),
  }}
/>
```

**Step 2: Add SoftwareApplication JSON-LD to homepage**

In `src/app/(main)/page.tsx`, add a `<script>` tag inside the `<main>` element:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'WooCommerce POS',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Windows, macOS, Linux',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    }),
  }}
/>
```

**Step 3: Add Product JSON-LD to pro page**

In `src/app/(main)/pro/page.tsx`, add a `<script>` tag inside the `<main>` element at the top:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'WooCommerce POS Pro',
      description:
        'Premium Point of Sale plugin for WooCommerce with advanced reporting, multi-outlet support, and priority support.',
      brand: {
        '@type': 'Organization',
        name: 'WCPOS',
      },
      offers: [
        {
          '@type': 'Offer',
          name: 'Yearly Subscription',
          priceCurrency: 'USD',
          price: '129',
          availability: 'https://schema.org/InStock',
        },
        {
          '@type': 'Offer',
          name: 'Lifetime License',
          priceCurrency: 'USD',
          price: '249',
          availability: 'https://schema.org/InStock',
        },
      ],
    }),
  }}
/>
```

Note: These prices are hardcoded placeholders for structured data. If the actual product prices change frequently, consider fetching them dynamically and using `generateMetadata()` instead. For now, static values are fine since they match the Medusa catalog.

**Step 4: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add JSON-LD structured data (Organization, SoftwareApplication, Product)"
```

---

### Task 6: Add sitemap.ts and robots.ts

**Files:**
- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`

**Step 1: Create the sitemap**

Create `src/app/sitemap.ts`:

```typescript
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://wcpos.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://wcpos.com/pro',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://wcpos.com/roadmap',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
}
```

**Step 2: Create the robots config**

Create `src/app/robots.ts`:

```typescript
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/account/', '/api/', '/admin/'],
    },
    sitemap: 'https://wcpos.com/sitemap.xml',
  }
}
```

**Step 3: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds. `/sitemap.xml` and `/robots.txt` routes are generated.

**Step 4: Commit**

```bash
git add src/app/sitemap.ts src/app/robots.ts
git commit -m "feat: add sitemap.xml and robots.txt"
```

---

### Task 7: Add dynamic OG image

**Files:**
- Create: `src/app/opengraph-image.tsx`

**Step 1: Create the default OG image generator**

Create `src/app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'WCPOS - WooCommerce Point of Sale'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a4a3a 0%, #2D6F4F 50%, #3a8a65 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: 'white',
            marginBottom: 16,
          }}
        >
          WCPOS
        </div>
        <div
          style={{
            fontSize: 32,
            color: 'rgba(255, 255, 255, 0.85)',
          }}
        >
          WooCommerce Point of Sale
        </div>
      </div>
    ),
    { ...size }
  )
}
```

**Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds. The OG image route is generated.

**Step 3: Commit**

```bash
git add src/app/opengraph-image.tsx
git commit -m "feat: add dynamic OG image with WCPOS branding"
```

---

### Task 8: Add Umami event tracking to existing components

**Files:**
- Modify: `src/app/(auth)/login/page.tsx` (OAuth buttons)
- Modify: `src/app/(main)/pro/page.tsx` (checkout CTA)

**Step 1: Read the login page to find OAuth buttons**

Read `src/app/(auth)/login/page.tsx` and locate the Google/GitHub OAuth button elements.

**Step 2: Add `data-umami-event` attributes to OAuth buttons**

Add `data-umami-event="click-oauth-google"` to the Google OAuth button.
Add `data-umami-event="click-oauth-github"` to the GitHub OAuth button.

**Step 3: Add tracking to pro page CTA buttons**

The `PricingCard` component likely has "Buy" or "Get started" buttons. Read `src/components/pro/pricing-card.tsx` and add `data-umami-event="click-start-checkout"` to the checkout/buy button.

**Step 4: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Umami event tracking to OAuth and checkout buttons"
```

---

### Task 9: Write tests and final verification

**Files:**
- Create: `src/components/main/site-header.test.tsx`

**Step 1: Write unit test for the site header**

Create `src/components/main/site-header.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SiteHeader } from './site-header'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock medusa-auth
vi.mock('@/lib/medusa-auth', () => ({
  getAuthToken: vi.fn(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}))

import { getAuthToken } from '@/lib/medusa-auth'
const mockGetAuthToken = vi.mocked(getAuthToken)

describe('SiteHeader', () => {
  it('renders nav links', async () => {
    mockGetAuthToken.mockResolvedValue(null)
    const header = await SiteHeader()
    render(header)

    expect(screen.getByText('WCPOS')).toBeDefined()
    expect(screen.getByText('Docs')).toBeDefined()
    expect(screen.getByText('Roadmap')).toBeDefined()
    expect(screen.getByText('Pro')).toBeDefined()
    expect(screen.getByText('Support')).toBeDefined()
  })

  it('shows Sign In when not authenticated', async () => {
    mockGetAuthToken.mockResolvedValue(null)
    const header = await SiteHeader()
    render(header)

    expect(screen.getAllByText('Sign In').length).toBeGreaterThan(0)
  })

  it('shows Account link when authenticated', async () => {
    mockGetAuthToken.mockResolvedValue('fake-token')
    const header = await SiteHeader()
    render(header)

    expect(screen.getAllByText('Account').length).toBeGreaterThan(0)
  })

  it('links Docs to external URL', async () => {
    mockGetAuthToken.mockResolvedValue(null)
    const header = await SiteHeader()
    render(header)

    const docsLinks = screen.getAllByText('Docs')
    const docsLink = docsLinks[0].closest('a')
    expect(docsLink?.getAttribute('href')).toBe('https://docs.wcpos.com')
  })
})
```

**Step 2: Run the test to verify it passes**

Run: `pnpm test:unit`
Expected: All tests pass (65 existing + 4 new = 69).

**Step 3: Run the full build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 4: Run lint**

Run: `pnpm lint`
Expected: No lint errors.

**Step 5: Commit**

```bash
git add src/components/main/site-header.test.tsx
git commit -m "test: add unit tests for marketing site header"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Add Sheet UI component | `src/components/ui/sheet.tsx` |
| 2 | Create (main) route group, move pages | `src/app/(main)/layout.tsx`, move `page.tsx` and `pro/` |
| 3 | Build marketing site header | `src/components/main/site-header.tsx`, update layout, delete old |
| 4 | Root metadata + Umami script | `src/app/layout.tsx`, update per-page metadata |
| 5 | JSON-LD structured data | Root layout, homepage, pro page |
| 6 | Sitemap + robots | `src/app/sitemap.ts`, `src/app/robots.ts` |
| 7 | Dynamic OG image | `src/app/opengraph-image.tsx` |
| 8 | Umami event tracking on existing components | Login page OAuth buttons, pro page CTA |
| 9 | Tests + final verification | `src/components/main/site-header.test.tsx` |
