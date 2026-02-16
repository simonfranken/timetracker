import { z } from 'zod';

export const IdSchema = z.object({
  id: z.string().uuid(),
});

export const CreateClientSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export const UpdateClientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  clientId: z.string().uuid(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  clientId: z.string().uuid().optional(),
});

export const CreateTimeEntrySchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  description: z.string().max(1000).optional(),
  projectId: z.string().uuid(),
});

export const UpdateTimeEntrySchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  description: z.string().max(1000).optional(),
  projectId: z.string().uuid().optional(),
});

export const TimeEntryFiltersSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  projectId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const StartTimerSchema = z.object({
  projectId: z.string().uuid().optional(),
});

export const UpdateTimerSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
});

export const StopTimerSchema = z.object({
  projectId: z.string().uuid().optional(),
});