import { useState } from "react";
import { Plus, Edit2, Trash2, CalendarDays, List } from "lucide-react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { Spinner } from "@/components/Spinner";
import { ProjectColorDot } from "@/components/ProjectColorDot";
import { TimeEntryFormModal } from "@/components/TimeEntryFormModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CalendarPage } from "@/pages/CalendarPage";
import {
  formatDate,
  formatTime,
  formatDurationFromDatesHoursMinutes,
} from "@/utils/dateUtils";
import type { TimeEntry } from "@/types";

export function TimeEntriesPage() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const isCalendarView = viewMode === "calendar";
  const { data, isLoading, createTimeEntry, updateTimeEntry, deleteTimeEntry } =
    useTimeEntries(undefined, { enabled: viewMode === "list" });

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
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (viewMode === "list" && isLoading) {
    return <Spinner />;
  }

  return (
    <div className={isCalendarView ? "flex h-full min-h-0 flex-col gap-5 overflow-hidden" : "space-y-5"}>
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Entries</h1>
          <p className="text-sm text-gray-600">Manage your tracked time</p>
        </div>
        <button type="button" onClick={() => handleOpenModal()} className="btn-primary">
          <Plus className="mr-2 h-5 w-5" /> Add Entry
        </button>
      </div>

      <div className="inline-flex shrink-0 rounded-lg border border-gray-200 bg-white p-1">
        <button
          type="button"
          className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition ${
            viewMode === "list"
              ? "bg-primary-50 text-primary-700"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setViewMode("list")}
        >
          <List className="mr-1.5 h-4 w-4" /> List
        </button>
        <button
          type="button"
          className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition ${
            viewMode === "calendar"
              ? "bg-primary-50 text-primary-700"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setViewMode("calendar")}
        >
          <CalendarDays className="mr-1.5 h-4 w-4" /> Calendar
        </button>
      </div>

      {viewMode === "list" ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data?.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      <div>{formatDate(entry.startTime)}</div>
                      <div className="text-xs text-gray-400">
                        {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center">
                        <ProjectColorDot color={entry.project.color} />
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900">{entry.project.name}</div>
                          <div className="text-xs text-gray-500">{entry.project.client.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900">
                      {formatDurationFromDatesHoursMinutes(
                        entry.startTime,
                        entry.endTime,
                        entry.breakMinutes,
                      )}
                      {entry.breakMinutes > 0 && (
                        <span className="ml-1 text-xs text-gray-400">(-{entry.breakMinutes}m)</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(entry)}
                        className="mr-1 p-1.5 text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmEntry(entry)}
                        className="p-1.5 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.entries.length === 0 && (
            <div className="py-8 text-center text-gray-500">No time entries yet</div>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <CalendarPage />
        </div>
      )}

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
