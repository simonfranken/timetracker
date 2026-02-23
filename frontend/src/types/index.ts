export interface User {
  id: string;
  username: string;
  fullName: string | null;
  email: string;
}

export interface Client {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  clientId: string;
  client: Pick<Client, 'id' | 'name'>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface TimeEntry {
  id: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  description: string | null;
  projectId: string;
  project: Pick<Project, 'id' | 'name' | 'color'> & {
    client: Pick<Client, 'id' | 'name'>;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OngoingTimer {
  id: string;
  startTime: string;
  projectId: string | null;
  project: (Pick<Project, 'id' | 'name' | 'color'> & {
    client: Pick<Client, 'id' | 'name'>;
  }) | null;
  createdAt: string;
  updatedAt: string;
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

export interface ProjectStatistics {
  projectId: string;
  projectName: string;
  projectColor: string | null;
  totalSeconds: number;
  entryCount: number;
}

export interface ClientStatistics {
  clientId: string;
  clientName: string;
  totalSeconds: number;
  entryCount: number;
}

export interface TimeStatistics {
  totalSeconds: number;
  entryCount: number;
  byProject: ProjectStatistics[];
  byClient: ClientStatistics[];
  filters: {
    startDate: string | null;
    endDate: string | null;
    projectId: string | null;
    clientId: string | null;
  };
}

export interface PaginatedTimeEntries {
  entries: TimeEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
  color?: string | null;
  clientId?: string;
}

export interface CreateTimeEntryInput {
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  description?: string;
  projectId: string;
}

export interface UpdateTimeEntryInput {
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  description?: string;
  projectId?: string;
}

export interface BalanceCorrection {
  id: string;
  date: string; // YYYY-MM-DD
  hours: number;
  description: string | null;
  createdAt: string;
}

export interface WeekBalance {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string;   // YYYY-MM-DD (Sunday)
  trackedSeconds: number;
  targetSeconds: number;
  correctionHours: number;
  balanceSeconds: number;
}

export interface ClientTargetWithBalance {
  id: string;
  clientId: string;
  clientName: string;
  userId: string;
  weeklyHours: number;
  startDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  corrections: BalanceCorrection[];
  totalBalanceSeconds: number;
  currentWeekTrackedSeconds: number;
  currentWeekTargetSeconds: number;
  weeks: WeekBalance[];
}

export interface CreateClientTargetInput {
  clientId: string;
  weeklyHours: number;
  startDate: string; // YYYY-MM-DD
}

export interface UpdateClientTargetInput {
  weeklyHours?: number;
  startDate?: string;
}

export interface CreateCorrectionInput {
  date: string; // YYYY-MM-DD
  hours: number;
  description?: string;
}
