import apiClient from './client';
import type { Client, CreateClientInput, UpdateClientInput } from '@/types';

export const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    const { data } = await apiClient.get<Client[]>('/clients');
    return data;
  },

  create: async (input: CreateClientInput): Promise<Client> => {
    const { data } = await apiClient.post<Client>('/clients', input);
    return data;
  },

  update: async (id: string, input: UpdateClientInput): Promise<Client> => {
    const { data } = await apiClient.put<Client>(`/clients/${id}`, input);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/clients/${id}`);
  },
};