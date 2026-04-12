import { useState } from "react";
import { Plus, Edit2, Trash2, CalendarDays, List, Search, ArrowUpDown } from "lucide-react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { ProjectColorDot } from "@/components/ProjectColorDot";
import { TimeEntryFormModal } from "@/components/TimeEntryFormModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  ItemListSurface,
  ItemListRow,
  ItemListEmpty,
  ItemListRowSkeleton,
} from "@/components/ItemListSurface";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"dateDesc" | "dateAsc" | "durationDesc">("dateDesc");

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

  const filteredEntries = (data?.entries ?? [])
    .filter((entry) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      return (
        entry.project.name.toLowerCase().includes(q) ||
        entry.project.client.name.toLowerCase().includes(q) ||
        (entry.description ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aStart = new Date(a.startTime).getTime();
      const bStart = new Date(b.startTime).getTime();

      if (sortBy === "dateAsc") return aStart - bStart;
      if (sortBy === "dateDesc") return bStart - aStart;

      const aDuration =
        Math.max(0, new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) -
        a.breakMinutes * 60_000;
      const bDuration =
        Math.max(0, new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) -
        b.breakMinutes * 60_000;
      return bDuration - aDuration;
    });

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
        <ItemListSurface
          controls={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="relative block w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by project, client, or notes"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  <ArrowUpDown className="h-4 w-4" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "dateDesc" | "dateAsc" | "durationDesc")}
                    className="bg-transparent text-sm text-slate-700 outline-none"
                  >
                    <option value="dateDesc">Newest first</option>
                    <option value="dateAsc">Oldest first</option>
                    <option value="durationDesc">Longest duration</option>
                  </select>
                </div>
                <span className="chip">{filteredEntries.length} entr{filteredEntries.length === 1 ? "y" : "ies"}</span>
              </div>
            </div>
          }
        >
          {isLoading ? (
            <>
              <ItemListRowSkeleton />
              <ItemListRowSkeleton />
              <ItemListRowSkeleton />
            </>
          ) : (data?.entries.length ?? 0) === 0 ? (
            <ItemListEmpty
              title="No time entries yet"
              description="Add your first entry to start tracking your work history."
            />
          ) : filteredEntries.length === 0 ? (
            <ItemListEmpty
              title="No matching entries"
              description="Try a broader search or switch sorting." 
            />
          ) : (
            filteredEntries.map((entry) => (
              <ItemListRow
                key={entry.id}
                title={
                  <span className="inline-flex items-center gap-2">
                    <ProjectColorDot color={entry.project.color} />
                    {entry.project.name}
                  </span>
                }
                subtitle={entry.project.client.name}
                chips={
                  <>
                    <span className="chip">{formatDate(entry.startTime)}</span>
                    <span className="chip">{formatTime(entry.startTime)} - {formatTime(entry.endTime)}</span>
                    <span className="chip font-mono text-slate-700">
                      {formatDurationFromDatesHoursMinutes(
                        entry.startTime,
                        entry.endTime,
                        entry.breakMinutes,
                      )}
                    </span>
                    {entry.breakMinutes > 0 && (
                      <span className="chip">Break {entry.breakMinutes}m</span>
                    )}
                  </>
                }
                details={entry.description || "No description"}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenModal(entry)}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmEntry(entry)}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                }
                selected={confirmEntry?.id === entry.id}
              />
            ))
          )}
        </ItemListSurface>
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
