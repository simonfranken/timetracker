import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientTargetsApi } from '@/api/clientTargets';
import { useTimer } from '@/contexts/TimerContext';
import type {
  CreateClientTargetInput,
  UpdateClientTargetInput,
  CreateCorrectionInput,
} from '@/types';

export function useClientTargets() {
  const queryClient = useQueryClient();
  const { ongoingTimer } = useTimer();

  const { data: targets, isLoading, error } = useQuery({
    queryKey: ['clientTargets'],
    queryFn: clientTargetsApi.getAll,
    // Poll every 30 s while a timer is running so the balance stays current
    refetchInterval: ongoingTimer ? 30_000 : false,
  });

  const createTarget = useMutation({
    mutationFn: (input: CreateClientTargetInput) => clientTargetsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientTargets'] });
    },
  });

  const updateTarget = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateClientTargetInput }) =>
      clientTargetsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientTargets'] });
    },
  });

  const deleteTarget = useMutation({
    mutationFn: (id: string) => clientTargetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientTargets'] });
    },
  });

  const addCorrection = useMutation({
    mutationFn: ({ targetId, input }: { targetId: string; input: CreateCorrectionInput }) =>
      clientTargetsApi.addCorrection(targetId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientTargets'] });
    },
  });

  const deleteCorrection = useMutation({
    mutationFn: ({ targetId, correctionId }: { targetId: string; correctionId: string }) =>
      clientTargetsApi.deleteCorrection(targetId, correctionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientTargets'] });
    },
  });

  return {
    targets,
    isLoading,
    error,
    createTarget,
    updateTarget,
    deleteTarget,
    addCorrection,
    deleteCorrection,
  };
}
