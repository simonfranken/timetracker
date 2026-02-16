import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeEntriesApi } from '@/api/timeEntries';
import type { CreateTimeEntryInput, UpdateTimeEntryInput, TimeEntryFilters } from '@/types';

export function useTimeEntries(filters?: TimeEntryFilters) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['timeEntries', filters],
    queryFn: () => timeEntriesApi.getAll(filters),
  });

  const createTimeEntry = useMutation({
    mutationFn: (input: CreateTimeEntryInput) => timeEntriesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });

  const updateTimeEntry = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTimeEntryInput }) =>
      timeEntriesApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });

  const deleteTimeEntry = useMutation({
    mutationFn: (id: string) => timeEntriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });

  return {
    data,
    isLoading,
    error,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
  };
}