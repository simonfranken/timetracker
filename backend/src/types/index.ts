import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface CreateClientInput {
  name: string;
  description?: string;
}

export interface UpdateClientInput {
  name?: string;
  description?: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  clientId: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
  clientId?: string;
}

export interface CreateTimeEntryInput {
  startTime: string;
  endTime: string;
  description?: string;
  projectId: string;
}

export interface UpdateTimeEntryInput {
  startTime?: string;
  endTime?: string;
  description?: string;
  projectId?: string;
}

export interface TimeEntryFilters {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  clientId?: string;
  page?: number;
  limit?: number;
}

export interface StatisticsFilters {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  clientId?: string;
}

export interface StartTimerInput {
  projectId?: string;
}

export interface UpdateTimerInput {
  projectId?: string | null;
}

export interface StopTimerInput {
  projectId?: string;
}
