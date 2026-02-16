import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';
import type { CreateProjectInput, UpdateProjectInput } from '@/types';

export function useProjects(clientId?: string) {
  const queryClient = useQueryClient();

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects', clientId],
    queryFn: () => projectsApi.getAll(clientId),
  });

  const createProject = useMutation({
    mutationFn: (input: CreateProjectInput) => projectsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const updateProject = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      projectsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    projects,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
  };
}