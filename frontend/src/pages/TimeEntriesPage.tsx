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
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
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
      <div className="page-header shrink-0">
        <div>
          <h1 className="page-title">Time Entries</h1>
          <p className="page-subtitle">Manage your tracked time</p>
        </div>
        <button type="button" onClick={() => handleOpenModal()} className="btn-primary">
          <Plus className="mr-2 h-5 w-5" /> Add Entry
        </button>
      </div>

      <div className="inline-flex shrink-0 self-start rounded-2xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          className={`inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
            viewMode === "calendar"
              ? "bg-indigo-100 text-indigo-700"
              : "text-slate-600 hover:text-slate-900"
          }`}
          onClick={() => setViewMode("calendar")}
        >
          <CalendarDays className="mr-1.5 h-4 w-4" /> Calendar
        </button>
        <button
          type="button"
          className={`inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
            viewMode === "list"
              ? "bg-indigo-100 text-indigo-700"
              : "text-slate-600 hover:text-slate-900"
          }`}
          onClick={() => setViewMode("list")}
        >
          <List className="mr-1.5 h-4 w-4" /> List
        </button>
      </div>

      {viewMode === "list" ? (
        <div className="table-shell">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="table-head-cell">
                    Date
                  </th>
                  <th className="table-head-cell">
                    Project
                  </th>
                  <th className="table-head-cell">
                    Duration
                  </th>
                  <th className="table-head-cell text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {data?.entries.map((entry) => (
                  <tr key={entry.id} className="table-row">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">
                      <div>{formatDate(entry.startTime)}</div>
                      <div className="text-xs text-slate-500">
                        {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center">
                        <ProjectColorDot color={entry.project.color} />
                        <div className="ml-2">
                          <div className="text-sm font-semibold text-slate-900">{entry.project.name}</div>
                          <div className="text-xs text-slate-500">{entry.project.client.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-slate-900">
                      {formatDurationFromDatesHoursMinutes(
                        entry.startTime,
                        entry.endTime,
                        entry.breakMinutes,
                      )}
                      {entry.breakMinutes > 0 && (
                        <span className="ml-1 text-xs text-slate-500">(-{entry.breakMinutes}m)</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(entry)}
                        className="mr-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmEntry(entry)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
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
            <div className="py-8 text-center text-slate-500">No time entries yet</div>
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
