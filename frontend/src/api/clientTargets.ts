import apiClient from './client';
import type {
  ClientTargetWithBalance,
  CreateClientTargetInput,
  UpdateClientTargetInput,
  CreateCorrectionInput,
  BalanceCorrection,
} from '@/types';

export const clientTargetsApi = {
  getAll: async (): Promise<ClientTargetWithBalance[]> => {
    const { data } = await apiClient.get<ClientTargetWithBalance[]>('/client-targets');
    return data;
  },

  create: async (input: CreateClientTargetInput): Promise<ClientTargetWithBalance> => {
    const { data } = await apiClient.post<ClientTargetWithBalance>('/client-targets', input);
    return data;
  },

  update: async (id: string, input: UpdateClientTargetInput): Promise<ClientTargetWithBalance> => {
    const { data } = await apiClient.put<ClientTargetWithBalance>(`/client-targets/${id}`, input);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/client-targets/${id}`);
  },

  addCorrection: async (targetId: string, input: CreateCorrectionInput): Promise<BalanceCorrection> => {
    const { data } = await apiClient.post<BalanceCorrection>(
      `/client-targets/${targetId}/corrections`,
      input,
    );
    return data;
  },

  deleteCorrection: async (targetId: string, correctionId: string): Promise<void> => {
    await apiClient.delete(`/client-targets/${targetId}/corrections/${correctionId}`);
  },
};
