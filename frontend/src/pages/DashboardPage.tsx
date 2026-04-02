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
          <p className="py-8 text-center text-slate-500">
            No time entries yet. Start tracking time using the timer below.
          </p>
        ) : (
          <div className="table-shell">
            <table className="min-w-full">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="table-head-cell">
                    Project
                  </th>
                  <th className="table-head-cell">
                    Date
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
                {recentEntries?.entries.slice(0, 5).map((entry) => (
                  <tr key={entry.id} className="table-row">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <ProjectColorDot color={entry.project.color} />
                        <div className="ml-2">
                          <div className="text-sm font-semibold text-slate-900">
                            {entry.project.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {entry.project.client.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      <div>{formatDate(entry.startTime)}</div>
                      <div className="text-xs text-slate-500">{formatTime(entry.startTime)} – {formatTime(entry.endTime)}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-slate-900">
                      {formatDurationFromDatesHoursMinutes(entry.startTime, entry.endTime, entry.breakMinutes)}
                      {entry.breakMinutes > 0 && (
                        <span className="ml-1 text-xs text-slate-500">(−{entry.breakMinutes}m break)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button onClick={() => handleOpenModal(entry)} className="mr-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => setConfirmEntry(entry)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
