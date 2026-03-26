# Timetracker

## Overview

A multi-user web application for tracking time spent working on projects. Users authenticate via an external OIDC provider and manage their own clients, projects, and time entries.

---

## Technical Requirements

### Authentication

- **OIDC Provider**: Configurable via:
  - Well-known endpoint (e.g., `https://provider.com/.well-known/openid-configuration`)
  - Client ID
  - PKCE flow (public client, no client secret required)
- **User Information**: Username and email are sourced from the OIDC provider claims
- **No local user management**: The application does not store user credentials or manage passwords

### Data Persistence

- **Database**: Relational database (e.g., PostgreSQL, MySQL)
- **Time Format**: DateTime with timezone offset (e.g., `2024-01-15T09:00:00+01:00`)
- **Display**: Times are converted to the user's local timezone for display

### Validation Rules

- End time must be after start time
- No overlapping time entries for the same user

---

## Data Model

### Entities

| Entity           | Description                                   | Ownership                                          |
| ---------------- | --------------------------------------------- | -------------------------------------------------- |
| **Client**       | A client/customer the user works for          | User                                               |
| **Project**      | A project belonging to a client               | User, belongs to one Client                        |
| **TimeEntry**    | A completed time tracking record              | User (explicit), belongs to one Project            |
| **OngoingTimer** | An active timer while tracking is in progress | User (explicit), belongs to one Project (optional) |
| **ClientTarget** | Hourly target for a client per period         | User, belongs to one Client                        |
| **BalanceCorrection** | Manual hour adjustment for a target       | Belongs to one ClientTarget                        |
| **ApiKey**       | API key for external tool access              | User                                               |

### Relationships

```
User
  ├── Client (one-to-many)
  │     ├── Project (one-to-many)
  │     │     └── TimeEntry (one-to-many, explicit user reference)
  │     └── ClientTarget (one-to-one per client)
  │           └── BalanceCorrection (one-to-many)
  │
  ├── OngoingTimer (zero-or-one, explicit user reference)
  └── ApiKey (one-to-many)
```

**Important**: Both `TimeEntry` and `OngoingTimer` have explicit references to the user who created them. This is distinct from the project's ownership and is required for future extensibility (see Future Extensibility section).

---

## Functional Requirements

### 1. Multi-User Support

- The application supports multiple concurrent users
- Each user sees and manages only their own data (clients, projects, entries)
- Users authenticate via an external OIDC provider

---

### 2. Client & Project Management

- Users can create, edit, and delete **Clients**
- Users can create, edit, and delete **Projects**
- Each project must be associated with exactly one client
- There is no admin user — all users manage their own data

---

### 3. Start / Stop Time Tracking

#### Starting a Timer

- User clicks a **Start** button in the web interface
- An `OngoingTimer` entity is immediately saved to the database with:
  - Start time (current timestamp)
  - User reference (explicit, required)
  - Project reference (initially `null`, can be added later)
- The UI displays a **live timer** showing elapsed time since start

#### While Timer is Running

- The timer remains active even if the user closes the browser
- User can **add/select a project** at any time while the timer is running

#### Stopping the Timer

- User clicks a **Stop** button
- **Two scenarios**:

  | Scenario                 | Behavior                                                           |
  | ------------------------ | ------------------------------------------------------------------ |
  | Project already selected | `OngoingTimer` is converted to a `TimeEntry` and saved immediately |
  | No project selected      | UI prompts user to select a project before saving the entry        |

- The final `TimeEntry` contains:
  - Start time
  - End time
  - Project reference
  - User reference (explicit, required)

---

### 4. Edit Time Tracking Entry

- User can view tracked entries in a **list view** or **calendar view**
- User can **select an entry** and edit:
  - Start time
  - End time
  - Project (change to a different project)
- User can **delete** an entry

---

### 5. Adding Entries Manually

- User can add a time entry manually using a form
- Required fields:
  - Start time
  - End time
  - Project
- Optional fields:
  - Break minutes (deducted from total duration)
  - Description (notes about the work)
- The entry is validated against overlap rules before saving

---

### 6. Statistics

- User can view aggregated time tracking statistics
- Filters available:
  - Date range (start/end)
  - Client
  - Project
- Statistics display:
  - Total working time
  - Entry count
  - Breakdown by project (with color indicators)
  - Breakdown by client

---

### 7. Client Targets

- User can set hourly targets per client
- Target configuration:
  - Target hours per period
  - Period type (weekly or monthly)
  - Working days (e.g., MON-FRI)
  - Start date
