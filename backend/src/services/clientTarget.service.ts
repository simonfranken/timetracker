import { prisma } from '../prisma/client';
import { NotFoundError, BadRequestError } from '../errors/AppError';
import type { CreateClientTargetInput, UpdateClientTargetInput, CreateCorrectionInput } from '../types';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Day-of-week helpers
// ---------------------------------------------------------------------------

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

/** Returns the UTC day index (0=Sun … 6=Sat) for a YYYY-MM-DD string. */
function dayIndex(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay();
}

/** Checks whether a day-name string (e.g. "MON") is in the working-days array. */
function isWorkingDay(dateStr: string, workingDays: string[]): boolean {
  return workingDays.includes(DAY_NAMES[dayIndex(dateStr)]);
}

/** Adds `n` calendar days to a YYYY-MM-DD string and returns a new YYYY-MM-DD. */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

/** Returns the Monday of the ISO week that contains the given date string. */
function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

/** Returns the Sunday of the ISO week given its Monday date string. */
function getSundayOfWeek(monday: string): string {
  return addDays(monday, 6);
}

/** Returns the first day of the month for a given date string. */
function getMonthStart(dateStr: string): string {
  return dateStr.slice(0, 7) + '-01';
}

/** Returns the last day of the month for a given date string. */
function getMonthEnd(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  // Set to first day of next month then subtract 1 day
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return last.toISOString().split('T')[0];
}

