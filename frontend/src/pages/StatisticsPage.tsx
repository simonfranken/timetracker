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
import { ProjectColorDot } from "@/components/ProjectColorDot";
import { formatDurationHoursMinutes, toISOTimezone } from "@/utils/dateUtils";
import type { StatisticsFilters } from "@/types";

export function StatisticsPage() {
  const [filters, setFilters] = useState<StatisticsFilters>({});
  const { data: statistics, isLoading } = useStatistics(filters);
  const { clients } = useClients();
  const { projects } = useProjects();

  const filteredProjects = filters.clientId
    ? (projects ?? []).filter((p) => p.clientId === filters.clientId)
    : projects;

  const handleFilterChange = (
    key: keyof StatisticsFilters,
    value: string | undefined,
  ) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value || undefined };
      // When client changes, clear any project selection that may belong to a different client
      if (key === 'clientId') next.projectId = undefined;
      return next;
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Statistics</h1>
        <p className="page-subtitle">
          View your working hours with filters
        </p>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
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
                  e.target.value ? toISOTimezone(`${e.target.value}T00:00:00`) : undefined,
                )
              }
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
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
                  e.target.value ? toISOTimezone(`${e.target.value}T23:59:59`) : undefined,
                )
              }
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
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
              {filteredProjects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(filters.startDate ||
          filters.endDate ||
          filters.clientId ||
          filters.projectId) && (
          <div className="mt-4">
            <button onClick={clearFilters} className="btn-secondary">
              Clear Filters
            </button>
          </div>
        )}
      </div>

      <div className="card border-indigo-100 bg-gradient-to-br from-indigo-50 to-cyan-50">
        <div className="flex items-center">
          <div className="flex flex-col grow">
            <div>
              <p className="text-sm font-semibold text-indigo-700">
                Total Working Time
              </p>
              <p className="mt-1 text-4xl font-semibold text-indigo-950">
                {isLoading ? (
                  <span className="text-2xl">Loading...</span>
                ) : (
                  formatDurationHoursMinutes(statistics?.totalSeconds || 0)
                )}
              </p>
            </div>
            <p className="mt-2 text-sm text-indigo-700">
              {statistics?.entryCount || 0} time entries
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 p-4">
            <Clock className="h-8 w-8 text-indigo-700" />
          </div>
        </div>
      </div>

      {statistics && statistics.byProject.length > 0 && (
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            By Project
          </h3>
          <div className="space-y-3">
            {statistics.byProject.map((project) => (
              <div
                key={project.projectId}
                className="flex items-center justify-between rounded-2xl bg-slate-100/80 p-3"
              >
                <div className="flex items-center gap-3">
                   <ProjectColorDot color={project.projectColor} />
                   <span className="font-semibold text-slate-900">
                    {project.projectName}
                  </span>
                  <span className="text-sm text-slate-500">
                    ({project.entryCount} entries)
                  </span>
                </div>
                <span className="font-mono font-semibold text-slate-900">
                  {formatDurationHoursMinutes(project.totalSeconds)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {statistics && statistics.byClient.length > 0 && (
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            By Client
          </h3>
          <div className="space-y-3">
            {statistics.byClient.map((client) => (
              <div
                key={client.clientId}
                className="flex items-center justify-between rounded-2xl bg-slate-100/80 p-3"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-slate-900">
                    {client.clientName}
                  </span>
                  <span className="text-sm text-slate-500">
                    ({client.entryCount} entries)
                  </span>
                </div>
                <span className="font-mono font-semibold text-slate-900">
                  {formatDurationHoursMinutes(client.totalSeconds)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && statistics && statistics.entryCount === 0 && (
        <div className="card text-center py-12">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900">
            No data available
          </h3>
          <p className="mt-1 text-slate-500">
            No time entries found for the selected filters.
          </p>
        </div>
      )}
    </div>
  );
}
