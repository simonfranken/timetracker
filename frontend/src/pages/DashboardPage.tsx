import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Calendar, Briefcase, TrendingUp, Target, Edit2, Trash2 } from "lucide-react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useClientTargets } from "@/hooks/useClientTargets";
import { ProjectColorDot } from "@/components/ProjectColorDot";
import { StatCard } from "@/components/StatCard";
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

  const totalTodaySeconds =
    todayEntries?.entries.reduce((total, entry) => {
      return total + calculateDuration(entry.startTime, entry.endTime, entry.breakMinutes);
    }, 0) || 0;

  const targetsWithData = targets?.filter(t => t.weeks.length > 0) ?? [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of your time tracking activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Today"
          value={formatDurationHoursMinutes(totalTodaySeconds)}
          color="blue"
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

      {/* Overtime / Targets Widget */}
      {targetsWithData.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Weekly Targets</h2>
          </div>
          <div className="space-y-3">
            {targetsWithData.map(target => {
              const balance = target.totalBalanceSeconds;
              const absBalance = Math.abs(balance);
              const isOver = balance > 0;
              const isEven = balance === 0;
              const currentWeekTracked = formatDurationHoursMinutes(target.currentWeekTrackedSeconds);
              const currentWeekTarget = formatDurationHoursMinutes(target.currentWeekTargetSeconds);

              return (
                <div
                  key={target.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{target.clientName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      This week: {currentWeekTracked} / {currentWeekTarget}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        isEven
                          ? 'text-gray-500'
                          : isOver
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {isEven
                        ? '±0'
                        : (isOver ? '+' : '−') + formatDurationHoursMinutes(absBalance)}
                    </p>
                    <p className="text-xs text-gray-400">running balance</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            <Link to="/clients" className="text-primary-600 hover:text-primary-700">
              Manage targets →
            </Link>
          </p>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <Link
            to="/time-entries"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            View all →
          </Link>
        </div>

        {recentEntries?.entries.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No time entries yet. Start tracking time using the timer below.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentEntries?.entries.slice(0, 5).map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <ProjectColorDot color={entry.project.color} />
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.project.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {entry.project.client.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div>{formatDate(entry.startTime)}</div>
                      <div className="text-xs text-gray-400">{formatTime(entry.startTime)} – {formatTime(entry.endTime)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {formatDurationFromDatesHoursMinutes(entry.startTime, entry.endTime, entry.breakMinutes)}
                      {entry.breakMinutes > 0 && (
                        <span className="text-xs text-gray-400 ml-1">(−{entry.breakMinutes}m break)</span>
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
