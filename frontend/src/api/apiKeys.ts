import apiClient from './client';
import type { ApiKey, CreatedApiKey, CreateApiKeyInput } from '@/types';

export const apiKeysApi = {
  getAll: async (): Promise<ApiKey[]> => {
    const { data } = await apiClient.get<ApiKey[]>('/api-keys');
    return data;
  },

  create: async (input: CreateApiKeyInput): Promise<CreatedApiKey> => {
    const { data } = await apiClient.post<CreatedApiKey>('/api-keys', input);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api-keys/${id}`);
  },
};
