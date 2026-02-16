import apiClient from './client';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types';

export const projectsApi = {
  getAll: async (clientId?: string): Promise<Project[]> => {
    const { data } = await apiClient.get<Project[]>('/projects', {
      params: clientId ? { clientId } : undefined,
    });
    return data;
  },

  create: async (input: CreateProjectInput): Promise<Project> => {
    const { data } = await apiClient.post<Project>('/projects', input);
    return data;
  },

  update: async (id: string, input: UpdateProjectInput): Promise<Project> => {
    const { data } = await apiClient.put<Project>(`/projects/${id}`, input);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },
};