import {
  addDays,
  addMilliseconds,
  differenceInCalendarDays,
  differenceInSeconds,
  endOfDay,
  startOfDay,
  startOfWeek,
} from "date-fns";

export interface WeekSegment {
  dayIndex: number;
  segmentStart: Date;
  segmentEnd: Date;
  startHour: number;
  endHour: number;
  durationSeconds: number;
}

export function getMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function toDecimalHour(date: Date): number {
  return (
    date.getHours() +
    date.getMinutes() / 60 +
    date.getSeconds() / 3600 +
    date.getMilliseconds() / 3600000
  );
}

export function splitIntervalIntoWeekSegments(
  start: Date,
  end: Date,
  weekStart: Date,
): WeekSegment[] {
  const normalizedWeekStart = startOfDay(weekStart);
  const normalizedWeekEnd = endOfDay(addDays(normalizedWeekStart, 6));

  const effectiveStart = start > normalizedWeekStart ? start : normalizedWeekStart;
  const effectiveEnd = end < normalizedWeekEnd ? end : normalizedWeekEnd;

  if (effectiveEnd <= effectiveStart) {
    return [];
  }

  const segments: WeekSegment[] = [];
  let cursor = effectiveStart;

  while (cursor < effectiveEnd) {
    const dayEnd = endOfDay(cursor);
    const segmentEnd = dayEnd < effectiveEnd ? dayEnd : effectiveEnd;
    const dayIndex = differenceInCalendarDays(startOfDay(cursor), normalizedWeekStart);

    if (dayIndex >= 0 && dayIndex <= 6) {
      segments.push({
        dayIndex,
        segmentStart: cursor,
        segmentEnd,
        startHour: toDecimalHour(cursor),
        endHour: toDecimalHour(segmentEnd),
        durationSeconds: Math.max(1, differenceInSeconds(segmentEnd, cursor)),
      });
    }

    cursor = addMilliseconds(segmentEnd, 1);
  }

  return segments;
}

export function splitNetSecondsAcrossSegments(
  totalNetSeconds: number,
  segmentGrossSeconds: number[],
): number[] {
  if (segmentGrossSeconds.length === 0) {
    return [];
  }

  if (totalNetSeconds <= 0) {
    return segmentGrossSeconds.map(() => 0);
  }

  const grossTotal = segmentGrossSeconds.reduce((sum, value) => sum + value, 0);
  if (grossTotal <= 0) {
    return segmentGrossSeconds.map(() => 0);
  }

  const distributed: number[] = [];
  let remaining = totalNetSeconds;

  segmentGrossSeconds.forEach((gross, index) => {
    if (index === segmentGrossSeconds.length - 1) {
      distributed.push(Math.max(0, remaining));
      return;
    }

    const slice = Math.max(0, Math.floor((gross / grossTotal) * totalNetSeconds));
    distributed.push(slice);
    remaining -= slice;
  });

  return distributed;
}
