import { useState } from "react";
import {
  BarChart3,
  Calendar,
  Building2,
  FolderOpen,
  Clock,
} from "lucide-react";
import { useStatistics } from "@/hooks/useTimeEntries";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { formatDuration } from "@/utils/dateUtils";
import type { StatisticsFilters } from "@/types";

export function StatisticsPage() {
  const [filters, setFilters] = useState<StatisticsFilters>({});
  const { data: statistics, isLoading } = useStatistics(filters);
  const { clients } = useClients();
  const { projects } = useProjects();

  const handleFilterChange = (
    key: keyof StatisticsFilters,
    value: string | undefined,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
        <p className="mt-1 text-sm text-gray-600">
          View your working hours with filters
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                From Date
              </span>
            </label>
            <input
              type="date"
              value={filters.startDate ? filters.startDate.split("T")[0] : ""}
              onChange={(e) =>
                handleFilterChange(
                  "startDate",
                  e.target.value ? `${e.target.value}T00:00:00` : undefined,
                )
              }
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                To Date
              </span>
            </label>
            <input
              type="date"
              value={filters.endDate ? filters.endDate.split("T")[0] : ""}
              onChange={(e) =>
                handleFilterChange(
                  "endDate",
                  e.target.value ? `${e.target.value}T23:59:59` : undefined,
                )
              }
              className="input"
            />
          </div>

          {/* Client Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                Client
              </span>
            </label>
            <select
              value={filters.clientId || ""}
              onChange={(e) =>
                handleFilterChange("clientId", e.target.value || undefined)
              }
              className="input"
            >
              <option value="">All Clients</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1">
                <FolderOpen className="h-4 w-4" />
                Project
              </span>
            </label>
            <select
              value={filters.projectId || ""}
              onChange={(e) =>
                handleFilterChange("projectId", e.target.value || undefined)
              }
              className="input"
            >
              <option value="">All Projects</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(filters.startDate ||
          filters.endDate ||
          filters.clientId ||
          filters.projectId) && (
          <div className="mt-4">
            <button onClick={clearFilters} className="btn btn-secondary">
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Total Hours Display */}
      <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary-700">
              Total Working Time
            </p>
            <p className="text-4xl font-bold text-primary-900 mt-1">
              {isLoading ? (
                <span className="text-2xl">Loading...</span>
              ) : (
                formatDuration(statistics?.totalSeconds || 0)
              )}
            </p>
          </div>
          <div className="p-4 bg-primary-200 rounded-full">
            <Clock className="h-8 w-8 text-primary-700" />
          </div>
        </div>
        <p className="mt-2 text-sm text-primary-600">
          {statistics?.entryCount || 0} time entries
        </p>
      </div>

      {/* Breakdown by Project */}
      {statistics && statistics.byProject.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            By Project
          </h3>
          <div className="space-y-3">
            {statistics.byProject.map((project) => (
              <div
                key={project.projectId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: project.projectColor || "#6b7280",
                    }}
                  />
                  <span className="font-medium text-gray-900">
                    {project.projectName}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({project.entryCount} entries)
                  </span>
                </div>
                <span className="font-mono font-semibold text-gray-900">
                  {formatDuration(project.totalSeconds)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown by Client */}
      {statistics && statistics.byClient.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            By Client
          </h3>
          <div className="space-y-3">
            {statistics.byClient.map((client) => (
              <div
                key={client.clientId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {client.clientName}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({client.entryCount} entries)
                  </span>
                </div>
                <span className="font-mono font-semibold text-gray-900">
                  {formatDuration(client.totalSeconds)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && statistics && statistics.entryCount === 0 && (
        <div className="card text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            No data available
          </h3>
          <p className="text-gray-500 mt-1">
            No time entries found for the selected filters.
          </p>
        </div>
      )}
    </div>
  );
}
