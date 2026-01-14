# WCPOS Website Guidelines

Next.js 16 application for `wcpos.com` - marketing site, admin dashboard, and API routes.

## Key Files

- `src/app/` - Next.js App Router pages
- `src/services/core/external/` - Third-party API clients (GitHub, Medusa, Keygen)
- `src/components/ui/` - shadcn/ui components
- `drizzle.config.ts` - Database configuration

## Before Making Changes

1. **Run tests**: `pnpm build && pnpm lint && pnpm test:unit`
2. **Check PPR output**: `pnpm build` shows static vs dynamic routes
3. **Write tests** for new features (see below)

## Testing Requirements

| Change Type | Required Tests |
|-------------|----------------|
| New API route | Unit test + e2e test |
| New page | E2e test |
| External API integration | Unit test with mocks |
| Bug fix | Regression test |

## PPR (Partial Pre-Rendering)

```tsx
// Dynamic content must be in Suspense
<Suspense fallback={<Skeleton />}>
  <DynamicComponent />
</Suspense>

// Call connection() before Date.now()
await connection();
const now = Date.now();
```

## Don't

- Don't skip tests before committing
- Don't use `Date.now()` without `connection()` first
- Don't add external API calls outside of `src/services/core/external/`

## Related

- `wcpos-infra` - Backend services this connects to
- `monorepo-v2` - The app that calls these APIs
