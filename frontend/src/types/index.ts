export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Client {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
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
}

export interface TimeEntry {
  id: string;
  startTime: string;
  endTime: string;
  description: string | null;
  projectId: string;
  project: Pick<Project, 'id' | 'name' | 'color'> & {
    client: Pick<Client, 'id' | 'name'>;
  };
  createdAt: string;
  updatedAt: string;
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
  description?: string;
  projectId: string;
}

export interface UpdateTimeEntryInput {
  startTime?: string;
  endTime?: string;
  description?: string;
  projectId?: string;
}
