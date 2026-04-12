# TimeTracker

A multi-user web application for tracking time spent working on projects. Users authenticate via an external OIDC provider and manage their own clients, projects, and time entries.

## Features

- **OIDC Authentication** - Secure login via external OpenID Connect provider with PKCE flow
- **Client Management** - Create and manage clients/customers
- **Project Management** - Organize work into projects with color coding
- **Time Tracking** - Start/stop timer with live elapsed time display
- **Manual Entry** - Add time entries manually for past work
- **Calendar View** - Visual week timetable with overlap handling and running timer block
- **Validation** - Overlap prevention and end-time validation
- **Statistics** - View aggregated time tracking data by project and client
- **Client Targets** - Set hourly targets per client with weekly/monthly periods
- **API Keys** - Generate API keys for external tools and AI agents
- **MCP Integration** - Model Context Protocol endpoint for AI agent access
- **Responsive UI** - Works on desktop and mobile
- **Modern List Surfaces** - Reusable card/list rows for dense data views (e.g., API keys)

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React     │────▶│   Express   │────▶│  PostgreSQL │
│  Frontend   │     │   Backend   │     │   Database  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    OIDC     │
                    │  Provider   │
                    └─────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- An OIDC provider (e.g., Keycloak, Auth0, Okta)

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb timetracker
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy and configure environment
cp ../.env.example .env
# Edit .env with your database and OIDC settings

# Run migrations
npx prisma migrate dev

# Start server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Environment Variables

Create `.env` in the backend directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/timetracker"

# OIDC Configuration
OIDC_ISSUER_URL="https://your-oidc-provider.com"
OIDC_CLIENT_ID="your-client-id"
OIDC_REDIRECT_URI="http://localhost:3001/auth/callback"

# Session
SESSION_SECRET="your-secure-session-secret-min-32-chars"

# Server
PORT=3001
NODE_ENV=development
APP_URL="http://localhost:5173"
```

## API Endpoints

### Authentication

- `GET /auth/login` - Initiate OIDC login
- `GET /auth/callback` - OIDC callback
- `POST /auth/logout` - End session
- `GET /auth/me` - Get current user

### Clients

- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Projects

- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Time Entries

- `GET /api/time-entries` - List entries (with filters/pagination)
- `POST /api/time-entries` - Create entry
- `PUT /api/time-entries/:id` - Update entry
- `DELETE /api/time-entries/:id` - Delete entry

### Timer

- `GET /api/timer` - Get ongoing timer
- `POST /api/timer/start` - Start timer
- `PUT /api/timer` - Update timer (set project)
- `POST /api/timer/stop` - Stop timer (creates entry)
- `POST /api/timer/cancel` - Cancel timer without saving

### Client Targets

- `GET /api/client-targets` - List targets with balance
- `POST /api/client-targets` - Create target
- `PUT /api/client-targets/:id` - Update target
- `DELETE /api/client-targets/:id` - Delete target
- `POST /api/client-targets/:id/corrections` - Add correction
- `DELETE /api/client-targets/:id/corrections/:correctionId` - Delete correction

### API Keys

- `GET /api/api-keys` - List API keys
- `POST /api/api-keys` - Create API key
- `DELETE /api/api-keys/:id` - Revoke API key

### MCP (Model Context Protocol)

- `GET /mcp` - SSE stream for server-initiated messages
- `POST /mcp` - JSON-RPC requests (tool invocations)

## Data Model

```
User (oidc sub)
├── Client[]
│   └── Project[]
│       └── TimeEntry[]
└── OngoingTimer (optional)
```

## Technology Stack

**Backend:**

- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- OpenID Client

**Frontend:**

- React 18
- TypeScript
- TanStack Query
- React Router
- Tailwind CSS
- date-fns

## License

MIT
