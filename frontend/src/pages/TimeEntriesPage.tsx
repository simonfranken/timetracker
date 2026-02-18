import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProjects } from '@/hooks/useProjects';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { ProjectColorDot } from '@/components/ProjectColorDot';
import { formatDate, formatDurationFromDates, getLocalISOString, toISOTimezone } from '@/utils/dateUtils';
import type { TimeEntry, CreateTimeEntryInput, UpdateTimeEntryInput } from '@/types';

export function TimeEntriesPage() {
  const { data, isLoading, createTimeEntry, updateTimeEntry, deleteTimeEntry } = useTimeEntries();
  const { projects } = useProjects();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [formData, setFormData] = useState<CreateTimeEntryInput>({
    startTime: '',
    endTime: '',
    description: '',
    projectId: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = (entry?: TimeEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        startTime: getLocalISOString(new Date(entry.startTime)),
        endTime: getLocalISOString(new Date(entry.endTime)),
        description: entry.description || '',
        projectId: entry.projectId,
      });
    } else {
      setEditingEntry(null);
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      setFormData({
        startTime: getLocalISOString(oneHourAgo),
        endTime: getLocalISOString(now),
        description: '',
        projectId: projects?.[0]?.id || '',
      });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
    setError(null);
  };

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
      if (editingEntry) {
        await updateTimeEntry.mutateAsync({ id: editingEntry.id, input: input as UpdateTimeEntryInput });
      } else {
        await createTimeEntry.mutateAsync(input);
      }
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleDelete = async (entry: TimeEntry) => {
    if (!confirm('Delete this time entry?')) return;
    try {
      await deleteTimeEntry.mutateAsync(entry.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Entries</h1>
          <p className="text-sm text-gray-600">Manage your tracked time</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus className="h-5 w-5 mr-2" /> Add Entry
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(entry.startTime)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <ProjectColorDot color={entry.project.color} />
                    <div className="ml-2">
                      <div className="text-sm font-medium text-gray-900">{entry.project.name}</div>
                      <div className="text-xs text-gray-500">{entry.project.client.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">{formatDurationFromDates(entry.startTime, entry.endTime)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <button onClick={() => handleOpenModal(entry)} className="p-1.5 text-gray-400 hover:text-gray-600 mr-1"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(entry)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.entries.length === 0 && (
          <div className="text-center py-8 text-gray-500">No time entries yet</div>
        )}
      </div>

      {isModalOpen && (
        <Modal
          title={editingEntry ? 'Edit Entry' : 'Add Entry'}
          onClose={handleCloseModal}
        >
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Project</label>
              <select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} className="input">
                {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Start</label>
                <input type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">End</label>
                <input type="datetime-local" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
              <button
                type="submit"
                className="btn-primary"
                disabled={createTimeEntry.isPending || updateTimeEntry.isPending}
              >
                {createTimeEntry.isPending || updateTimeEntry.isPending
                  ? 'Saving...'
                  : editingEntry
                  ? 'Save'
                  : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}