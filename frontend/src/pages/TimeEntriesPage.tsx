import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  format,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Diff } from "lucide-react";
import {
  WeekCalendar,
  type WeekCalendarBlock,
  type WeekCalendarCorrection,
} from "@/components/WeekCalendar";
import {
  TimeEntryFormModal,
  type NewEntryDefaults,
} from "@/components/TimeEntryFormModal";
import { CorrectionModal, type CorrectionModalProps } from "@/components/CorrectionModal";
import { OngoingTimerEditModal } from "@/components/OngoingTimerEditModal";
import { Spinner } from "@/components/Spinner";
import { timeEntriesApi } from "@/api/timeEntries";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useClientTargets } from "@/hooks/useClientTargets";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useTimer } from "@/contexts/TimerContext";
import {
  formatDurationHoursMinutes,
  formatSignedDuration,
  formatTime,
} from "@/utils/dateUtils";
import {
  getMonday,
  splitIntervalIntoWeekSegments,
  splitNetSecondsAcrossSegments,
} from "@/utils/calendarUtils";
import { DEFAULT_PROJECT_COLOR, projectTint } from "@/utils/colorUtils";
import type { BalanceCorrection, ClientTargetWithBalance, TimeEntry } from "@/types";

type View = "week" | "list";

type BlockTarget = { type: "entry"; entry: TimeEntry } | { type: "timer" };

interface CorrectionRef {
  target: ClientTargetWithBalance;
  correction: BalanceCorrection;
}

async function fetchWeekEntries(weekStart: Date): Promise<TimeEntry[]> {
  const weekStartDay = startOfDay(weekStart);
  const weekEndDay = endOfDay(addDays(weekStartDay, 6));
  // One day earlier so entries running past midnight into the week are included
  const fetchStart = startOfDay(addDays(weekStartDay, -1));

  const entries: TimeEntry[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await timeEntriesApi.getAll({
      startDate: fetchStart.toISOString(),
      endDate: weekEndDay.toISOString(),
      page,
      limit: 100,
    });
    entries.push(...response.entries);
    totalPages = response.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);

  return entries;
}

