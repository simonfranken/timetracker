# AGENTS.md — Codebase Guide for AI Coding Agents

This document describes the structure, conventions, and commands for the `vibe_coding_timetracker` monorepo. Read it in full before making changes.

---

## Repository Structure

This is a monorepo with three sub-projects:

```
/
├── frontend/          # React SPA (Vite + TypeScript + Tailwind)
├── backend/           # Express REST API (TypeScript + Prisma + PostgreSQL)
├── ios/               # Native iOS app (Swift/Xcode)
├── timetracker-chart/ # Helm chart for Kubernetes deployment
├── docker-compose.yml
└── project.md         # Product requirements document
```

### Frontend layout (`frontend/src/`)
```
api/         # Axios API client modules (one file per resource)
components/  # Shared UI components (PascalCase .tsx)
contexts/    # React Context providers: AuthContext, TimerContext
hooks/       # TanStack React Query custom hooks (useXxx.ts)
pages/       # Route-level page components (XxxPage.tsx)
types/       # All TypeScript interfaces (index.ts)
utils/       # Pure utility functions (dateUtils.ts)
```

### Backend layout (`backend/src/`)
```
auth/        # OIDC + JWT authentication logic
config/      # Environment variable configuration
errors/      # Custom AppError subclasses
middleware/  # auth, errorHandler, validation middleware
prisma/      # Prisma client singleton
routes/      # Express routers (xxx.routes.ts)
schemas/     # Zod validation schemas (index.ts)
services/    # Business logic classes (xxx.service.ts)
types/       # TypeScript interfaces + Express augmentation
utils/       # timeUtils.ts
```

---

## Build, Lint, and Dev Commands

### Frontend (`frontend/`)
```bash
npm run dev       # Start Vite dev server (port 5173)
npm run build     # Type-check (tsc) then bundle (vite build)
npm run preview   # Preview production build locally
npm run lint      # ESLint over .ts/.tsx, zero warnings allowed
```

### Backend (`backend/`)
```bash
npm run dev          # Hot-reload dev server via tsx watch
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled output (node dist/index.js)
npm run db:migrate   # Run Prisma migrations
npm run db:generate  # Regenerate Prisma client
npm run db:seed      # Seed the database
```

### Full stack (repo root)
```bash
docker-compose up    # Start all services (frontend, backend, postgres)
```

### Testing
**There is no test framework configured.** No test runner (`jest`, `vitest`, etc.) is installed and no `.spec.ts` / `.test.ts` files exist. When adding tests, set up Vitest (already aligned with Vite) and add a `test` script to `package.json`. To run a single test file with Vitest once installed:
```bash
npx vitest run src/path/to/file.test.ts
```

---

## TypeScript Configuration

### Frontend (`frontend/tsconfig.json`)
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- `noEmit: true` — Vite handles all output
- Path alias `@/*` → `src/*` (use `@/` for all internal imports)
- `target: ES2020`, `module: ESNext`, `moduleResolution: bundler`
- `isolatedModules: true`, `resolveJsonModule: true`

### Backend (`backend/tsconfig.json`)
- `strict: true`, `esModuleInterop: true`
- `target: ES2022`, `module: Node16`, `moduleResolution: Node16`
- `outDir: ./dist`, `rootDir: ./src`
- `declaration: true` (emits `.d.ts` files)

---

## Code Style Guidelines

### Imports
- Use the `@/` alias for all internal frontend imports: `import { useAuth } from "@/contexts/AuthContext"`
- Use `import type { ... }` for type-only imports: `import type { User } from "@/types"`
- Order: external libraries first, then internal `@/` imports
- Named exports are the standard; avoid default exports (only `App.tsx` uses one)

### Formatting
- 2-space indentation throughout
- No Prettier config exists — maintain consistency with surrounding code
- Trailing commas in multi-line objects and arrays
- Quote style is mixed across the codebase (no enforcer); prefer double quotes to match the majority of files

