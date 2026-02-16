import { Link } from "react-router-dom";
import { Clock, Calendar, Briefcase, TrendingUp } from "lucide-react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import {
  formatDate,
  formatDurationFromDates,
  formatDuration,
} from "@/utils/dateUtils";
import { startOfDay, endOfDay } from "date-fns";

export function DashboardPage() {
  const today = new Date();
  const { data: todayEntries } = useTimeEntries({
    startDate: startOfDay(today).toISOString(),
    endDate: endOfDay(today).toISOString(),
    limit: 5,
  });

  const { data: recentEntries } = useTimeEntries({
    limit: 10,
  });

  const totalTodaySeconds =
    todayEntries?.entries.reduce((total, entry) => {
      return total + calculateDuration(entry.startTime, entry.endTime);
    }, 0) || 0;

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
          value={formatDuration(totalTodaySeconds)}
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentEntries?.entries.slice(0, 5).map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{
                            backgroundColor: entry.project.color || "#6b7280",
                          }}
                        />
                        <div>
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
                      {formatDate(entry.startTime)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {formatDurationFromDates(entry.startTime, entry.endTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: "blue" | "green" | "purple" | "orange";
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="card p-4">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function calculateDuration(startTime: string, endTime: string): number {
  return Math.floor(
    (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000,
  );
}
