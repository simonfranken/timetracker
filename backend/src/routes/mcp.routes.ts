import { Router, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import type { AuthenticatedRequest, AuthenticatedUser } from '../types';
import { ClientService } from '../services/client.service';
import { ProjectService } from '../services/project.service';
import { TimeEntryService } from '../services/timeEntry.service';
import { TimerService } from '../services/timer.service';
import { ClientTargetService } from '../services/clientTarget.service';

const router = Router();

// Service instances — shared, stateless
const clientService = new ClientService();
const projectService = new ProjectService();
const timeEntryService = new TimeEntryService();
const timerService = new TimerService();
const clientTargetService = new ClientTargetService();

/**
 * Build and return a fresh stateless McpServer pre-populated with all tools
 * scoped to the given authenticated user.
 */
function buildMcpServer(user: AuthenticatedUser): McpServer {
  const server = new McpServer({
    name: 'timetracker',
    version: '1.0.0',
  });

  const userId = user.id;

  // -------------------------------------------------------------------------
  // Clients
  // -------------------------------------------------------------------------

  server.registerTool(
    'list_clients',
    {
      description: 'List all clients for the authenticated user.',
      inputSchema: {},
    },
    async () => {
      const clients = await clientService.findAll(userId);
      return { content: [{ type: 'text', text: JSON.stringify(clients, null, 2) }] };
    }
  );

  server.registerTool(
    'create_client',
    {
      description: 'Create a new client.',
      inputSchema: {
        name: z.string().min(1).max(255).describe('Client name'),
        description: z.string().max(1000).optional().describe('Optional description'),
      },
    },
    async ({ name, description }) => {
      const client = await clientService.create(userId, { name, description });
      return { content: [{ type: 'text', text: JSON.stringify(client, null, 2) }] };
    }
  );

  server.registerTool(
    'update_client',
    {
      description: 'Update an existing client.',
      inputSchema: {
        id: z.string().uuid().describe('Client ID'),
        name: z.string().min(1).max(255).optional().describe('New name'),
        description: z.string().max(1000).optional().describe('New description'),
      },
    },
    async ({ id, name, description }) => {
      const client = await clientService.update(id, userId, { name, description });
      return { content: [{ type: 'text', text: JSON.stringify(client, null, 2) }] };
    }
  );

  server.registerTool(
    'delete_client',
    {
      description: 'Soft-delete a client (and its projects).',
      inputSchema: {
        id: z.string().uuid().describe('Client ID'),
      },
    },
    async ({ id }) => {
      await clientService.delete(id, userId);
      return { content: [{ type: 'text', text: `Client ${id} deleted.` }] };
    }
  );

  // -------------------------------------------------------------------------
  // Projects
  // -------------------------------------------------------------------------

  server.registerTool(
    'list_projects',
    {
      description: 'List all projects, optionally filtered by clientId.',
      inputSchema: {
        clientId: z.string().uuid().optional().describe('Filter by client ID'),
      },
    },
    async ({ clientId }) => {
      const projects = await projectService.findAll(userId, clientId);
      return { content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }] };
    }
  );

  server.registerTool(
    'create_project',
    {
      description: 'Create a new project under a client.',
      inputSchema: {
        name: z.string().min(1).max(255).describe('Project name'),
        clientId: z.string().uuid().describe('Client ID the project belongs to'),
        description: z.string().max(1000).optional().describe('Optional description'),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe('Hex color code, e.g. #FF5733'),
      },
    },
    async ({ name, clientId, description, color }) => {
      const project = await projectService.create(userId, { name, clientId, description, color });
      return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
    }
  );

  server.registerTool(
    'update_project',
    {
      description: 'Update an existing project.',
      inputSchema: {
        id: z.string().uuid().describe('Project ID'),
        name: z.string().min(1).max(255).optional().describe('New name'),
        description: z.string().max(1000).optional().describe('New description'),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional().describe('Hex color or null to clear'),
        clientId: z.string().uuid().optional().describe('Move project to a different client'),
      },
    },
    async (args) => {
      const { id, ...rest } = args as {
        id: string;
        name?: string;
        description?: string;
        color?: string | null;
        clientId?: string;
      };
      const project = await projectService.update(id, userId, rest as import('../types').UpdateProjectInput);
      return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
    }
  );

  server.registerTool(
    'delete_project',
    {
      description: 'Soft-delete a project.',
      inputSchema: {
        id: z.string().uuid().describe('Project ID'),
      },
    },
    async ({ id }) => {
      await projectService.delete(id, userId);
      return { content: [{ type: 'text', text: `Project ${id} deleted.` }] };
    }
  );

  // -------------------------------------------------------------------------
  // Time entries
  // -------------------------------------------------------------------------

  server.registerTool(
    'list_time_entries',
    {
      description: 'List time entries with optional filters. Returns paginated results.',
      inputSchema: {
        startDate: z.string().datetime().optional().describe('Filter entries starting at or after this ISO datetime'),
        endDate: z.string().datetime().optional().describe('Filter entries starting at or before this ISO datetime'),
        projectId: z.string().uuid().optional().describe('Filter by project ID'),
        clientId: z.string().uuid().optional().describe('Filter by client ID'),
        page: z.number().int().min(1).optional().default(1).describe('Page number (default 1)'),
        limit: z.number().int().min(1).max(100).optional().default(50).describe('Results per page (max 100, default 50)'),
      },
    },
    async (filters) => {
      const result = await timeEntryService.findAll(userId, filters);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    'create_time_entry',
    {
      description: 'Create a manual time entry.',
      inputSchema: {
        projectId: z.string().uuid().describe('Project ID'),
        startTime: z.string().datetime().describe('Start time as ISO datetime string'),
        endTime: z.string().datetime().describe('End time as ISO datetime string'),
        breakMinutes: z.number().int().min(0).optional().describe('Break duration in minutes (default 0)'),
        description: z.string().max(1000).optional().describe('Optional description'),
      },
    },
    async ({ projectId, startTime, endTime, breakMinutes, description }) => {
      const entry = await timeEntryService.create(userId, { projectId, startTime, endTime, breakMinutes, description });
      return { content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }] };
    }
  );

  server.registerTool(
    'update_time_entry',
    {
      description: 'Update an existing time entry.',
      inputSchema: {
        id: z.string().uuid().describe('Time entry ID'),
        startTime: z.string().datetime().optional().describe('New start time'),
        endTime: z.string().datetime().optional().describe('New end time'),
        breakMinutes: z.number().int().min(0).optional().describe('New break duration in minutes'),
        description: z.string().max(1000).optional().describe('New description'),
        projectId: z.string().uuid().optional().describe('Move to a different project'),
      },
    },
    async ({ id, ...data }) => {
      const entry = await timeEntryService.update(id, userId, data);
      return { content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }] };
    }
  );

  server.registerTool(
    'delete_time_entry',
    {
      description: 'Delete a time entry.',
      inputSchema: {
        id: z.string().uuid().describe('Time entry ID'),
      },
    },
    async ({ id }) => {
      await timeEntryService.delete(id, userId);
      return { content: [{ type: 'text', text: `Time entry ${id} deleted.` }] };
    }
  );

  server.registerTool(
    'get_statistics',
    {
      description: 'Get aggregated time-tracking statistics, grouped by project and client.',
      inputSchema: {
        startDate: z.string().datetime().optional().describe('Filter from this ISO datetime'),
        endDate: z.string().datetime().optional().describe('Filter until this ISO datetime'),
        projectId: z.string().uuid().optional().describe('Filter by project ID'),
        clientId: z.string().uuid().optional().describe('Filter by client ID'),
      },
    },
    async (filters) => {
      const stats = await timeEntryService.getStatistics(userId, filters);
      return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
    }
  );

  // -------------------------------------------------------------------------
  // Timer
  // -------------------------------------------------------------------------

  server.registerTool(
    'get_timer',
    {
      description: 'Get the current running timer, or null if none is active.',
      inputSchema: {},
    },
    async () => {
      const timer = await timerService.getOngoingTimer(userId);
      return { content: [{ type: 'text', text: JSON.stringify(timer, null, 2) }] };
    }
  );

  server.registerTool(
    'start_timer',
    {
      description: 'Start a new timer. Fails if a timer is already running.',
      inputSchema: {
        projectId: z.string().uuid().optional().describe('Assign the timer to a project (can be set later)'),
      },
    },
    async ({ projectId }) => {
      const timer = await timerService.start(userId, { projectId });
      return { content: [{ type: 'text', text: JSON.stringify(timer, null, 2) }] };
    }
  );

  server.registerTool(
    'stop_timer',
    {
      description: 'Stop the running timer and save it as a time entry. A project must be assigned.',
      inputSchema: {
        projectId: z.string().uuid().optional().describe('Assign/override the project before stopping'),
      },
    },
    async ({ projectId }) => {
      const entry = await timerService.stop(userId, { projectId });
      return { content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }] };
    }
  );

  server.registerTool(
    'cancel_timer',
    {
      description: 'Cancel the running timer without saving a time entry.',
      inputSchema: {},
    },
    async () => {
      await timerService.cancel(userId);
      return { content: [{ type: 'text', text: 'Timer cancelled.' }] };
    }
  );

  // -------------------------------------------------------------------------
  // Client targets
  // -------------------------------------------------------------------------

  server.registerTool(
    'list_client_targets',
    {
      description: 'List all client hour targets with computed balance for each period.',
      inputSchema: {},
    },
    async () => {
      const targets = await clientTargetService.findAll(userId);
      return { content: [{ type: 'text', text: JSON.stringify(targets, null, 2) }] };
    }
  );

  server.registerTool(
    'create_client_target',
    {
      description: 'Create a new hour target for a client.',
      inputSchema: {
        clientId: z.string().uuid().describe('Client ID'),
        targetHours: z.number().positive().max(168).describe('Target hours per period'),
        periodType: z.enum(['weekly', 'monthly']).describe('Period type: weekly or monthly'),
        workingDays: z.array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])).min(1).describe('Working days, e.g. ["MON","TUE","WED","THU","FRI"]'),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date in YYYY-MM-DD format'),
      },
    },
    async (data) => {
      const target = await clientTargetService.create(userId, data);
      return { content: [{ type: 'text', text: JSON.stringify(target, null, 2) }] };
    }
  );

  server.registerTool(
    'update_client_target',
    {
      description: 'Update an existing client hour target.',
      inputSchema: {
        id: z.string().uuid().describe('Target ID'),
        targetHours: z.number().positive().max(168).optional().describe('New target hours per period'),
        periodType: z.enum(['weekly', 'monthly']).optional().describe('New period type'),
        workingDays: z.array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])).min(1).optional().describe('New working days'),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('New start date in YYYY-MM-DD'),
      },
    },
    async ({ id, ...data }) => {
      const target = await clientTargetService.update(id, userId, data);
      return { content: [{ type: 'text', text: JSON.stringify(target, null, 2) }] };
    }
  );

  server.registerTool(
    'delete_client_target',
    {
      description: 'Delete a client hour target.',
      inputSchema: {
        id: z.string().uuid().describe('Target ID'),
      },
    },
    async ({ id }) => {
      await clientTargetService.delete(id, userId);
      return { content: [{ type: 'text', text: `Client target ${id} deleted.` }] };
    }
  );

  server.registerTool(
    'add_target_correction',
    {
      description: 'Add a manual hour correction to a client target (e.g. for holidays or overtime carry-over).',
      inputSchema: {
        targetId: z.string().uuid().describe('Client target ID'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date of correction in YYYY-MM-DD format'),
        hours: z.number().min(-1000).max(1000).describe('Hours to add (negative to deduct)'),
        description: z.string().max(255).optional().describe('Optional reason for the correction'),
      },
    },
    async ({ targetId, date, hours, description }) => {
      const correction = await clientTargetService.addCorrection(targetId, userId, { date, hours, description });
      return { content: [{ type: 'text', text: JSON.stringify(correction, null, 2) }] };
    }
  );

  server.registerTool(
    'delete_target_correction',
    {
      description: 'Delete a manual hour correction from a client target.',
      inputSchema: {
        targetId: z.string().uuid().describe('Client target ID'),
        correctionId: z.string().uuid().describe('Correction ID'),
      },
    },
    async ({ targetId, correctionId }) => {
      await clientTargetService.deleteCorrection(targetId, correctionId, userId);
      return { content: [{ type: 'text', text: `Correction ${correctionId} deleted.` }] };
    }
  );

  return server;
}

// ---------------------------------------------------------------------------
// Route handler — one fresh McpServer + transport per request (stateless)
// ---------------------------------------------------------------------------

async function handleMcpRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const mcpServer = buildMcpServer(user);

  // Ensure the server is cleaned up when the response finishes
  res.on('close', () => {
    transport.close().catch(() => undefined);
    mcpServer.close().catch(() => undefined);
  });

  await mcpServer.connect(transport);
  await transport.handleRequest(req as unknown as Request, res, req.body);
}

// GET /mcp — SSE stream for server-initiated messages
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  handleMcpRequest(req, res).catch((err) => {
    console.error('[MCP] GET error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// POST /mcp — JSON-RPC requests
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  handleMcpRequest(req, res).catch((err) => {
    console.error('[MCP] POST error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// DELETE /mcp — session termination (stateless: always 405)
router.delete('/', (_req, res: Response) => {
  res.status(405).json({ error: 'Sessions are not supported (stateless mode)' });
});

export default router;