### Types and Interfaces
- Define all shared types as `interface` (not `type` aliases) in the relevant `types/index.ts`
- Suffix input/mutation types: `CreateClientInput`, `UpdateProjectInput`
- Use `?` for optional fields, not `field: T | undefined`
- Use `string | null` for nullable fields (not `undefined`)
- Backend Zod schemas live in `backend/src/schemas/index.ts`, named `<Entity>Schema` (e.g., `CreateClientSchema`)
- Backend custom errors extend `AppError`: `NotFoundError`, `BadRequestError`, `ConflictError`, `UnauthorizedError`

### Naming Conventions

| Category | Convention | Example |
|---|---|---|
| React components | `PascalCase.tsx` | `TimerWidget.tsx`, `Modal.tsx` |
| Page components | `PascalCasePage.tsx` | `DashboardPage.tsx`, `LoginPage.tsx` |
| Context files | `PascalCaseContext.tsx` | `AuthContext.tsx`, `TimerContext.tsx` |
| Custom hooks | `useXxx.ts` | `useTimeEntries.ts`, `useClients.ts` |
| API modules | `camelCase.ts` | `timeEntries.ts`, `clients.ts` |
| Utility files | `camelCaseUtils.ts` | `dateUtils.ts`, `timeUtils.ts` |
| Backend routes | `camelCase.routes.ts` | `timeEntry.routes.ts` |
| Backend services | `camelCase.service.ts` | `timeEntry.service.ts` |
| Types / schemas | `index.ts` (aggregated) | `src/types/index.ts` |
| Directories | `camelCase` | `api/`, `hooks/`, `routes/`, `services/` |

### React Components
- Use named function declarations, not arrow functions assigned to `const`:
  ```ts
  // correct
  export function DashboardPage() { ... }

  // avoid
  export const DashboardPage = () => { ... }
  ```
- Context hooks (`useAuth`, `useTimer`) throw an error if called outside their provider — maintain this pattern for all new contexts

### State Management
- **Server state**: TanStack React Query (all remote data). Never use `useState` for server data.
  - Custom hooks encapsulate `useQuery` + `useMutation` + cache invalidation
  - Query keys are arrays: `["timeEntries", filters]`, `["projects", clientId]`
  - Use `mutateAsync` (not `mutate`) so callers can `await` and handle errors
  - Invalidate related queries after mutations via `queryClient.invalidateQueries`
- **Shared client state**: React Context (`AuthContext`, `TimerContext`)
- **Local UI state**: `useState` per component (modals, form data, error messages)
- No Redux or Zustand — do not introduce them

### Error Handling

**Frontend:**
```ts
try {
  await someAsyncOperation()
} catch (err) {
  setError(err instanceof Error ? err.message : "An error occurred")
}
```
- Store errors in local `useState<string | null>` and render inline as red text
- No global error boundary exists; handle errors close to where they occur

**Backend:**
```ts
router.get("/resource/:id", async (req, res, next) => {
  try {
    const result = await service.getById(req.params.id)
    res.json(result)
  } catch (error) {
    next(error) // always forward to errorHandler middleware
  }
})
```
- Throw `AppError` subclasses from services; never send raw error responses from route handlers
- The global `errorHandler` middleware handles Prisma error codes (P2002, P2025, P2003) and `AppError` subclasses

### Styling
- **Tailwind CSS v3** for all styling — no CSS modules, no styled-components
- Use `clsx` + `tailwind-merge` for conditional class merging when needed
- Icons from `lucide-react` only

### Backend Validation
- All incoming request data validated with Zod schemas before reaching service layer
- Schemas defined in `backend/src/schemas/index.ts`
- Validation middleware applied per-route; never trust `req.body` without parsing through a schema

### Database
- Prisma v6 with PostgreSQL
- Database column names are `snake_case`, mapped to `camelCase` TypeScript via `@map` in the Prisma schema
- Always use the Prisma client singleton from `backend/src/prisma/`

---

## Key Architectural Decisions
- The frontend communicates with the backend exclusively through the typed Axios modules in `frontend/src/api/`
- Authentication supports two flows: OIDC (web, via `express-session`) and JWT (iOS client, via `jsonwebtoken`)
- The iOS app lives in `ios/` and shares no code with the web frontend — do not couple them
- All business logic belongs in service classes; routes only handle HTTP concerns (parsing, validation, response formatting)