/** Total calendar days in the month containing dateStr. */
function daysInMonth(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00Z');
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

/** Compare two YYYY-MM-DD strings. Returns negative, 0, or positive. */
function cmpDate(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Period enumeration
// ---------------------------------------------------------------------------

interface Period {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

/**
 * Returns the period (start + end) that contains the given date.
 * For weekly: Mon–Sun.
 * For monthly: 1st–last day of month.
 */
function getPeriodForDate(dateStr: string, periodType: 'weekly' | 'monthly'): Period {
  if (periodType === 'weekly') {
    const monday = getMondayOfWeek(dateStr);
    return { start: monday, end: getSundayOfWeek(monday) };
  } else {
    return { start: getMonthStart(dateStr), end: getMonthEnd(dateStr) };
  }
}

/**
 * Returns the start of the NEXT period after `currentPeriodEnd`.
 */
function nextPeriodStart(currentPeriodEnd: string, periodType: 'weekly' | 'monthly'): string {
  if (periodType === 'weekly') {
    return addDays(currentPeriodEnd, 1); // Monday of next week
  } else {
    // First day of next month
    const d = new Date(currentPeriodEnd + 'T00:00:00Z');
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    return next.toISOString().split('T')[0];
  }
}

/**
 * Enumerates all periods from startDate's period through today's period (inclusive).
 */
function enumeratePeriods(startDate: string, periodType: 'weekly' | 'monthly'): Period[] {
  const today = new Date().toISOString().split('T')[0];
  const periods: Period[] = [];

  const firstPeriod = getPeriodForDate(startDate, periodType);
  let cursor = firstPeriod;

  while (cmpDate(cursor.start, today) <= 0) {
    periods.push(cursor);
    const ns = nextPeriodStart(cursor.end, periodType);
    cursor = getPeriodForDate(ns, periodType);
  }

  return periods;
}

// ---------------------------------------------------------------------------
// Working-day counting
// ---------------------------------------------------------------------------

/**
 * Counts working days in [from, to] (both inclusive) matching the given pattern.
 */
function countWorkingDays(from: string, to: string, workingDays: string[]): number {
  if (cmpDate(from, to) > 0) return 0;
  let count = 0;
  let cur = from;
  while (cmpDate(cur, to) <= 0) {
    if (isWorkingDay(cur, workingDays)) count++;
    cur = addDays(cur, 1);
  }
  return count;
}

// ---------------------------------------------------------------------------
// Pro-ration helpers
// ---------------------------------------------------------------------------

/**
 * Returns the pro-rated target hours for the first period, applying §5 of the spec.
 * If startDate falls on the natural first day of the period, no pro-ration occurs.
 */
function computePeriodTargetHours(
  period: Period,
  startDate: string,
  targetHours: number,
  periodType: 'weekly' | 'monthly',
): number {
  const naturalStart = period.start;
  if (cmpDate(startDate, naturalStart) <= 0) {
    // startDate is at or before the natural period start — no pro-ration needed
    return targetHours;
  }

  // startDate is inside the period → pro-rate by calendar days
  const fullDays = periodType === 'weekly' ? 7 : daysInMonth(period.start);
  const remainingDays = daysBetween(startDate, period.end); // inclusive both ends
  return (remainingDays / fullDays) * targetHours;
}

/** Calendar days between two dates (both inclusive). */
function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z').getTime();
  const b = new Date(to + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000) + 1;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface PeriodBalance {
  periodStart: string;
  periodEnd: string;
  targetHours: number;
  trackedSeconds: number;
  correctionHours: number;
  balanceSeconds: number;
  isOngoing: boolean;
  // only when isOngoing = true
  dailyRateHours?: number;
  workingDaysInPeriod?: number;
  elapsedWorkingDays?: number;
  expectedHours?: number;
}

export interface ClientTargetWithBalance {
  id: string;
  clientId: string;
  clientName: string;
  userId: string;
  periodType: 'weekly' | 'monthly';
  targetHours: number;
  workingDays: string[];
  startDate: string;
  createdAt: string;
  updatedAt: string;
  corrections: Array<{
    id: string;
    date: string;
    hours: number;
    description: string | null;
    createdAt: string;
  }>;
  totalBalanceSeconds: number;
  currentPeriodTrackedSeconds: number;
  currentPeriodTargetSeconds: number;
  periods: PeriodBalance[];
  /** True when an active timer is running for a project belonging to this client. */
  hasOngoingTimer: boolean;
}

// ---------------------------------------------------------------------------
// Prisma record shape accepted by computeBalance
// ---------------------------------------------------------------------------

type TargetRecord = {
  id: string;
  clientId: string;
  userId: string;
  targetHours: number;
  periodType: 'WEEKLY' | 'MONTHLY';
  workingDays: string[];
  startDate: Date;
  createdAt: Date;
  updatedAt: Date;
  client: { id: string; name: string };
  corrections: Array<{ id: string; date: Date; hours: number; description: string | null; createdAt: Date }>;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ClientTargetService {
  async findAll(userId: string): Promise<ClientTargetWithBalance[]> {
    const targets = await prisma.clientTarget.findMany({
      where: { userId, deletedAt: null, client: { deletedAt: null } },
      include: {
        client: { select: { id: true, name: true } },
        corrections: { where: { deletedAt: null }, orderBy: { date: 'asc' } },
      },
      orderBy: { client: { name: 'asc' } },
    });

    return Promise.all(targets.map(t => this.computeBalance(t as unknown as TargetRecord)));
  }

  async findById(id: string, userId: string) {
    return prisma.clientTarget.findFirst({
      where: { id, userId, deletedAt: null, client: { deletedAt: null } },
      include: {
        client: { select: { id: true, name: true } },
        corrections: { where: { deletedAt: null }, orderBy: { date: 'asc' } },
      },
    });
  }

  async create(userId: string, data: CreateClientTargetInput): Promise<ClientTargetWithBalance> {
    // Ensure the client belongs to this user and is not soft-deleted
    const client = await prisma.client.findFirst({ where: { id: data.clientId, userId, deletedAt: null } });
    if (!client) {
      throw new NotFoundError('Client not found');
    }

    const startDate = new Date(data.startDate + 'T00:00:00Z');
    const periodType = data.periodType.toUpperCase() as 'WEEKLY' | 'MONTHLY';

    // Check for existing target (unique per user+client)
    const existing = await prisma.clientTarget.findFirst({ where: { userId, clientId: data.clientId } });
    if (existing) {
      if (existing.deletedAt !== null) {
        // Reactivate the soft-deleted target with the new settings
        const reactivated = await prisma.clientTarget.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            targetHours: data.targetHours,
            periodType,
            workingDays: data.workingDays,
            startDate,
          },
          include: {
            client: { select: { id: true, name: true } },
            corrections: { where: { deletedAt: null }, orderBy: { date: 'asc' } },
          },
        });
        return this.computeBalance(reactivated as unknown as TargetRecord);
      }
      throw new BadRequestError('A target already exists for this client. Delete the existing one first or update it.');
    }

    const target = await prisma.clientTarget.create({
      data: {
        userId,
        clientId: data.clientId,
        targetHours: data.targetHours,
        periodType,
        workingDays: data.workingDays,
        startDate,
      },
      include: {
        client: { select: { id: true, name: true } },
        corrections: { where: { deletedAt: null }, orderBy: { date: 'asc' } },
      },
    });

    return this.computeBalance(target as unknown as TargetRecord);
  }

  async update(id: string, userId: string, data: UpdateClientTargetInput): Promise<ClientTargetWithBalance> {
    const existing = await this.findById(id, userId);
    if (!existing) throw new NotFoundError('Client target not found');

    const updateData: {
      targetHours?: number;
      periodType?: 'WEEKLY' | 'MONTHLY';
      workingDays?: string[];
      startDate?: Date;
    } = {};

    if (data.targetHours !== undefined) updateData.targetHours = data.targetHours;
    if (data.periodType !== undefined) updateData.periodType = data.periodType.toUpperCase() as 'WEEKLY' | 'MONTHLY';
    if (data.workingDays !== undefined) updateData.workingDays = data.workingDays;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate + 'T00:00:00Z');

    const updated = await prisma.clientTarget.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true } },
        corrections: { where: { deletedAt: null }, orderBy: { date: 'asc' } },
      },
    });

    return this.computeBalance(updated as unknown as TargetRecord);
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.findById(id, userId);
    if (!existing) throw new NotFoundError('Client target not found');
    await prisma.clientTarget.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addCorrection(targetId: string, userId: string, data: CreateCorrectionInput) {
    const target = await this.findById(targetId, userId);
    if (!target) throw new NotFoundError('Client target not found');

    const correctionDate = new Date(data.date + 'T00:00:00Z');
    const startDate = new Date(target.startDate);
    startDate.setUTCHours(0, 0, 0, 0);

    if (correctionDate < startDate) {
      throw new BadRequestError('Correction date cannot be before the target start date');
    }

    return prisma.balanceCorrection.create({
      data: {
        clientTargetId: targetId,
        date: correctionDate,
        hours: data.hours,
        description: data.description,
      },
    });
  }

  async deleteCorrection(targetId: string, correctionId: string, userId: string): Promise<void> {
    const target = await this.findById(targetId, userId);
    if (!target) throw new NotFoundError('Client target not found');

    const correction = await prisma.balanceCorrection.findFirst({
      where: { id: correctionId, clientTargetId: targetId, deletedAt: null },
    });
    if (!correction) throw new NotFoundError('Correction not found');

    await prisma.balanceCorrection.update({
      where: { id: correctionId },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Balance computation
  // ---------------------------------------------------------------------------

  private async computeBalance(target: TargetRecord): Promise<ClientTargetWithBalance> {
    const startDateStr = target.startDate.toISOString().split('T')[0];
    const periodType = target.periodType.toLowerCase() as 'weekly' | 'monthly';
    const workingDays = target.workingDays;

    const periods = enumeratePeriods(startDateStr, periodType);

    if (periods.length === 0) {
      return this.emptyBalance(target, periodType);
    }

    const overallStart = periods[0].start;
    const overallEnd = periods[periods.length - 1].end;
    const today = new Date().toISOString().split('T')[0];

    // Fetch active timer for this user (if any) and check if it belongs to this client
    const ongoingTimer = await prisma.ongoingTimer.findUnique({
      where: { userId: target.userId },
      include: { project: { select: { clientId: true } } },
    });

    // Elapsed seconds from the active timer attributed to this client target.
    // We only count it if the timer has a project assigned and that project
    // belongs to the same client as this target.
    let ongoingTimerSeconds = 0;
    let ongoingTimerPeriodStart: string | null = null;

    if (
      ongoingTimer &&
      ongoingTimer.projectId !== null &&
      ongoingTimer.project?.clientId === target.clientId
    ) {
      ongoingTimerSeconds = Math.floor(
        (Date.now() - ongoingTimer.startTime.getTime()) / 1000,
      );
      // Determine which period the timer's start time falls into
      const timerDateStr = ongoingTimer.startTime.toISOString().split('T')[0];
      const timerPeriod = getPeriodForDate(timerDateStr, periodType);
      ongoingTimerPeriodStart = timerPeriod.start;
    }

    // Fetch all time tracked for this client across the full range in one query
    type TrackedRow = { period_start: string; tracked_seconds: bigint };

    let trackedRows: TrackedRow[];
    if (periodType === 'weekly') {
      trackedRows = await prisma.$queryRaw<TrackedRow[]>(Prisma.sql`
        SELECT
          TO_CHAR(
            DATE_TRUNC('week', te.start_time AT TIME ZONE 'UTC'),
            'YYYY-MM-DD'
          ) AS period_start,
          COALESCE(
            SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) - (te.break_minutes * 60)),
            0
          )::bigint AS tracked_seconds
        FROM time_entries te
        JOIN projects p ON p.id = te.project_id
        WHERE te.user_id = ${target.userId}
          AND p.client_id = ${target.clientId}
          AND te.start_time >= ${new Date(overallStart + 'T00:00:00Z')}
          AND te.start_time <= ${new Date(overallEnd + 'T23:59:59Z')}
          AND te.deleted_at IS NULL
          AND p.deleted_at IS NULL
        GROUP BY DATE_TRUNC('week', te.start_time AT TIME ZONE 'UTC')
      `);
    } else {
      trackedRows = await prisma.$queryRaw<TrackedRow[]>(Prisma.sql`
        SELECT
          TO_CHAR(
            DATE_TRUNC('month', te.start_time AT TIME ZONE 'UTC'),
            'YYYY-MM-DD'
          ) AS period_start,
          COALESCE(
            SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) - (te.break_minutes * 60)),
            0
          )::bigint AS tracked_seconds
        FROM time_entries te
        JOIN projects p ON p.id = te.project_id
        WHERE te.user_id = ${target.userId}
          AND p.client_id = ${target.clientId}
          AND te.start_time >= ${new Date(overallStart + 'T00:00:00Z')}
          AND te.start_time <= ${new Date(overallEnd + 'T23:59:59Z')}
          AND te.deleted_at IS NULL
          AND p.deleted_at IS NULL
        GROUP BY DATE_TRUNC('month', te.start_time AT TIME ZONE 'UTC')
      `);
    }

    // Map tracked seconds by period start date string
    const trackedByPeriod = new Map<string, number>();
    for (const row of trackedRows) {
      // Normalise: for weekly, Postgres DATE_TRUNC('week') already gives Monday
      const key = typeof row.period_start === 'string'
        ? row.period_start
        : (row.period_start as Date).toISOString().split('T')[0];
      trackedByPeriod.set(key, Number(row.tracked_seconds));
    }

    // Index corrections by period start date
    const correctionsByPeriod = new Map<string, number>();
    for (const c of target.corrections) {
      const corrDateStr = c.date.toISOString().split('T')[0];
      const period = getPeriodForDate(corrDateStr, periodType);
      const key = period.start;
      correctionsByPeriod.set(key, (correctionsByPeriod.get(key) ?? 0) + c.hours);
    }

    const periodBalances: PeriodBalance[] = [];
    let totalBalanceSeconds = 0;
    const isFirstPeriod = (i: number) => i === 0;

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];

      // Effective start for this period (clamped to startDate for first period)
      const effectiveStart = isFirstPeriod(i) && cmpDate(startDateStr, period.start) > 0
        ? startDateStr
        : period.start;

      // Period target hours (with possible pro-ration on the first period)
      const periodTargetHours = isFirstPeriod(i)
        ? computePeriodTargetHours(period, startDateStr, target.targetHours, periodType)
        : target.targetHours;

      // Add ongoing timer seconds to the period it started in (if it belongs to this client)
      const timerContribution =
        ongoingTimerPeriodStart !== null && period.start === ongoingTimerPeriodStart
          ? ongoingTimerSeconds
          : 0;

      const trackedSeconds = (trackedByPeriod.get(period.start) ?? 0) + timerContribution;
      const correctionHours = correctionsByPeriod.get(period.start) ?? 0;

      const isOngoing = cmpDate(period.start, today) <= 0 && cmpDate(today, period.end) <= 0;

      let balanceSeconds: number;
      let extra: Partial<PeriodBalance> = {};

      if (isOngoing) {
        // §6: ongoing period — expected hours based on elapsed working days
        const workingDaysInPeriod = countWorkingDays(effectiveStart, period.end, workingDays);
        const dailyRateHours = workingDaysInPeriod > 0 ? periodTargetHours / workingDaysInPeriod : 0;

        const elapsedEnd = today < period.end ? today : period.end;
        const elapsedWorkingDays = countWorkingDays(effectiveStart, elapsedEnd, workingDays);
        const expectedHours = elapsedWorkingDays * dailyRateHours;

        // Only count corrections up to and including today — future corrections
        // within the ongoing period must not be counted until those days have elapsed,
        // otherwise a +8h correction for tomorrow inflates the balance immediately.
        const correctionHoursToDate = target.corrections.reduce((sum, c) => {
          const d = c.date.toISOString().split('T')[0];
          if (cmpDate(d, effectiveStart) >= 0 && cmpDate(d, today) <= 0) {
            return sum + c.hours;
          }
          return sum;
        }, 0);

        balanceSeconds = Math.round(
          (trackedSeconds + correctionHoursToDate * 3600) - expectedHours * 3600,
        );

        extra = {
          dailyRateHours,
          workingDaysInPeriod,
          elapsedWorkingDays,
          expectedHours,
        };
      } else {
        // §4: completed period — simple formula
        balanceSeconds = Math.round(
          (trackedSeconds + correctionHours * 3600) - periodTargetHours * 3600,
        );
      }

      totalBalanceSeconds += balanceSeconds;

      periodBalances.push({
        periodStart: period.start,
        periodEnd: period.end,
        targetHours: periodTargetHours,
        trackedSeconds,
        correctionHours,
        balanceSeconds,
        isOngoing,
        ...extra,
      });
    }

    const currentPeriod = periodBalances.find(p => p.isOngoing) ?? periodBalances[periodBalances.length - 1];

    return {
      id: target.id,
      clientId: target.clientId,
      clientName: target.client.name,
      userId: target.userId,
      periodType,
      targetHours: target.targetHours,
      workingDays,
      startDate: startDateStr,
      createdAt: target.createdAt.toISOString(),
      updatedAt: target.updatedAt.toISOString(),
      corrections: target.corrections.map(c => ({
        id: c.id,
        date: c.date.toISOString().split('T')[0],
        hours: c.hours,
        description: c.description,
        createdAt: c.createdAt.toISOString(),
      })),
      totalBalanceSeconds,
      currentPeriodTrackedSeconds: currentPeriod?.trackedSeconds ?? 0,
      currentPeriodTargetSeconds: currentPeriod
        ? Math.round(currentPeriod.targetHours * 3600)
        : Math.round(target.targetHours * 3600),
      periods: periodBalances,
      hasOngoingTimer: ongoingTimerSeconds > 0,
    };
  }

  private emptyBalance(target: TargetRecord, periodType: 'weekly' | 'monthly'): ClientTargetWithBalance {
    return {
      id: target.id,
      clientId: target.clientId,
      clientName: target.client.name,
      userId: target.userId,
      periodType,
      targetHours: target.targetHours,
      workingDays: target.workingDays,
      startDate: target.startDate.toISOString().split('T')[0],
      createdAt: target.createdAt.toISOString(),
      updatedAt: target.updatedAt.toISOString(),
      corrections: [],
      totalBalanceSeconds: 0,
      currentPeriodTrackedSeconds: 0,
      currentPeriodTargetSeconds: Math.round(target.targetHours * 3600),
      periods: [],
      hasOngoingTimer: false,
    };
  }
}
