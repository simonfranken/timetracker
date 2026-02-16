import apiClient from './client';
import type {
  TimeEntry,
  PaginatedTimeEntries,
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  TimeEntryFilters,
} from '@/types';

export const timeEntriesApi = {
  getAll: async (filters?: TimeEntryFilters): Promise<PaginatedTimeEntries> => {
    const { data } = await apiClient.get<PaginatedTimeEntries>('/time-entries', {
      params: filters,
    });
    return data;
  },

  create: async (input: CreateTimeEntryInput): Promise<TimeEntry> => {
    const { data } = await apiClient.post<TimeEntry>('/time-entries', input);
    return data;
  },

  update: async (id: string, input: UpdateTimeEntryInput): Promise<TimeEntry> => {
    const { data } = await apiClient.put<TimeEntry>(`/time-entries/${id}`, input);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/time-entries/${id}`);
  },
};