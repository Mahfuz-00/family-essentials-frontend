# Family Essentials — dashboard

React 19 + Vite + Tailwind v4, serving **two audiences from one app**: the
household workspace and the platform admin's landlord console.

## Requirements

- Node 20+
- The API running (see `../Backend/README.md`)

## Setup

```bash
npm install
cp .env.example .env    # optional
npm run dev             # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on 5173 |
| `npm run build` | Typecheck + production build |
| `npx vitest run` | The test suite (16 files) |
| `npx vitest` | Watch mode |
| `npm run lint` | ESLint |

The API base URL is `VITE_API_URL`, defaulting to `http://localhost:8000/api`.

## Two audiences, one route tree

| Area | Routes | Who |
|---|---|---|
| Household | `/`, `/requests`, `/requests/escalation`, `/places`, `/places/console`, `/members`, `/members/roles`, `/members/invitations`, `/billing`, `/settings`, `/feedback` | Any member |
| Landlord console | `/admin`, `/admin/tenants`, `/admin/health`, `/admin/backups`, `/admin/feedback`, `/admin/audit-logs` | Platform admins only |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/verify-phone`, `/admin/login` | Anyone |

Guards live in `src/lib/guards.ts` and run in each route's `beforeLoad`:
`requireAuth`, `requireTenant`, `requirePlatformAdmin`. A platform admin has no
household, so the shell hides the household switcher, the seat meter and the
add-request action for them, and signing in through `/login` lands them on
`/admin`.

## Structure

```
src/
├── components/     AppLayout (the shell) + Icon
│   └── ui/         the kit: alert, avatar, badge, button, card, empty-state,
│                   input, label, modal, page-header, select, skeleton, table
├── hooks/          useQuota — server-enforced plan limits, with a catalogue fallback
├── lib/            api (one axios instance + apiError), guards, plans, session
├── pages/          one file per route; admin/ holds the landlord console
├── stores/         zustand: auth, tenant (the household + memberships), ui
├── index.css       the Warm Sage @theme — the design tokens
└── router.tsx      the route tree
```

**Conventions worth keeping**

- Server state is TanStack Query; keys are grouped `['tenant', …]` and
  `['platform', …]` so `invalidateQueries({ queryKey: ['tenant'] })` refreshes a
  household's data after a write.
- Client state is Zustand, and only for what the server does not own.
- Pages compose the UI kit. A hard-coded hex, radius or shadow is a bug — add a
  token to `src/index.css` instead (see `Docs/design-system.md`).
- `apiError()` turns any failure into one sentence; use it rather than reading
  `error.response` at the call site.

## Plan limits

`src/lib/plans.ts` carries labels, prices and feature bullets — presentation only,
because no backend owns them. **Caps and usage come from the API** through
`useQuota()` (`GET /v1/tenant/quotas`), so the seat number on the members page is
the number the API enforces. If that request has not landed, `capFor()` falls back
to the catalogue so a meter never renders blank mid-load.

## Testing

Layered by scope — see [TESTING.md](./TESTING.md):

| Layer | Location | Proves |
|---|---|---|
| Unit | `tests/unit` | Pure functions: the plan catalogue, formatting |
| Component | `tests/component` | A component in isolation |
| Integration | `tests/integration` | A page wires its query to its UI, through the real router |

The harness is in `tests/support/`: fixtures, a route installer, a render helper,
and store/session resets.

Two traps it already works around: `setup.ts` must import stores *before* the
axios mock applies, or the real axios gets cached; and jsdom needs `window.scrollTo`
stubbed.

## Documentation

`Docs/` at the monorepo root holds the PRD, architecture, design system, API
reference and operations guide. They are not part of this repository yet; this
README and `TESTING.md` are.
