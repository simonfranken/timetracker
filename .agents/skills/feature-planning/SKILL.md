# Feature Planning Skill

This skill provides a structured workflow for implementing new features in the TimeTracker project. Use this skill when the user requests a new feature or significant functionality change.

## Workflow Overview

```
1. Requirements Discovery (iterative)
   └── Clarify edge cases, acceptance criteria, constraints

2. Feature Plan Creation
   └── docs/features/{feature-name}.md

3. Implementation
   └── Use plan as single source of truth
```

## Phase 1: Requirements Discovery

**Goal:** Understand exactly what needs to be built before writing any code.

### Questions to Ask

Ask targeted questions to clarify:

#### Core Functionality
- What is the primary purpose of this feature?
- What user problem does it solve?
- How should users interact with this feature?

#### Data & API
- What new data needs to be stored?
- What existing data structures are affected?
- What API endpoints are needed (if any)?

#### User Interface
- Where in the UI should this feature appear?
- What views or components are needed?
- What user interactions are required?

#### Edge Cases
- What happens when inputs are invalid?
- How should errors be handled?
- What are the boundary conditions?
- Are there any race conditions to consider?

#### Constraints
- Are there performance requirements?
- Any security considerations?
- Browser/device compatibility?
- Integration with existing features?

### Iteration Process

1. **Initial Questions** — Ask 3-5 focused questions based on the feature description
2. **Wait for Answers** — Let the programmer respond
3. **Follow-up Questions** — Dig deeper based on responses
4. **Confirm Understanding** — Summarize your understanding and ask for confirmation
5. **Iterate** — Repeat until requirements are clear

### Example Question Flow

```
User: "Add the ability to export time entries to CSV"

Agent: "Before I start planning, I have a few questions:

1. Should the export include all entries or only filtered entries (if filters are active)?
2. What columns should be included in the CSV? (date, duration, project, client, description?)
3. Should the CSV include break minutes and net duration, or just total time?
4. Is there a date range limit, or can users export all historical data?
5. Should the export be triggered from the Time Entries page, or from a separate Export page?"
```

## Phase 2: Feature Plan

**Goal:** Create a comprehensive plan document before implementation.

### Plan Location

Create the plan at: `docs/features/{feature-name}.md`

Use kebab-case for the filename (e.g., `csv-export.md`, `dark-mode.md`).

### Plan Template

```markdown
# Feature: {Feature Name}

## Overview

Brief description of what this feature does and why it's needed.

## Requirements

### Functional Requirements
- Requirement 1
- Requirement 2
- Requirement 3

### Non-Functional Requirements
- Performance: ...
- Security: ...
- Usability: ...

### Constraints
- Constraint 1
- Constraint 2

## Technical Approach

### Architecture Decisions
- Decision 1 and rationale
- Decision 2 and rationale

### Database Changes
- New tables/columns
- Migrations needed
- Data migration strategy (if any)

### API Changes
- New endpoints
- Modified endpoints
- Request/response formats

### Frontend Changes
- New components
- Modified components
- State management approach

## Implementation Steps

1. **Step 1: Backend - Database**
   - Create migration
   - Update Prisma schema
   - Regenerate client

2. **Step 2: Backend - Service**
   - Add service methods
   - Add validation schemas

3. **Step 3: Backend - Routes**
   - Create route handlers
   - Add middleware

4. **Step 4: Frontend - API Client**
   - Add API functions

5. **Step 5: Frontend - Components**
   - Create/update components
   - Add to routes if needed

6. **Step 6: Testing**
   - Manual testing steps
   - Edge case verification

## File Changes

### New Files
- `backend/src/services/export.service.ts`
- `frontend/src/hooks/useExport.ts`

### Modified Files
- `backend/src/routes/timeEntry.routes.ts` — Add export endpoint
- `frontend/src/pages/TimeEntriesPage.tsx` — Add export button
- `frontend/src/api/timeEntries.ts` — Add export function

### Database
- No changes required (or specify migration)

## Edge Cases

| Case | Handling |
|------|----------|
| No entries match filter | Show empty state, export empty CSV with headers |
| Very large export (>10k entries) | Stream response, show progress indicator |
| User cancels export mid-stream | Gracefully close connection |
| Invalid date range | Return 400 error with clear message |

## Testing Strategy

### Manual Testing
1. Navigate to Time Entries page
2. Apply date filter
3. Click Export button
4. Verify CSV downloads with correct data
5. Open CSV and verify format

### Edge Case Testing
1. Export with no entries
2. Export with 1000+ entries
3. Export with special characters in descriptions
4. Export while timer is running

## Open Questions

- [ ] Question 1 (to be resolved during implementation)
- [ ] Question 2
```

### Plan Review

After creating the plan:

1. Present the plan to the programmer
2. Ask for feedback and approval
3. Make requested changes
4. Get final approval before proceeding to implementation

## Phase 3: Implementation

**Goal:** Implement the feature exactly as planned.

### Rules

1. **Read the plan first** — Start by reading the full plan file
2. **Follow the plan** — Implement step by step as outlined
3. **Update if needed** — If implementation differs from plan, update the plan file
4. **Document changes** — After completion, update relevant documentation

### Implementation Checklist

- [ ] Read `docs/features/{feature-name}.md`
- [ ] Implement database changes (if any)
- [ ] Implement backend service logic
- [ ] Implement backend routes
- [ ] Implement frontend API client
- [ ] Implement frontend components
- [ ] Run linting: `npm run lint`
- [ ] Manual testing
- [ ] Update plan if implementation differs
- [ ] Update `project.md` if requirements changed
- [ ] Update `README.md` if API changed
- [ ] Update `AGENTS.md` if patterns changed

## Quick Reference

### Commands
- Frontend lint: `npm run lint` (in `frontend/`)
- Backend build: `npm run build` (in `backend/`)
- DB migration: `npm run db:migrate` (in `backend/`)
- DB generate: `npm run db:generate` (in `backend/`)

### File Locations
- Backend routes: `backend/src/routes/`
- Backend services: `backend/src/services/`
- Backend schemas: `backend/src/schemas/`
- Frontend pages: `frontend/src/pages/`
- Frontend hooks: `frontend/src/hooks/`
- Frontend API: `frontend/src/api/`
- Feature plans: `docs/features/`
