import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Calendar, Briefcase, TrendingUp, Target, Edit2, Trash2 } from "lucide-react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useClientTargets } from "@/hooks/useClientTargets";
import { useTimer } from "@/contexts/TimerContext";
import { ProjectColorDot } from "@/components/ProjectColorDot";
import { StatCard } from "@/components/StatCard";
import { TargetProgressItem } from "@/components/TargetProgressItem";
import { TimeEntryFormModal } from "@/components/TimeEntryFormModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  ItemListSurface,
  ItemListRow,
  ItemListEmpty,
  ItemListRowSkeleton,
} from "@/components/ItemListSurface";
import {
  formatDate,
  formatTime,
  formatDurationFromDatesHoursMinutes,
  formatDurationHoursMinutes,
  calculateDuration,
} from "@/utils/dateUtils";
import { startOfDay, endOfDay } from "date-fns";
import type { TimeEntry } from "@/types";

export function DashboardPage() {
  const today = new Date();
  const { data: todayEntries } = useTimeEntries({
    startDate: startOfDay(today).toISOString(),
    endDate: endOfDay(today).toISOString(),
    limit: 5,
  });

  const { data: recentEntries, createTimeEntry, updateTimeEntry, deleteTimeEntry } = useTimeEntries({
    limit: 10,
  });

  const { targets } = useClientTargets();
  const { ongoingTimer, elapsedSeconds } = useTimer();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<TimeEntry | null>(null);

  const handleOpenModal = (entry: TimeEntry) => {
    setEditingEntry(entry);
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

  const completedTodaySeconds =
    todayEntries?.entries.reduce((total, entry) => {
      return total + calculateDuration(entry.startTime, entry.endTime, entry.breakMinutes);
    }, 0) ?? 0;

  // Only add the running timer if it started today (not a timer left running from yesterday)
  const timerStartedToday =
    ongoingTimer !== null &&
    new Date(ongoingTimer.startTime) >= startOfDay(today);

  const totalTodaySeconds = completedTodaySeconds + (timerStartedToday ? elapsedSeconds : 0);

  const targetsWithData = targets?.filter(t => t.periods.length > 0) ?? [];

  return (
    <div className="space-y-6 pb-2">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your time tracking activity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Clock}
          label="Today"
          value={formatDurationHoursMinutes(totalTodaySeconds)}
          color="blue"
          indicator={timerStartedToday}
        />
        <StatCard
          icon={Calendar}
          label="Entries Today"
          value={todayEntries?.entries.length.toString() || "0"}
          color="green"
        />
        <StatCard
          icon={Briefcase}
          label="Active Projects"
          value={
            new Set(
              recentEntries?.entries.map((e) => e.projectId),
            ).size.toString() || "0"
          }
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Entries"
          value={recentEntries?.pagination.total.toString() || "0"}
          color="orange"
        />
      </div>

      {targetsWithData.length > 0 && (
        <div className="card">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Targets</h2>
                <p className="text-xs text-slate-500">Current period progress by client</p>
              </div>
            </div>
            <Link to="/clients" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Manage targets →
            </Link>
          </div>

          <div className="space-y-3">
            {targetsWithData.map(target => {
              return (
                <TargetProgressItem key={target.id} target={target} />
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Activity
          </h2>
          <Link
            to="/time-entries"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View all →
          </Link>
        </div>

        {recentEntries?.entries.length === 0 ? (
          <ItemListEmpty
            title="No time entries yet"
            description="Start tracking time using the timer below."
          />
        ) : (
          <ItemListSurface
            controls={<div className="text-sm text-slate-500">Showing latest {Math.min(5, recentEntries?.entries.length ?? 0)} entries</div>}
          >
            {!recentEntries ? (
              <>
                <ItemListRowSkeleton />
                <ItemListRowSkeleton />
              </>
            ) : (
              recentEntries.entries.slice(0, 5).map((entry) => (
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
                        {formatDurationFromDatesHoursMinutes(entry.startTime, entry.endTime, entry.breakMinutes)}
                      </span>
                      {entry.breakMinutes > 0 && <span className="chip">Break {entry.breakMinutes}m</span>}
                    </>
                  }
                  actions={
                    <>
                      <button
                        onClick={() => handleOpenModal(entry)}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
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
