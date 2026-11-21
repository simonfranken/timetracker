import { useState } from "react";
import { Link } from "react-router-dom";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns";
import { useStatistics } from "@/hooks/useTimeEntries";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useClientTargets } from "@/hooks/useClientTargets";
import { BalanceFigure } from "@/components/TargetProgressItem";
import { CorrectionModal, type CorrectionModalProps } from "@/components/CorrectionModal";
import { Spinner } from "@/components/Spinner";
import { clientColor, DEFAULT_PROJECT_COLOR } from "@/utils/colorUtils";
import { formatDurationHoursMinutes, formatSignedDuration } from "@/utils/dateUtils";
import type { ClientTargetWithBalance, PeriodBalance } from "@/types";

type Preset = "week" | "month" | "lastMonth" | "year" | "custom";

const PRESETS: { id: Exclude<Preset, "custom">; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "year", label: "This year" },
];

const DAY_LABELS: Record<string, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

function presetRange(preset: Exclude<Preset, "custom">): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "lastMonth": {
      const last = subMonths(now, 1);
      return { start: startOfMonth(last), end: endOfMonth(last) };
    }
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

function rangeLabel(preset: Preset, start: Date | null, end: Date | null): string {
  if (!start || !end) return "All time";
  if (preset === "month" || preset === "lastMonth") return format(start, "MMM yyyy");
  if (preset === "year") return format(start, "yyyy");
  return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

function periodLabel(period: PeriodBalance): string {
  const start = new Date(`${period.periodStart}T00:00:00`);
  const end = new Date(`${period.periodEnd}T00:00:00`);
  return start.getMonth() === end.getMonth()
    ? `${format(start, "d")}–${format(end, "d MMM")}`
    : `${format(start, "d MMM")} – ${format(end, "d MMM")}`;
}

function hoursLabel(hours: number): string {
  return formatDurationHoursMinutes(Math.round(hours * 3600)) || "0h";
}

function TargetCard({
  target,
  color,
  onAddCorrection,
  onEditCorrection,
}: {
  target: ClientTargetWithBalance;
  color: string;
  onAddCorrection: (targetId: string) => void;
  onEditCorrection: (target: ClientTargetWithBalance, correctionId: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const percent =
    target.currentPeriodTargetSeconds > 0
      ? Math.min(
          100,
          Math.round(
            (target.currentPeriodTrackedSeconds / target.currentPeriodTargetSeconds) * 100,
          ),
        )
      : 0;
  const ongoing = target.periods.find((p) => p.isOngoing);
  const corrections = target.corrections
    .filter((c) => !c.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date));
  const correctionTotal = corrections.reduce((sum, c) => sum + c.hours, 0);
  const shownCorrections = showAll ? corrections : corrections.slice(0, 5);
  const pastPeriods = target.periods
    .filter((p) => !p.isOngoing)
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  const days = target.workingDays.map((d) => DAY_LABELS[d] ?? d);
  const dayRange =
    days.length === 5 && days[0] === "Mon" && days[4] === "Fri"
      ? "Mon–Fri"
      : days.join(", ");
  const unit = target.periodType === "weekly" ? "week" : "month";

  let status: string | null = null;
  if (ongoing?.expectedHours !== undefined) {
    const doneHours =
      ongoing.trackedSeconds / 3600 + ongoing.correctionHours;
    status = `${doneHours + 0.001 >= ongoing.expectedHours ? "On track" : "Behind"}: expected ${hoursLabel(
      ongoing.expectedHours,
    )} by today`;
  }

  return (
    <div className="card px-5 py-[22px] sm:px-[26px]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <b className="text-[17px]">{target.clientName}</b>
          <div className="text-[13px] text-ink-muted">
            {target.targetHours}h per {unit} · {dayRange} · since{" "}
            {format(new Date(`${target.startDate}T00:00:00`), "MMM yyyy")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl">
            <BalanceFigure seconds={target.totalBalanceSeconds} />
          </div>
          <div className="text-xs text-ink-muted">running balance</div>
        </div>
      </div>

      <div
        className="mb-2 mt-4 h-3 overflow-hidden rounded-md bg-paper-hover"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${target.clientName} progress this ${unit}`}
      >
        <div className="h-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
      <div className="flex flex-wrap justify-between gap-x-4 text-[13px] text-ink-muted">
        <span className="tabular">
          This {unit} {formatDurationHoursMinutes(target.currentPeriodTrackedSeconds) || "0m"} /{" "}
          {formatDurationHoursMinutes(target.currentPeriodTargetSeconds) || "0h"}
        </span>
        <span>{status ?? `${percent}%`}</span>
      </div>

      <div className="mt-4 border-t border-paper-soft pt-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <b className="text-sm">
            Balance corrections{" "}
            <span className="font-medium text-ink-muted">
              · total {formatSignedDuration(correctionTotal * 3600)}
            </span>
          </b>
          <button type="button" className="btn btn-sm" onClick={() => onAddCorrection(target.id)}>
            + Add
          </button>
        </div>
        {corrections.length === 0 ? (
          <p className="mb-0 mt-2 text-sm text-ink-muted">
            No corrections yet. Add one for vacation, time off or carried-over overtime.
          </p>
        ) : (
          <div className="mt-1.5 flex flex-col text-sm">
            {shownCorrections.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 border-b border-paper-soft py-2.5 last:border-b-0"
              >
                <span className="tabular w-[84px] shrink-0 text-ink-muted">
                  {format(new Date(`${c.date}T00:00:00`), "EEE d MMM")}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate ${c.description ? "" : "italic text-ink-muted"}`}
                >
                  {c.description || "No note"}
                </span>
                <b className="tabular text-correction">{formatSignedDuration(c.hours * 3600)}</b>
                <button
                  type="button"
                  className="btn btn-sm min-h-8 px-2.5 text-[13px]"
                  onClick={() => onEditCorrection(target, c.id)}
                >
                  Edit
                </button>
              </div>
            ))}
            {corrections.length > 5 && (
              <button
                type="button"
                className="mt-1 self-start text-sm font-semibold text-primary-800 hover:underline"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? "Show fewer" : `Show all ${corrections.length}`}
              </button>
            )}
          </div>
        )}
      </div>

      {pastPeriods.length > 0 && (
        <details className="mt-2.5 border-t border-paper-soft pt-3">
          <summary className="min-h-7 cursor-pointer text-sm font-semibold">Past periods</summary>
          <div className="tabular mt-2.5 grid gap-x-5 gap-y-2 text-sm [grid-template-columns:1fr_auto_auto]">
            {pastPeriods.map((p) => (
              <div key={p.periodStart} className="contents">
                <span>
                  {periodLabel(p)}
                  {p.correctionHours !== 0 && (
                    <span className="text-ink-muted">
                      {" "}
                      incl. {formatSignedDuration(p.correctionHours * 3600)} correction
                    </span>
                  )}
                </span>
                <span className="text-ink-muted">
                  {formatDurationHoursMinutes(p.trackedSeconds) || "0h"} / {hoursLabel(p.targetHours)}
                </span>
                <BalanceFigure seconds={p.balanceSeconds} />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export function StatisticsPage() {
  const [preset, setPreset] = useState<Preset>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [clientId, setClientId] = useState("");
  const [correctionDialog, setCorrectionDialog] = useState<Pick<
    CorrectionModalProps,
    "editing" | "defaults"
  > | null>(null);

  const { clients } = useClients();
  const { projects } = useProjects();
  const { targets, isLoading: targetsLoading } = useClientTargets();

  let start: Date | null = null;
  let end: Date | null = null;
  if (preset === "custom") {
    if (customStart) start = startOfDay(new Date(`${customStart}T00:00:00`));
    if (customEnd) end = endOfDay(new Date(`${customEnd}T00:00:00`));
  } else {
    ({ start, end } = presetRange(preset));
  }

  const { data: statistics, isLoading } = useStatistics({
    startDate: start?.toISOString(),
    endDate: end?.toISOString(),
    clientId: clientId || undefined,
  });

  const total = statistics?.totalSeconds ?? 0;
  const count = statistics?.entryCount ?? 0;
  const average = count > 0 ? Math.round(total / count) : 0;
  const percentOf = (seconds: number) => (total > 0 ? Math.round((seconds / total) * 100) : 0);
  const visibleTargets = (targets ?? []).filter((t) => !clientId || t.clientId === clientId);
  const allTargets = targets ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title m-0">Insights &amp; targets</h1>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Time range">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              className={`chip ${preset === p.id ? "chip-on" : ""}`}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={preset === "custom"}
            className={`chip ${preset === "custom" ? "chip-on" : ""}`}
            onClick={() => setPreset("custom")}
          >
            Custom range
          </button>
          <select
            aria-label="Client"
            className="input h-9 w-auto rounded-full pl-3.5 text-sm font-semibold"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">All clients</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {preset === "custom" && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="range-from">
              From
            </label>
            <input
              id="range-from"
              type="date"
              className="input w-auto tabular"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="range-to">
              To
            </label>
            <input
              id="range-to"
              type="date"
              className="input w-auto tabular"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        </div>
      )}

      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {[
          { label: `Total time · ${rangeLabel(preset, start, end)}`, value: formatDurationHoursMinutes(total) || "0h" },
          { label: "Entries", value: String(count) },
          { label: "Average per entry", value: formatDurationHoursMinutes(average) || "0h" },
        ].map((stat) => (
          <div key={stat.label} className="card px-6 py-5">
            <div className="text-[13px] font-semibold text-ink-muted">{stat.label}</div>
            <div className="tabular mt-1.5 text-4xl font-bold">{isLoading ? "…" : stat.value}</div>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <section className="card flex min-w-0 flex-[1_1_420px] flex-col gap-[18px] px-5 py-6 sm:px-7">
          <h2 className="m-0 text-lg font-bold">By project</h2>
          {isLoading ? (
            <Spinner />
          ) : (statistics?.byProject.length ?? 0) === 0 ? (
            <p className="m-0 text-sm text-ink-muted">Nothing tracked in this range.</p>
          ) : (
            statistics?.byProject.map((project) => {
              const clientName = projects?.find((p) => p.id === project.projectId)?.client.name;
              return (
                <div key={project.projectId}>
                  <div className="mb-1.5 flex justify-between gap-3 text-[15px]">
                    <span className="min-w-0 truncate">
                      <b>{project.projectName}</b>
                      {clientName && <span className="text-ink-muted"> · {clientName}</span>}
                    </span>
                    <b className="tabular shrink-0">
                      {formatDurationHoursMinutes(project.totalSeconds) || "0m"}
                    </b>
                  </div>
                  <div className="h-3 overflow-hidden rounded-md bg-paper-hover">
                    <div
                      className="h-full"
                      style={{
                        width: `${percentOf(project.totalSeconds)}%`,
                        backgroundColor: project.projectColor ?? DEFAULT_PROJECT_COLOR,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}

          {(statistics?.byClient.length ?? 0) > 0 && (
            <>
              <h2 className="m-0 mt-3 text-lg font-bold">By client</h2>
              <div className="flex h-10 overflow-hidden rounded-[10px]" role="img" aria-label="Share of time by client">
                {statistics?.byClient.map((c) => (
                  <div
                    key={c.clientId}
                    className="flex items-center overflow-hidden whitespace-nowrap pl-3 text-sm font-semibold text-white"
                    style={{
                      width: `${percentOf(c.totalSeconds)}%`,
                      backgroundColor: clientColor(projects, c.clientId),
                    }}
                    title={`${c.clientName} ${percentOf(c.totalSeconds)}%`}
                  >
                    {percentOf(c.totalSeconds) >= 12 && `${c.clientName} ${percentOf(c.totalSeconds)}%`}
                  </div>
                ))}
              </div>
              <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[13px] text-ink-muted">
                {statistics?.byClient.map((c) => (
                  <li key={c.clientId} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: clientColor(projects, c.clientId) }}
                    />
                    {c.clientName} {percentOf(c.totalSeconds)}%
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="flex min-w-0 flex-[1.2_1_460px] flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-lg font-bold">Targets</h2>
            <Link to="/clients" className="text-sm font-semibold text-primary-800 hover:underline">
              Edit in Clients →
            </Link>
          </div>
          {targetsLoading ? (
            <Spinner />
          ) : visibleTargets.length === 0 ? (
            <div className="card text-sm leading-normal text-ink-muted">
              No targets to show. Set an hourly target for a client under Clients &amp; projects.
            </div>
          ) : (
            visibleTargets.map((target) => (
              <TargetCard
                key={target.id}
                target={target}
                color={clientColor(projects, target.clientId)}
                onAddCorrection={(targetId) => setCorrectionDialog({ defaults: { targetId } })}
                onEditCorrection={(t, correctionId) => {
                  const correction = t.corrections.find((c) => c.id === correctionId);
                  if (correction) {
                    setCorrectionDialog({ editing: { targetId: t.id, correction } });
                  }
                }}
              />
            ))
          )}
        </section>
      </div>

      {correctionDialog && (
        <CorrectionModal
          targets={allTargets}
          editing={correctionDialog.editing}
          defaults={correctionDialog.defaults}
          onClose={() => setCorrectionDialog(null)}
        />
      )}
    </div>
  );
}
