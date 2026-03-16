import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeysApi } from '@/api/apiKeys';
import type { CreateApiKeyInput } from '@/types';

export function useApiKeys() {
  const queryClient = useQueryClient();

  const { data: apiKeys, isLoading, error } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: apiKeysApi.getAll,
  });

  const createApiKey = useMutation({
    mutationFn: (input: CreateApiKeyInput) => apiKeysApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  const deleteApiKey = useMutation({
    mutationFn: (id: string) => apiKeysApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  return {
    apiKeys,
    isLoading,
    error,
    createApiKey,
    deleteApiKey,
  };
}
