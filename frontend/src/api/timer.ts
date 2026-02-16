import apiClient from './client';
import type { OngoingTimer, TimeEntry } from '@/types';

export const timerApi = {
  getOngoing: async (): Promise<OngoingTimer | null> => {
    const { data } = await apiClient.get<OngoingTimer | null>('/timer');
    return data;
  },

  start: async (projectId?: string): Promise<OngoingTimer> => {
    const { data } = await apiClient.post<OngoingTimer>('/timer/start', {
      projectId,
    });
    return data;
  },

  update: async (projectId?: string | null): Promise<OngoingTimer> => {
    const { data } = await apiClient.put<OngoingTimer>('/timer', {
      projectId,
    });
    return data;
  },

  stop: async (projectId?: string): Promise<TimeEntry> => {
    const { data } = await apiClient.post<TimeEntry>('/timer/stop', {
      projectId,
    });
    return data;
  },
};