- Balance tracking:
  - Shows current balance vs target
  - Supports manual corrections (e.g., holidays, overtime carry-over)
- Only one target per client allowed

---

### 8. API Keys

- User can generate API keys for external tool access
- API key properties:
  - Name (for identification)
  - Prefix (first characters shown for identification)
  - Last used timestamp
- Security:
  - Raw key shown only once at creation
  - Key is hashed (SHA-256) before storage
  - Keys can be revoked (deleted)

---

### 9. MCP Integration

- Model Context Protocol endpoint for AI agent access
- Stateless operation (no session persistence)
- Tools exposed:
  - Client CRUD operations
  - Project CRUD operations
  - Time entry CRUD operations
  - Timer start/stop/cancel
  - Client target management
  - Statistics queries
- Authentication via API keys

---

## API Endpoints (Suggested)

### Authentication

- `GET /auth/login` — Initiate OIDC login flow
- `GET /auth/callback` — OIDC callback handler
- `POST /auth/logout` — End session

### Clients

- `GET /api/clients` — List user's clients
- `POST /api/clients` — Create client
- `PUT /api/clients/{id}` — Update client
- `DELETE /api/clients/{id}` — Delete client

### Projects

- `GET /api/projects` — List user's projects (optionally filter by client)
- `POST /api/projects` — Create project
- `PUT /api/projects/{id}` — Update project
- `DELETE /api/projects/{id}` — Delete project

### Time Entries

- `GET /api/time-entries` — List user's entries (with pagination, date range filter)
- `POST /api/time-entries` — Create entry manually
- `PUT /api/time-entries/{id}` — Update entry
- `DELETE /api/time-entries/{id}` — Delete entry

### Timer

- `POST /api/timer/start` — Start timer (creates OngoingTimer)
- `PUT /api/timer` — Update ongoing timer (e.g., set project)
- `POST /api/timer/stop` — Stop timer (converts to TimeEntry)
- `POST /api/timer/cancel` — Cancel timer without saving
- `GET /api/timer` — Get current ongoing timer (if any)

### Client Targets

- `GET /api/client-targets` — List targets with computed balance
- `POST /api/client-targets` — Create a target
- `PUT /api/client-targets/{id}` — Update a target
- `DELETE /api/client-targets/{id}` — Delete a target
- `POST /api/client-targets/{id}/corrections` — Add a correction
- `DELETE /api/client-targets/{id}/corrections/{correctionId}` — Delete a correction

### API Keys

- `GET /api/api-keys` — List user's API keys
- `POST /api/api-keys` — Create a new API key
- `DELETE /api/api-keys/{id}` — Revoke an API key

### MCP (Model Context Protocol)

- `GET /mcp` — SSE stream for server-initiated messages
- `POST /mcp` — JSON-RPC requests (tool invocations)

---

## UI Requirements

### Timer Widget

- Always visible when user is logged in
- Shows "Start" button when no timer is running
- Shows live elapsed time (HH:MM:SS) and "Stop" button when running
- Allows project selection while running

### Views

- **Dashboard**: Overview with active timer widget and recent entries
- **Time Entries**: List/calendar view of all entries with filters (date range, client, project)
- **Clients & Projects**: Management interface for clients and projects
- **Statistics**: Aggregated time data with filters and breakdowns
- **API Keys**: Create and manage API keys for external access
- **Client Targets**: Set and monitor hourly targets per client

---

## Future Extensibility

The following features are planned for future development. Consider these when designing the architecture:

### Shared Projects

- Users will be able to track time for **projects belonging to other users**
- **Rationale**: `TimeEntry` already has an explicit user reference independent of the project's owner
- **Example**: User A can log time on User B's project, but the entry is clearly associated with User A
- **Requirements**:
  - Authorization checks must verify that a user has access to a project before allowing time tracking
  - UI should distinguish between "My Projects" and "Shared With Me" projects
  - Reporting/filtering by project owner vs. entry owner

---

## Security Considerations

- All API endpoints require authentication (except auth routes)
- Users can only access/modify their own data
- OIDC PKCE flow for secure authentication without client secret
- Input validation on all endpoints
- Database-level constraints to enforce:
  - End time > Start time
  - No overlapping entries per user

---

## Non-Functional Requirements

- Responsive web interface (works on desktop and mobile browsers)
- Timer updates in real-time (e.g., every second)
- Graceful handling of timer across browser sessions
