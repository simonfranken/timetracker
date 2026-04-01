import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, addWeeks, endOfDay, format, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WeekCalendar, type WeekCalendarBlock } from "@/components/WeekCalendar";
import { TimeEntryFormModal } from "@/components/TimeEntryFormModal";
import { OngoingTimerEditModal } from "@/components/OngoingTimerEditModal";
import { Spinner } from "@/components/Spinner";
import { timeEntriesApi } from "@/api/timeEntries";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useTimer } from "@/contexts/TimerContext";
import {
  formatDurationHoursMinutes,
  formatTime,
} from "@/utils/dateUtils";
import {
  getMonday,
  splitIntervalIntoWeekSegments,
  splitNetSecondsAcrossSegments,
} from "@/utils/calendarUtils";
import type { TimeEntry } from "@/types";

interface CalendarPageProps {
  weekStart?: Date;
}

async function fetchWeekEntries(weekStart: Date): Promise<TimeEntry[]> {
  const weekStartDay = startOfDay(weekStart);
  const weekEndDay = endOfDay(addDays(weekStartDay, 6));
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

export function CalendarPage({ weekStart: initialWeekStart }: CalendarPageProps) {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getMonday(initialWeekStart ?? new Date()),
  );
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);

  const { createTimeEntry, updateTimeEntry } = useTimeEntries(undefined, { enabled: false });
  const { ongoingTimer, elapsedSeconds } = useTimer();

  const weekEntriesQuery = useQuery({
    queryKey: ["calendarWeekEntries", weekStart.toISOString()],
    queryFn: () => fetchWeekEntries(weekStart),
  });

  const weekEntries = weekEntriesQuery.data ?? [];

  const {
    blocks,
    dayTotals,
    blockClickMap,
  }: {
    blocks: WeekCalendarBlock[];
    dayTotals: string[];
    blockClickMap: Map<string, { type: "entry"; entry: TimeEntry } | { type: "timer" }>;
  } = useMemo(() => {
    const nextBlocks: WeekCalendarBlock[] = [];
    const nextMap = new Map<string, { type: "entry"; entry: TimeEntry } | { type: "timer" }>();
    const totalsInSeconds = Array.from({ length: 7 }, () => 0);

    for (const entry of weekEntries) {
      const start = new Date(entry.startTime);
      const end = new Date(entry.endTime);
      const grossSeconds = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 1000));
      const netSeconds = Math.max(0, grossSeconds - entry.breakMinutes * 60);
      const segments = splitIntervalIntoWeekSegments(start, end, weekStart);
      const netBySegment = splitNetSecondsAcrossSegments(
        netSeconds,
        segments.map((segment) => segment.durationSeconds),
      );

      segments.forEach((segment, index) => {
        totalsInSeconds[segment.dayIndex] += netBySegment[index] ?? 0;

        const blockId = `${entry.id}__${segment.dayIndex}__${index}`;
        const timeLabel = `${formatTime(segment.segmentStart)} - ${formatTime(segment.segmentEnd)}`;

        nextBlocks.push({
          id: blockId,
          startHour: segment.startHour,
          endHour: segment.endHour,
          dayIndex: segment.dayIndex,
          color: entry.project.color ?? "#6b7280",
          title: entry.project.name,
          subtitle: entry.project.client.name,
          label: timeLabel,
          tooltip: entry.description
            ? `${entry.project.name} (${timeLabel})\n${entry.description}`
            : `${entry.project.name} (${timeLabel})`,
        });

        nextMap.set(blockId, { type: "entry", entry });
      });
    }

    if (ongoingTimer) {
      const start = new Date(ongoingTimer.startTime);
      const end = new Date(start.getTime() + elapsedSeconds * 1000);
      const segments = splitIntervalIntoWeekSegments(start, end, weekStart);

      segments.forEach((segment, index) => {
        totalsInSeconds[segment.dayIndex] += segment.durationSeconds;

        const blockId = `running-timer__${segment.dayIndex}__${index}`;
        const timeLabel = `${formatTime(segment.segmentStart)} - ${formatTime(segment.segmentEnd)}`;

        nextBlocks.push({
          id: blockId,
          startHour: segment.startHour,
          endHour: segment.endHour,
          dayIndex: segment.dayIndex,
          color: ongoingTimer.project?.color ?? "#2563eb",
          title: ongoingTimer.project?.name ?? "Running timer",
          subtitle: ongoingTimer.project?.client.name,
          label: `${formatDurationHoursMinutes(elapsedSeconds)} (${timeLabel})`,
          tooltip: `Running timer (${timeLabel})`,
          isActive: true,
        });

        nextMap.set(blockId, { type: "timer" });
      });
    }

    const formattedTotals = totalsInSeconds.map((seconds) =>
      seconds <= 0 ? "0h" : formatDurationHoursMinutes(seconds),
    );

    return {
      blocks: nextBlocks,
      dayTotals: formattedTotals,
      blockClickMap: nextMap,
    };
  }, [elapsedSeconds, ongoingTimer, weekEntries, weekStart]);

  const weekLabel = `${format(weekStart, "MMM d")} - ${format(addDays(weekStart, 6), "MMM d, yyyy")}`;

  const handleBlockClick = (blockId: string) => {
    const target = blockClickMap.get(blockId);
    if (!target) {
      return;
    }

    if (target.type === "timer") {
      setIsTimerModalOpen(true);
      return;
    }

    setEditingEntry(target.entry);
  };

  if (weekEntriesQuery.isLoading) {
    return <Spinner />;
  }

  if (weekEntriesQuery.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load calendar entries.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Week</div>
          <div className="text-lg font-semibold text-gray-900">{weekLabel}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setWeekStart((current) => addWeeks(current, -1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Prev
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setWeekStart(getMonday(new Date()))}
          >
            Today
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setWeekStart((current) => addWeeks(current, 1))}
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <WeekCalendar
          weekStart={weekStart}
          blocks={blocks}
          onBlockClick={handleBlockClick}
          dayTotals={dayTotals}
        />
      </div>

      {editingEntry && (
        <TimeEntryFormModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          createTimeEntry={createTimeEntry}
          updateTimeEntry={updateTimeEntry}
        />
      )}

      {isTimerModalOpen && <OngoingTimerEditModal onClose={() => setIsTimerModalOpen(false)} />}

      <div className="shrink-0 text-xs text-gray-500">
        Tip: use arrow keys to move between entries and press Enter to edit the focused block.
      </div>
    </div>
  );
}