function weekTitle(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  if (weekStart.getMonth() === end.getMonth() && weekStart.getFullYear() === end.getFullYear()) {
    return `${format(weekStart, "d")} – ${format(end, "d MMM yyyy")}`;
  }
  return `${format(weekStart, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

function hourToTime(hour: number): string {
  const total = Math.round(hour * 60);
  const h = Math.min(23, Math.floor(total / 60));
  const m = total >= 24 * 60 ? 59 : total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function correctionDayIndex(correction: BalanceCorrection, weekStart: Date): number {
  return differenceInCalendarDays(new Date(`${correction.date}T00:00:00`), weekStart);
}

export function TimeEntriesPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [view, setView] = useState<View>("week");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");

  const [entryDialog, setEntryDialog] = useState<{
    entry: TimeEntry | null;
    defaults?: NewEntryDefaults;
  } | null>(null);
  const [correctionDialog, setCorrectionDialog] = useState<Pick<
    CorrectionModalProps,
    "editing" | "defaults"
  > | null>(null);
  const [timerModalOpen, setTimerModalOpen] = useState(false);

  const { createTimeEntry, updateTimeEntry, deleteTimeEntry } = useTimeEntries(undefined, {
    enabled: false,
  });
  const { targets } = useClientTargets();
  const { clients } = useClients();
  const { projects } = useProjects();
  const { ongoingTimer, elapsedSeconds } = useTimer();

  const weekEntriesQuery = useQuery({
    queryKey: ["calendarWeekEntries", weekStart.toISOString()],
    queryFn: () => fetchWeekEntries(weekStart),
  });

  const visibleProjects = clientId
    ? (projects ?? []).filter((p) => p.clientId === clientId)
    : (projects ?? []);
  const effectiveClientId =
    clientId || (projectId ? projects?.find((p) => p.id === projectId)?.clientId : "") || "";

  const { blocks, dayTotals, blockTargets, trackedSeconds } = useMemo(() => {
    const nextBlocks: WeekCalendarBlock[] = [];
    const nextTargets = new Map<string, BlockTarget>();
    const totals = Array.from({ length: 7 }, () => 0);

    const entries = (weekEntriesQuery.data ?? []).filter(
      (entry) =>
        (!clientId || entry.project.client.id === clientId) &&
        (!projectId || entry.projectId === projectId),
    );

    for (const entry of entries) {
      const start = new Date(entry.startTime);
      const end = new Date(entry.endTime);
      const grossSeconds = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 1000));
      const netSeconds = Math.max(0, grossSeconds - entry.breakMinutes * 60);
      const segments = splitIntervalIntoWeekSegments(start, end, weekStart);
      const netBySegment = splitNetSecondsAcrossSegments(
        netSeconds,
        segments.map((segment) => segment.durationSeconds),
      );
      const tint = projectTint(entry.project.color);

      segments.forEach((segment, index) => {
        totals[segment.dayIndex] += netBySegment[index] ?? 0;
        const id = `${entry.id}__${segment.dayIndex}__${index}`;
        const label = `${formatTime(segment.segmentStart)}–${formatTime(segment.segmentEnd)}`;
        nextBlocks.push({
          id,
          startHour: segment.startHour,
          endHour: segment.endHour,
          dayIndex: segment.dayIndex,
          background: tint.bg,
          foreground: tint.fg,
          accent: tint.mark,
          title: entry.project.name,
          subtitle: entry.project.client.name,
          label,
          tooltip: entry.description
            ? `${entry.project.name} (${label})\n${entry.description}`
            : `${entry.project.name} (${label})`,
        });
        nextTargets.set(id, { type: "entry", entry });
      });
    }

    const timerMatchesFilter =
      ongoingTimer &&
      (!clientId || ongoingTimer.project?.client.id === clientId) &&
      (!projectId || ongoingTimer.projectId === projectId);

    if (ongoingTimer && timerMatchesFilter) {
      const start = new Date(ongoingTimer.startTime);
      const end = new Date(start.getTime() + elapsedSeconds * 1000);
      const tint = projectTint(ongoingTimer.project?.color ?? DEFAULT_PROJECT_COLOR);
      splitIntervalIntoWeekSegments(start, end, weekStart).forEach((segment, index) => {
        totals[segment.dayIndex] += segment.durationSeconds;
        const id = `running-timer__${segment.dayIndex}__${index}`;
        const label = `${formatDurationHoursMinutes(elapsedSeconds) || "0m"} · ${formatTime(
          segment.segmentStart,
        )}–${formatTime(segment.segmentEnd)}`;
        nextBlocks.push({
          id,
          startHour: segment.startHour,
          endHour: segment.endHour,
          dayIndex: segment.dayIndex,
          background: tint.bg,
          foreground: tint.fg,
          accent: tint.mark,
          title: ongoingTimer.project?.name ?? "Running timer",
          subtitle: ongoingTimer.project?.client.name,
          label,
          tooltip: `Running timer (${label})`,
          isActive: true,
        });
        nextTargets.set(id, { type: "timer" });
      });
    }

    return {
      blocks: nextBlocks,
      dayTotals: totals,
      blockTargets: nextTargets,
      trackedSeconds: totals.reduce((sum, value) => sum + value, 0),
    };
  }, [clientId, elapsedSeconds, ongoingTimer, projectId, weekEntriesQuery.data, weekStart]);

  const { calendarCorrections, correctionRefs, correctionDayHours, correctionHours } = useMemo(() => {
    const refs = new Map<string, CorrectionRef>();
    const items: WeekCalendarCorrection[] = [];
    const perDay = Array.from({ length: 7 }, () => 0);

    for (const target of targets ?? []) {
      if (effectiveClientId && target.clientId !== effectiveClientId) continue;
      for (const correction of target.corrections) {
        if (correction.deletedAt) continue;
        const dayIndex = correctionDayIndex(correction, weekStart);
        if (dayIndex < 0 || dayIndex > 6) continue;
        refs.set(correction.id, { target, correction });
        perDay[dayIndex] += correction.hours;
        items.push({
          id: correction.id,
          dayIndex,
          label: `${correction.description || "Correction"} · ${target.clientName}`,
          hoursLabel: formatSignedDuration(correction.hours * 3600),
        });
      }
    }

    return {
      calendarCorrections: items,
      correctionRefs: refs,
      correctionDayHours: perDay,
      correctionHours: perDay.reduce((sum, value) => sum + value, 0),
    };
  }, [effectiveClientId, targets, weekStart]);

  const handleBlockClick = (blockId: string) => {
    const target = blockTargets.get(blockId);
    if (!target) return;
    if (target.type === "timer") {
      setTimerModalOpen(true);
    } else {
      setEntryDialog({ entry: target.entry });
    }
  };

  const openCorrection = (id: string) => {
    const ref = correctionRefs.get(id);
    if (ref) {
      setCorrectionDialog({ editing: { targetId: ref.target.id, correction: ref.correction } });
    }
  };

  const defaultProjectId =
    projectId ||
    (weekEntriesQuery.data
      ? [...weekEntriesQuery.data].sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
        )[0]?.projectId
      : undefined);

  const openNewEntry = (date: Date, start: string, end: string) =>
    setEntryDialog({ entry: null, defaults: { date, start, end, projectId: defaultProjectId } });

  const openNewCorrection = (date: Date) =>
    setCorrectionDialog({
      defaults: {
        date: format(date, "yyyy-MM-dd"),
        targetId: (targets ?? []).find((t) => t.clientId === effectiveClientId)?.id,
      },
    });

  const listGroups = useMemo(() => {
    const entries = (weekEntriesQuery.data ?? []).filter(
      (entry) =>
        (!clientId || entry.project.client.id === clientId) &&
        (!projectId || entry.projectId === projectId),
    );
    return Array.from({ length: 7 }, (_, i) => 6 - i)
      .map((dayIndex) => {
        const date = addDays(weekStart, dayIndex);
        const day = format(date, "yyyy-MM-dd");
        const dayEntries = entries
          .filter((e) => format(new Date(e.startTime), "yyyy-MM-dd") === day)
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        const dayCorrections = calendarCorrections.filter((c) => c.dayIndex === dayIndex);
        return { dayIndex, date, entries: dayEntries, corrections: dayCorrections };
      })
      .filter((g) => g.entries.length > 0 || g.corrections.length > 0);
  }, [calendarCorrections, clientId, projectId, weekEntriesQuery.data, weekStart]);

  const dayTotalLabels = dayTotals.map((s) => (s > 0 ? formatDurationHoursMinutes(s) : ""));
  const dayCorrectionLabels = correctionDayHours.map((h, i) =>
    h !== 0 ? `${dayTotals[i] > 0 ? "+ " : ""}${formatSignedDuration(h * 3600).replace("+", "")}` : "",
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-[28px] font-bold">{weekTitle(weekStart)}</h1>
          <div className="flex gap-1.5">
            <button
              type="button"
              className="btn w-11 px-0"
              aria-label="Previous week"
              onClick={() => setWeekStart((current) => addWeeks(current, -1))}
            >
              <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
            </button>
            <button type="button" className="btn" onClick={() => setWeekStart(getMonday(new Date()))}>
              This week
            </button>
            <button
              type="button"
              className="btn w-11 px-0"
              aria-label="Next week"
              onClick={() => setWeekStart((current) => addWeeks(current, 1))}
            >
              <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="segmented" role="group" aria-label="View">
            {(["week", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                className={`segmented-item ${view === v ? "segmented-item-on" : ""}`}
                onClick={() => setView(v)}
              >
                {v === "week" ? "Week" : "List"}
              </button>
            ))}
          </div>
          <button type="button" className="btn" onClick={() => openNewCorrection(new Date())}>
            <Diff className="h-[18px] w-[18px]" aria-hidden="true" />
            Correction
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => openNewEntry(new Date(), "09:00", "10:00")}
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
            Add entry
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2.5">
        <select
          aria-label="Client"
          className="input h-10 w-auto text-sm"
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setProjectId("");
          }}
        >
          <option value="">All clients</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Project"
          className="input h-10 w-auto text-sm"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">All projects</option>
          {visibleProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="text-sm text-ink-muted sm:ml-auto">
          Tracked <b className="tabular text-ink">{formatDurationHoursMinutes(trackedSeconds) || "0h"}</b> ·
          Corrections{" "}
          <b className="tabular text-correction">{formatSignedDuration(correctionHours * 3600)}</b> · Counts
          toward targets{" "}
          <b className="tabular text-ink">
            {formatDurationHoursMinutes(Math.max(0, trackedSeconds + correctionHours * 3600)) || "0h"}
          </b>
        </span>
      </div>

      {weekEntriesQuery.isLoading ? (
        <Spinner />
      ) : weekEntriesQuery.error ? (
        <div className="callout-error" role="alert">
          Failed to load time entries.
        </div>
      ) : view === "week" ? (
        <>
          <WeekCalendar
            weekStart={weekStart}
            blocks={blocks}
            corrections={calendarCorrections}
            dayTotals={dayTotalLabels}
            dayCorrectionTotals={dayCorrectionLabels}
            onBlockClick={handleBlockClick}
            onCorrectionClick={openCorrection}
            onAddCorrection={(dayIndex) => openNewCorrection(addDays(weekStart, dayIndex))}
            onSelectRange={(dayIndex, start, end) =>
              openNewEntry(addDays(weekStart, dayIndex), hourToTime(start), hourToTime(end))
            }
          />
          <p className="m-0 text-[13px] text-ink-muted">
            Click an empty slot for a 1-hour entry, or drag to pick start and end. Click an entry to edit it.
            Hover the <b>±</b> row to add a balance correction for that day.
          </p>
        </>
      ) : (
        <section className="card px-5 pb-4 pt-2 sm:px-6">
          {listGroups.length === 0 && (
            <p className="py-6 text-[15px] text-ink-muted">Nothing tracked this week.</p>
          )}
          {listGroups.map((group) => {
            const dayNet = dayTotals[group.dayIndex];
            const dayCorr = correctionDayHours[group.dayIndex];
            return (
              <div key={group.dayIndex}>
                <h3 className="eyebrow mb-1 mt-4">
                  {format(group.date, "EEE d MMM")}
                  {dayNet > 0 ? ` · ${formatDurationHoursMinutes(dayNet)}` : ""}{" "}
                  {dayCorr !== 0 && (
                    <span className="text-correction">
                      {dayNet > 0 ? "+ " : "· "}
                      {formatSignedDuration(dayCorr * 3600).replace("+", "")} correction
                    </span>
                  )}
                </h3>
                {group.corrections.map((c) => (
                  <div key={c.id} className="row-divider flex flex-wrap items-center gap-3.5 py-3">
                    <span
                      className="h-9 w-2.5 shrink-0 rounded-[5px]"
                      style={{
                        background:
                          "repeating-linear-gradient(135deg,#6E8FC9 0 3px,#EEF3FB 3px 6px)",
                      }}
                    />
                    <div className="min-w-[200px] flex-1">
                      <b>{c.label.split(" · ")[0]}</b>
                      <div className="text-[13px] text-ink-muted">
                        Balance correction · {c.label.split(" · ").slice(1).join(" · ")}
                      </div>
                    </div>
                    <b className="tabular min-w-16 text-right text-correction">{c.hoursLabel}</b>
                    <button type="button" className="btn btn-sm" onClick={() => openCorrection(c.id)}>
                      Edit
                    </button>
                  </div>
                ))}
                {group.entries.map((entry) => {
                  const seconds = Math.max(
                    0,
                    (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 1000 -
                      entry.breakMinutes * 60,
                  );
                  return (
                    <div key={entry.id} className="row-divider flex flex-wrap items-center gap-3.5 py-3">
                      <span
                        className="h-9 w-2.5 shrink-0 rounded-[5px]"
                        style={{ backgroundColor: entry.project.color ?? DEFAULT_PROJECT_COLOR }}
                      />
                      <div className="min-w-[200px] flex-1">
                        <b>{entry.project.name}</b>
                        <div className="text-[13px] text-ink-muted">
                          {entry.project.client.name}
                          {entry.breakMinutes ? ` · break ${entry.breakMinutes}m` : ""}
                          {entry.description ? ` · ${entry.description}` : ""}
                        </div>
                      </div>
                      <span className="tabular text-sm text-ink-muted">
                        {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                      </span>
                      <b className="tabular min-w-16 text-right">
                        {formatDurationHoursMinutes(seconds) || "0m"}
                      </b>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setEntryDialog({ entry })}
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </section>
      )}

      {entryDialog && (
        <TimeEntryFormModal
          entry={entryDialog.entry}
          defaults={entryDialog.defaults}
          onClose={() => setEntryDialog(null)}
          createTimeEntry={createTimeEntry}
          updateTimeEntry={updateTimeEntry}
          onDelete={async (entry) => {
            await deleteTimeEntry.mutateAsync(entry.id);
          }}
        />
      )}
      {correctionDialog && (
        <CorrectionModal
          targets={targets ?? []}
          editing={correctionDialog.editing}
          defaults={correctionDialog.defaults}
          onClose={() => setCorrectionDialog(null)}
        />
      )}
      {timerModalOpen && <OngoingTimerEditModal onClose={() => setTimerModalOpen(false)} />}
    </div>
  );
}
