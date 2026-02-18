import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { useProjects } from '@/hooks/useProjects';
import { getLocalISOString, toISOTimezone } from '@/utils/dateUtils';
import type { TimeEntry, CreateTimeEntryInput, UpdateTimeEntryInput } from '@/types';
import type { UseMutationResult } from '@tanstack/react-query';

interface TimeEntryFormModalProps {
  entry: TimeEntry | null;
  onClose: () => void;
  createTimeEntry: UseMutationResult<TimeEntry, Error, CreateTimeEntryInput>;
  updateTimeEntry: UseMutationResult<TimeEntry, Error, { id: string; input: UpdateTimeEntryInput }>;
}

export function TimeEntryFormModal({ entry, onClose, createTimeEntry, updateTimeEntry }: TimeEntryFormModalProps) {
  const { projects } = useProjects();

  const [formData, setFormData] = useState<CreateTimeEntryInput>(() => {
    if (entry) {
      return {
        startTime: getLocalISOString(new Date(entry.startTime)),
        endTime: getLocalISOString(new Date(entry.endTime)),
        description: entry.description || '',
        projectId: entry.projectId,
      };
    }
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    return {
      startTime: getLocalISOString(oneHourAgo),
      endTime: getLocalISOString(now),
      description: '',
      projectId: projects?.[0]?.id || '',
    };
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.projectId) {
      setError('Please select a project');
      return;
    }

    const input = {
      ...formData,
      startTime: toISOTimezone(formData.startTime),
      endTime: toISOTimezone(formData.endTime),
    };

    try {
      if (entry) {
        await updateTimeEntry.mutateAsync({ id: entry.id, input: input as UpdateTimeEntryInput });
      } else {
        await createTimeEntry.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  return (
    <Modal title={entry ? 'Edit Entry' : 'Add Entry'} onClose={onClose}>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Project</label>
          <select
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            className="input"
          >
            {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Start</label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">End</label>
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="input"
            />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            rows={2}
          />
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="submit"
            className="btn-primary"
            disabled={createTimeEntry.isPending || updateTimeEntry.isPending}
          >
            {createTimeEntry.isPending || updateTimeEntry.isPending ? 'Saving...' : entry ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
