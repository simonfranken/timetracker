# AGENTS.md — Codebase Guide for AI Coding Agents

This document describes the structure, conventions, and commands for the `vibe_coding_timetracker` monorepo. Read it in full before making changes.

## Repository Structure

```text
/
├── frontend/          # React SPA (Vite + TypeScript + Tailwind)
│   └── src/
│       ├── api/       # Axios API client modules
│       ├── components/# Shared UI components (PascalCase .tsx)
│       ├── contexts/  # React Context providers
│       ├── hooks/     # TanStack React Query hooks (useXxx.ts)
│       ├── pages/     # Route-level page components
│       ├── types/     # TypeScript interfaces (index.ts)
│       └── utils/     # Pure utility functions
├── backend/           # Express REST API (TypeScript + Prisma + PostgreSQL)
│   └── src/
│       ├── auth/      # OIDC + JWT logic
│       ├── errors/    # AppError subclasses
│       ├── middleware/# Express middlewares
│       ├── prisma/    # Prisma client singleton
│       ├── routes/    # Express routers (xxx.routes.ts)
│       ├── schemas/   # Zod validation schemas
│       └── services/  # Business logic classes (xxx.service.ts)
├── ios/               # Native iOS app (Swift/Xcode)
├── timetracker-chart/ # Helm chart for Kubernetes deployment
└── docker-compose.yml
```

## Build, Lint, and Dev Commands

### Frontend (`frontend/`)
- **Dev Server:** `npm run dev` (port 5173)
- **Build:** `npm run build` (tsc & vite build)
- **Lint:** `npm run lint` (ESLint, zero warnings allowed)
- **Preview:** `npm run preview`

### Backend (`backend/`)
- **Dev Server:** `npm run dev` (tsx watch)
- **Build:** `npm run build` (tsc to dist/)
- **Start:** `npm run start` (node dist/index.js)
- **Database:**
  - `npm run db:migrate` (Run migrations)
  - `npm run db:generate` (Regenerate client)
  - `npm run db:seed` (Seed database)

### Full Stack (Root)
- **Run all:** `docker-compose up`

### Testing
**No test framework is currently configured.** No test runner (`jest`, `vitest`) is installed and no `.spec.ts` or `.test.ts` files exist.
- When adding tests, set up **Vitest** (aligned with Vite).
- Add a `test` script to `package.json`.
- **To run a single test file with Vitest once installed:**
  ```bash
  npx vitest run src/path/to/file.test.ts
  ```

## Code Style Guidelines

### Imports & Exports
- Use `@/` for all internal frontend imports: `import { useAuth } from "@/contexts/AuthContext"`
- Use `import type { ... }` for type-only imports. Order external libraries first.
- Named exports are standard. Avoid default exports (except in `App.tsx`).

### Formatting
- 2-space indentation. No Prettier config exists; maintain consistency with surrounding code.
- Prefer double quotes. Trailing commas in multi-line objects/arrays.

### Types & Naming Conventions
- Define shared types as `interface` in `types/index.ts`.
- Suffix input types: `CreateClientInput`.
- Use `?` for optional fields, `string | null` for nullable fields (not `undefined`).
- **Components:** `PascalCase.tsx` (`DashboardPage.tsx`)
- **Hooks/Utils/API:** `camelCase.ts` (`useTimeEntries.ts`, `dateUtils.ts`)
- **Backend Routes/Services:** `camelCase.routes.ts`, `camelCase.service.ts`
- **Backend Schemas:** Zod schemas in `backend/src/schemas/index.ts` (e.g., `CreateClientSchema`).

### React Components
- Use named function declarations: `export function DashboardPage() { ... }`
- Context hooks throw an error if called outside their provider.

### State Management
- **Server state:** TanStack React Query. Never use `useState` for server data.
  - Use `mutateAsync` so callers can await and handle errors.
  - Invalidate related queries after mutations: `queryClient.invalidateQueries`.
- **Shared client state:** React Context.
- **Local UI state:** `useState`.
- **NO Redux or Zustand.**

### Error Handling
- **Frontend:**
  ```typescript
  try {
    await someAsyncOperation()
  } catch (err) {
    setError(err instanceof Error ? err.message : "An error occurred")
  }
  ```
  Store errors in local state and render inline as red text. No global error boundary exists.
- **Backend:** Throw `AppError` subclasses from services.
  ```typescript
  router.get("/:id", async (req, res, next) => {
    try {
      res.json(await service.getById(req.params.id))
    } catch (error) {
      next(error) // Always forward to errorHandler middleware
    }
  })
  ```

### Styling
- **Tailwind CSS v3** only. No CSS modules or styled-components.
- Use `clsx` + `tailwind-merge` for class merging. Icons from `lucide-react` only.

### Backend Validation & Database
- Validate all incoming request data with Zod schemas in middleware.
- Prisma v6 with PostgreSQL. Use the Prisma client singleton from `backend/src/prisma/`.
- DB columns are `snake_case`, mapped to `camelCase` TypeScript via `@map`.

## Key Architectural Decisions
- Frontend communicates with Backend exclusively via typed Axios modules in `frontend/src/api/`.
- iOS app shares no code with the web frontend.
- Backend routes only handle HTTP concerns (parsing, validation, formatting); business logic belongs purely in services.
