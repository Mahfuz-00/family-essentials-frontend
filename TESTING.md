# Testing

## Layers

Tests are split by **scope**, in three directories.

| Directory | Scope | Belongs here |
|---|---|---|
| `tests/unit` | Pure functions, no DOM, no network | `cn()` class merging, the plan catalogue, `apiError()` mapping. Fast, no rendering. |
| `tests/component` | One component in isolation | The UI kit: Button variants and sizes, Chip tones, Modal focus trap / Escape / backdrop. Renders, but never touches the API. |
| `tests/integration` | Whole screens through the real router | Route guards, sign-in, the kanban board, the audit log. Renders the real app with the API mocked at the module boundary. |

```
npm test                    # everything
npm run test:unit
npm run test:component
npm run test:integration
npm run test:watch
npm run typecheck           # type-checks src *and* tests
```

Vitest, React Testing Library and jsdom. Note `jsdom` is pinned to 26:
`jsdom@27` pulls an ESM-only dependency that breaks under Vitest's fork pool.

## How the integration tests work

`tests/support/render.tsx` builds a router over the **real** `routeTree` with a
memory history, so the actual route guards run:

```tsx
const { router } = renderApp('/requests');
```

The API is replaced at the module boundary, so no request leaves the process:

```tsx
const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));

vi.mock('@/lib/api', () => ({
  api: apiMock,
  apiError: (error) => (error instanceof Error ? error.message : 'Something went wrong.'),
}));
```

`installGetRoutes(apiMock, routes)` stubs GET calls by URL prefix and **rejects
loudly** on anything unstubbed, so a forgotten endpoint fails with its URL rather
than a confusing empty render.

Two rules that cost real debugging time:

1. **Never import stores or `@/lib/api` from `tests/setup.ts`.** The setup file
   loads before a test file's `vi.mock` applies, so the store would keep the live
   axios instance and hit the network. Reset state with `tests/support/session.ts`
   from inside the test file instead.
2. **Data-dependent assertions must be awaited.** A page renders its header
   before react-query resolves, so use `await screen.findBy…` for anything that
   comes from the API, and `getBy…` only for what is already on screen.

## Manual QA

`Backend/TESTING.md` lists the seeded accounts. Start the API
(`php artisan serve` in `Backend/`) and this app (`npm run dev`), then sign in at
`http://localhost:5173/login` — the dashboard talks to the `/api/v1` surface.
