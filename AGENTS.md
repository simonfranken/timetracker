# AGENTS.md — Codebase Guide for AI Coding Agents

This document describes the structure, conventions, and commands for the `vibe_coding_timetracker` monorepo. **Read it in full before making changes.**

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
│       ├── config/    # Configuration constants
│       ├── errors/    # AppError subclasses
│       ├── middleware/# Express middlewares
│       ├── prisma/    # Prisma client singleton
│       ├── routes/    # Express routers (xxx.routes.ts)
│       ├── schemas/   # Zod validation schemas
│       ├── services/  # Business logic classes (xxx.service.ts)
│       ├── types/     # TypeScript interfaces
│       └── utils/     # Utility functions
├── ios/               # Native iOS app (Swift/Xcode)
├── helm/              # Helm chart for Kubernetes deployment
└── docker-compose.yml
```

## AI Agent Workflow

### Before Making Changes
1. Read this file completely
2. Read `project.md` for feature requirements
3. Read `README.md` for setup instructions
4. Understand the specific task or feature request

### During Development
1. Follow all code conventions in this document
2. Write clean, maintainable code
3. Add inline comments only when necessary for clarity
4. Run linting before completing: `npm run lint`

### After Making Changes
**Always update documentation.** See [Documentation Maintenance](#documentation-maintenance).

## Feature Development Workflow

**For new features, AI agents use GitHub Issues as the single source of truth.**

### Workflow Overview

```
1. Feature Request → Agent asks: "Create GitHub issue?"
2. User confirms → Agent creates GitHub issue
3. Discussion in Issue Comments (Requirements Discovery)
4. Agent writes Plan in Issue Body
5. User approves via comment (approved/lgtm/go ahead)
6. Agent AUTOMATICALLY creates branch, implements, and creates PR
```

### Phase 1: Requirements Discovery
1. Ask user: "Should I create a GitHub issue to plan this feature?"
2. Wait for confirmation
3. Create issue with `planning` label
4. Ask clarifying questions via issue comments
5. Iterate until requirements are clear

### Phase 2: Feature Plan
1. Write detailed plan in issue body using template
2. Include: overview, requirements, technical approach, file changes, edge cases
3. Ask for review via comment
4. Iterate until approved

### Phase 3: Approval
- User comments: `approved`, `lgtm`, `go ahead`, or `👍`
- Agent proceeds to implementation

### Phase 4: Implementation (Automatic)
1. Create feature branch: `feature/{issue-number}-{name}`
2. Implement feature following the plan in issue body
3. Create PR with link to issue
4. Post PR link as issue comment

**See the `feature-planning` skill for detailed workflow.**

## Documentation Maintenance

**Every code change requires a documentation review.** When you modify the codebase, check whether documentation needs updating.

### Documentation Files and Their Purposes

| File | Purpose | Update When |
|------|---------|-------------|
| `AGENTS.md` | Code conventions, commands, architecture patterns | Changing conventions, adding new patterns, modifying architecture |
| `README.md` | Setup instructions, API reference, features list | Adding endpoints, changing environment variables, adding features |
| `project.md` | Requirements, data model, functional specifications | Modifying business logic, adding entities, changing validation rules |

### Update Rules

#### Update `AGENTS.md` When:
- Adding a new coding pattern or convention
- Changing the project structure (new directories, reorganization)
- Adding or modifying build/lint/test commands
- Introducing a new architectural pattern
- Changing state management or error handling approaches

#### Update `README.md` When:
- Adding, removing, or modifying API endpoints
- Changing environment variables or configuration
- Adding new features visible to users
- Modifying setup or installation steps
- Changing the technology stack

#### Update `project.md` When:
- Adding or modifying business requirements
- Changing the data model or relationships
- Adding new validation rules
- Modifying functional specifications
- Updating security or non-functional requirements

### Documentation Format Rules
- Use Markdown formatting
- Keep entries concise and actionable
- Match the existing tone and style
- Use code blocks for commands and code examples
- Maintain alphabetical or logical ordering in lists

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
