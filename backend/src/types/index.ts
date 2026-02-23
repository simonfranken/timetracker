import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string | null;
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
  startTime?: string;
}

export interface StopTimerInput {
  projectId?: string;
}

export interface CreateClientTargetInput {
  clientId: string;
  weeklyHours: number;
  startDate: string; // YYYY-MM-DD, always a Monday
}

export interface UpdateClientTargetInput {
  weeklyHours?: number;
  startDate?: string; // YYYY-MM-DD, always a Monday
}

export interface CreateCorrectionInput {
  date: string; // YYYY-MM-DD
  hours: number;
  description?: string;
}
