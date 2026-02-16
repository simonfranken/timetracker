import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/api/clients';
import type { CreateClientInput, UpdateClientInput } from '@/types';

export function useClients() {
  const queryClient = useQueryClient();

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
  });

  const createClient = useMutation({
    mutationFn: (input: CreateClientInput) => clientsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const updateClient = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateClientInput }) =>
      clientsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const deleteClient = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      // Also invalidate projects since they depend on clients
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    clients,
    isLoading,
    error,
    createClient,
    updateClient,
    deleteClient,
  };
}