import { format, parseISO, differenceInSeconds } from "date-fns";

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "HH:mm");
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy h:mm a");
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) {
    parts.push(hours.toString().padStart(2, "0"));
  }
  parts.push(minutes.toString().padStart(2, "0"));
  parts.push(seconds.toString().padStart(2, "0"));

  return parts.join(":");
}

export function formatDurationHoursMinutes(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function calculateDuration(startTime: string, endTime: string): number {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  return differenceInSeconds(end, start);
}

export function formatDurationFromDates(
  startTime: string,
  endTime: string,
): string {
  const seconds = calculateDuration(startTime, endTime);
  return formatDuration(seconds);
}

export function formatDurationFromDatesHoursMinutes(
  startTime: string,
  endTime: string,
): string {
  const seconds = calculateDuration(startTime, endTime);
  return formatDurationHoursMinutes(seconds);
}

export function getLocalISOString(date: Date = new Date()): string {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localISOTime = new Date(date.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
  return localISOTime;
}

export function toISOTimezone(dateStr: string): string {
  // Convert a local datetime input to ISO string with timezone
  const date = new Date(dateStr);
  return date.toISOString();
}
