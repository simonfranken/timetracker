---
name: feature-planning
description: Structured workflow for planning and implementing features via GitHub Issues
---

# Feature Planning Skill

This skill provides a structured workflow for implementing new features in the TimeTracker project using GitHub Issues as the source of truth.

## Workflow Overview

```
1. Requirements Discovery (in GitHub Issue)
   - Agent creates issue → Clarify via comments → Iterate until clear

2. Feature Plan (in GitHub Issue body)
   - Agent writes detailed plan in issue body
   - Present for review via comment

3. Approval (via GitHub Issue comment)
   - User approves with keyword: "approved", "lgtm", "go ahead", "let's do it"

4. Implementation (automatic after approval)
   - Create feature branch
   - Implement feature
   - Create PR, link to issue
```

## Repository Context

- **Owner:** simonfranken
- **Repo:** timetracker
- **Labels:** `feature`, `enhancement`, `planning`, `approved`, `in-progress`, `has-pr`

## Phase 1: Requirements Discovery

**Goal:** Understand exactly what needs to be built before writing any code.

### Trigger

When user requests a new feature or significant functionality change, the agent should:
1. Acknowledge the request
2. Ask: "Should I create a GitHub issue to plan this feature?"
3. Wait for confirmation before proceeding

### Questions to Ask (via Issue Comments)

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

### Process

1. **Initial Questions** — Ask 3-5 focused questions based on the feature description
2. **Wait for Answers** — Check for responses in issue comments
3. **Follow-up Questions** — Dig deeper based on responses
4. **Confirm Understanding** — Summarize understanding and ask for confirmation
5. **Iterate** — Repeat until requirements are clear

### Example Question Flow

```
User: "Add the ability to export time entries to CSV"

Agent: "Should I create a GitHub issue to plan this feature?"

[User confirms]

Agent creates issue and asks via comment:
"Before I plan this, I have a few questions:

1. Should the export include all entries or only filtered entries (if filters are active)?
2. What columns should be included in the CSV? (date, duration, project, client, description?)
3. Should the CSV include break minutes and net duration, or just total time?
4. Is there a date range limit, or can users export all historical data?
5. Should the export be triggered from the Time Entries page, or from a separate Export page?"
```

## Phase 2: Feature Plan

**Goal:** Create a comprehensive plan document in the GitHub issue body.

### Plan Template

Use this structure for the issue body:

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

1. Post a comment asking for review: "Feature plan ready. Please review and approve."
2. Wait for approval comment with keyword
3. Make requested changes if any
4. Get final approval before proceeding

### Approval Keywords

The following comments trigger automatic implementation:
- `approved`
- `lgtm`
- `go ahead`
- `let's do it`
- `👍`

## Phase 3: Implementation (Automatic After Approval)

**Goal:** Implement the feature exactly as planned.

### Automatic Actions on Approval

1. **Create Feature Branch**
   - Branch name: `feature/{issue-number}-{kebab-name}`
   - Example: `feature/42-csv-export`

2. **Implement Feature**
   - Read the approved plan from issue body
   - Follow implementation steps exactly
   - Update issue if implementation differs from plan

3. **Create Pull Request**
   - Title: `[Feature] {Feature Name}`
   - Body: Include issue reference, summary of changes
   - Add PR link to issue (comment or label)

4. **Update Issue**
   - Add `has-pr` label
   - Comment with PR link

### Implementation Checklist

- [ ] Create branch from issue approval
- [ ] Implement database changes (if any)
- [ ] Implement backend service logic
- [ ] Implement backend routes
- [ ] Implement frontend API client
- [ ] Implement frontend components
- [ ] Run linting: `npm run lint`
- [ ] Manual testing
- [ ] Create PR and link to issue
- [ ] Update issue labels

### PR Merge

When PR is merged:
- Issue auto-closes (if PR body contains "Closes #X")
- Remove from any project board

## Quick Reference

### GitHub Tools Available

- `github_issue_write` (method: "create") — Create new issue for feature planning
- `github_issue_write` (method: "update") — Update issue body/labels
- `github_add_issue_comment` — Add comments for Q&A
- `github_create_branch` - Create feature branch
- `github_create_pull_request` - Create PR linking to issue

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

### Labels

| Label | Purpose |
|-------|---------|
| `feature` | New feature request |
| `enhancement` | Improvement to existing feature |
| `planning` | Issue being planned |
| `approved` | Plan approved, ready for implementation |
| `in-progress` | Currently being implemented |
| `has-pr` | PR created, linked to issue |