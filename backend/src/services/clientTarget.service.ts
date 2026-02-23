import { prisma } from '../prisma/client';
import { NotFoundError, BadRequestError } from '../errors/AppError';
import type { CreateClientTargetInput, UpdateClientTargetInput, CreateCorrectionInput } from '../types';
import { Prisma } from '@prisma/client';

// Returns the Monday of the week containing the given date
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Returns the Sunday (end of week) for a given Monday
function getSundayOfWeek(monday: Date): Date {
  const d = new Date(monday);
  d.setUTCDate(d.getUTCDate() + 6);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// Returns all Mondays from startDate up to and including the current week's Monday
function getWeekMondays(startDate: Date): Date[] {
  const mondays: Date[] = [];
  const currentMonday = getMondayOfWeek(new Date());
  let cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor <= currentMonday) {
    mondays.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return mondays;
}

interface WeekBalance {
  weekStart: string; // ISO date string (Monday)
  weekEnd: string;   // ISO date string (Sunday)
  trackedSeconds: number;
  targetSeconds: number;
  correctionHours: number;
  balanceSeconds: number; // positive = overtime, negative = undertime
}

export interface ClientTargetWithBalance {
  id: string;
  clientId: string;
  clientName: string;
  userId: string;
  weeklyHours: number;
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
  totalBalanceSeconds: number; // running total across all weeks
  currentWeekTrackedSeconds: number;
  currentWeekTargetSeconds: number;
  weeks: WeekBalance[];
}

export class ClientTargetService {
  async findAll(userId: string): Promise<ClientTargetWithBalance[]> {
    const targets = await prisma.clientTarget.findMany({
      where: { userId, client: { deletedAt: null } },
      include: {
        client: { select: { id: true, name: true } },
        corrections: { orderBy: { date: 'asc' } },
      },
      orderBy: { client: { name: 'asc' } },
    });

    return Promise.all(targets.map(t => this.computeBalance(t)));
  }

  async findById(id: string, userId: string) {
    return prisma.clientTarget.findFirst({
      where: { id, userId, client: { deletedAt: null } },
      include: {
        client: { select: { id: true, name: true } },
        corrections: { orderBy: { date: 'asc' } },
      },
    });
  }

  async create(userId: string, data: CreateClientTargetInput): Promise<ClientTargetWithBalance> {
    // Validate startDate is a Monday
    const startDate = new Date(data.startDate + 'T00:00:00Z');
    const dayOfWeek = startDate.getUTCDay();
    if (dayOfWeek !== 1) {
      throw new BadRequestError('startDate must be a Monday');
    }

    // Ensure the client belongs to this user and is not soft-deleted
    const client = await prisma.client.findFirst({ where: { id: data.clientId, userId, deletedAt: null } });
    if (!client) {
      throw new NotFoundError('Client not found');
    }

    // Check for existing target (unique per user+client)
    const existing = await prisma.clientTarget.findFirst({ where: { userId, clientId: data.clientId } });
    if (existing) {
      throw new BadRequestError('A target already exists for this client. Delete the existing one first or update it.');
    }

    const target = await prisma.clientTarget.create({
      data: {
        userId,
        clientId: data.clientId,
        weeklyHours: data.weeklyHours,
        startDate,
      },
      include: {
        client: { select: { id: true, name: true } },
        corrections: { orderBy: { date: 'asc' } },
      },
    });

    return this.computeBalance(target);
  }

  async update(id: string, userId: string, data: UpdateClientTargetInput): Promise<ClientTargetWithBalance> {
    const existing = await this.findById(id, userId);
    if (!existing) throw new NotFoundError('Client target not found');

    const updateData: { weeklyHours?: number; startDate?: Date } = {};

    if (data.weeklyHours !== undefined) {
      updateData.weeklyHours = data.weeklyHours;
    }

    if (data.startDate !== undefined) {
      const startDate = new Date(data.startDate + 'T00:00:00Z');
      if (startDate.getUTCDay() !== 1) {
        throw new BadRequestError('startDate must be a Monday');
      }
      updateData.startDate = startDate;
    }

    const updated = await prisma.clientTarget.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true } },
        corrections: { orderBy: { date: 'asc' } },
      },
    });

    return this.computeBalance(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.findById(id, userId);
    if (!existing) throw new NotFoundError('Client target not found');
    await prisma.clientTarget.delete({ where: { id } });
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
      where: { id: correctionId, clientTargetId: targetId },
    });
    if (!correction) throw new NotFoundError('Correction not found');

    await prisma.balanceCorrection.delete({ where: { id: correctionId } });
  }

  private async computeBalance(target: {
    id: string;
    clientId: string;
    userId: string;
    weeklyHours: number;
    startDate: Date;
    createdAt: Date;
    updatedAt: Date;
    client: { id: string; name: string };
    corrections: Array<{ id: string; date: Date; hours: number; description: string | null; createdAt: Date }>;
  }): Promise<ClientTargetWithBalance> {
    const mondays = getWeekMondays(target.startDate);

    if (mondays.length === 0) {
      return this.emptyBalance(target);
    }

    // Fetch all tracked time for this user on this client's projects in one query
    // covering startDate to end of current week
    const periodStart = mondays[0];
    const periodEnd = getSundayOfWeek(mondays[mondays.length - 1]);

    type TrackedRow = { week_start: Date; tracked_seconds: bigint };

    const rows = await prisma.$queryRaw<TrackedRow[]>(Prisma.sql`
      SELECT
        DATE_TRUNC('week', te.start_time AT TIME ZONE 'UTC') AS week_start,
        COALESCE(SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) - (te.break_minutes * 60)), 0)::bigint AS tracked_seconds
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id
      WHERE te.user_id = ${target.userId}
        AND p.client_id = ${target.clientId}
        AND te.start_time >= ${periodStart}
        AND te.start_time <= ${periodEnd}
        AND te.deleted_at IS NULL
        AND p.deleted_at IS NULL
      GROUP BY DATE_TRUNC('week', te.start_time AT TIME ZONE 'UTC')
    `);

    // Index tracked seconds by week start (ISO Monday string)
    const trackedByWeek = new Map<string, number>();
    for (const row of rows) {
      // DATE_TRUNC with 'week' gives Monday in Postgres (ISO week)
      const monday = getMondayOfWeek(new Date(row.week_start));
      const key = monday.toISOString().split('T')[0];
      trackedByWeek.set(key, Number(row.tracked_seconds));
    }

    // Index corrections by week
    const correctionsByWeek = new Map<string, number>();
    for (const c of target.corrections) {
      const monday = getMondayOfWeek(new Date(c.date));
      const key = monday.toISOString().split('T')[0];
      correctionsByWeek.set(key, (correctionsByWeek.get(key) ?? 0) + c.hours);
    }

    const targetSecondsPerWeek = target.weeklyHours * 3600;
    const weeks: WeekBalance[] = [];
    let totalBalanceSeconds = 0;

    for (const monday of mondays) {
      const key = monday.toISOString().split('T')[0];
      const sunday = getSundayOfWeek(monday);
      const trackedSeconds = trackedByWeek.get(key) ?? 0;
      const correctionHours = correctionsByWeek.get(key) ?? 0;
      const effectiveTargetSeconds = targetSecondsPerWeek - correctionHours * 3600;
      const balanceSeconds = trackedSeconds - effectiveTargetSeconds;
      totalBalanceSeconds += balanceSeconds;

      weeks.push({
        weekStart: key,
        weekEnd: sunday.toISOString().split('T')[0],
        trackedSeconds,
        targetSeconds: effectiveTargetSeconds,
        correctionHours,
        balanceSeconds,
      });
    }

    const currentWeek = weeks[weeks.length - 1];

    return {
      id: target.id,
      clientId: target.clientId,
      clientName: target.client.name,
      userId: target.userId,
      weeklyHours: target.weeklyHours,
      startDate: target.startDate.toISOString().split('T')[0],
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
      currentWeekTrackedSeconds: currentWeek?.trackedSeconds ?? 0,
      currentWeekTargetSeconds: currentWeek?.targetSeconds ?? targetSecondsPerWeek,
      weeks,
    };
  }

  private emptyBalance(target: {
    id: string;
    clientId: string;
    userId: string;
    weeklyHours: number;
    startDate: Date;
    createdAt: Date;
    updatedAt: Date;
    client: { id: string; name: string };
    corrections: Array<{ id: string; date: Date; hours: number; description: string | null; createdAt: Date }>;
  }): ClientTargetWithBalance {
    return {
      id: target.id,
      clientId: target.clientId,
      clientName: target.client.name,
      userId: target.userId,
      weeklyHours: target.weeklyHours,
      startDate: target.startDate.toISOString().split('T')[0],
      createdAt: target.createdAt.toISOString(),
      updatedAt: target.updatedAt.toISOString(),
      corrections: [],
      totalBalanceSeconds: 0,
      currentWeekTrackedSeconds: 0,
      currentWeekTargetSeconds: target.weeklyHours * 3600,
      weeks: [],
    };
  }
}
