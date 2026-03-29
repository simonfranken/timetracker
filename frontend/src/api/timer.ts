import apiClient from './client';
import type { OngoingTimer, TimeEntry } from '@/types';

export interface UpdateTimerPayload {
  projectId?: string | null;
  startTime?: string;
}

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

  update: async (payload: UpdateTimerPayload): Promise<OngoingTimer> => {
    const { data } = await apiClient.put<OngoingTimer>('/timer', payload);
    return data;
  },

  stop: async (projectId?: string): Promise<TimeEntry> => {
    const { data } = await apiClient.post<TimeEntry>('/timer/stop', {
      projectId,
    });
    return data;
  },

  pause: async (): Promise<OngoingTimer> => {
    const { data } = await apiClient.post<OngoingTimer>('/timer/pause');
    return data;
  },

  resume: async (): Promise<OngoingTimer> => {
    const { data } = await apiClient.post<OngoingTimer>('/timer/resume');
    return data;
  },

  cancel: async (): Promise<void> => {
    await apiClient.delete('/timer');
  },
};