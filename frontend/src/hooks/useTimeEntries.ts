import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timeEntriesApi } from "@/api/timeEntries";
import type {
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  TimeEntryFilters,
  StatisticsFilters,
} from "@/types";

interface UseTimeEntriesOptions {
  enabled?: boolean;
}

export function useTimeEntries(
  filters?: TimeEntryFilters,
  options?: UseTimeEntriesOptions,
) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["timeEntries", filters],
    queryFn: () => timeEntriesApi.getAll(filters),
    enabled: options?.enabled ?? true,
  });

  const createTimeEntry = useMutation({
    mutationFn: (input: CreateTimeEntryInput) => timeEntriesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["calendarWeekEntries"] });
    },
  });

  const updateTimeEntry = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTimeEntryInput }) =>
      timeEntriesApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["calendarWeekEntries"] });
    },
  });

  const deleteTimeEntry = useMutation({
    mutationFn: (id: string) => timeEntriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["calendarWeekEntries"] });
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

export function useStatistics(filters?: StatisticsFilters) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["statistics", filters],
    queryFn: () => timeEntriesApi.getStatistics(filters),
  });

  return {
    data,
    isLoading,
    error,
  };
}
