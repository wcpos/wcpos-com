# Services Architecture - Security-First Design

This services folder is organized to enforce security boundaries and separate public API access from internal business logic.

## Directory Structure

```
src/services/
├── api/                          # 🔓 PUBLIC - Frontend/internal access layer
│   └── index.ts                  # Main exports for server components
│
├── core/                         # 🔒 PRIVATE - Internal services only
│   ├── external/                 # Third-party API clients
│   │   └── github-client.ts      # GitHub/Octokit wrapper (server-only)
│   │
│   └── business/                 # Business logic layer
│       └── electron-service.ts   # Electron update logic (server-only)
│
└── README.md                     # This file
```

## Security Model

### Server-Only Protection

Critical server files use the `server-only` package to prevent accidental client-side imports:

```typescript
import 'server-only'

// This file will cause a build error if imported in a client component
```

### Access Patterns

1. **Public API Routes** (`/api/*`)
   - Limited external endpoints for apps to check updates, validate licenses
   - Call services in `core/business/`

2. **Server Components** (future)
   - Dashboard pages call services directly
   - No HTTP API needed - direct function calls on server

3. **Server Actions** (future)
   - Form submissions, mutations
   - Also call services directly

## Data Flow

```
External Apps → API Routes → Business Services → External APIs (GitHub)
                    ↓
Server Components → Business Services → External APIs / Database
```

## Adding New Services

1. **External API Client**: Add to `core/external/` with `server-only`
2. **Business Logic**: Add to `core/business/` with `server-only`
3. **Public API**: Add route in `app/api/` that calls business service
4. **Internal Access**: Import directly in server components (future)

