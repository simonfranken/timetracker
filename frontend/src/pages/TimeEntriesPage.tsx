import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { Spinner } from '@/components/Spinner';
import { ProjectColorDot } from '@/components/ProjectColorDot';
import { TimeEntryFormModal } from '@/components/TimeEntryFormModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { formatDate, formatTime, formatDurationFromDatesHoursMinutes } from '@/utils/dateUtils';
import type { TimeEntry } from '@/types';

export function TimeEntriesPage() {
  const { data, isLoading, createTimeEntry, updateTimeEntry, deleteTimeEntry } = useTimeEntries();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<TimeEntry | null>(null);

  const handleOpenModal = (entry?: TimeEntry) => {
    setEditingEntry(entry ?? null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmEntry) return;
    try {
      await deleteTimeEntry.mutateAsync(confirmEntry.id);
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
        <div className="overflow-x-auto">
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
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  <div>{formatDate(entry.startTime)}</div>
                  <div className="text-xs text-gray-400">{formatTime(entry.startTime)} – {formatTime(entry.endTime)}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <ProjectColorDot color={entry.project.color} />
                    <div className="ml-2">
                      <div className="text-sm font-medium text-gray-900">{entry.project.name}</div>
                      <div className="text-xs text-gray-500">{entry.project.client.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                  {formatDurationFromDatesHoursMinutes(entry.startTime, entry.endTime, entry.breakMinutes)}
                  {entry.breakMinutes > 0 && (
                    <span className="text-xs text-gray-400 ml-1">(−{entry.breakMinutes}m)</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <button onClick={() => handleOpenModal(entry)} className="p-1.5 text-gray-400 hover:text-gray-600 mr-1"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => setConfirmEntry(entry)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {data?.entries.length === 0 && (
          <div className="text-center py-8 text-gray-500">No time entries yet</div>
        )}
      </div>

      {isModalOpen && (
        <TimeEntryFormModal
          entry={editingEntry}
          onClose={handleCloseModal}
          createTimeEntry={createTimeEntry}
          updateTimeEntry={updateTimeEntry}
        />
      )}

      {confirmEntry && (
        <ConfirmModal
          title="Delete Entry"
          message="Are you sure you want to delete this time entry?"
          onConfirm={handleDeleteConfirmed}
          onClose={() => setConfirmEntry(null)}
        />
      )}
    </div>
  );
}
