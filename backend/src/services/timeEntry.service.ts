import { prisma } from "../prisma/client";
import { Prisma } from "@prisma/client";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from "../errors/AppError";
import { hasOverlappingEntries } from "../utils/timeUtils";
import type {
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  TimeEntryFilters,
  StatisticsFilters,
} from "../types";

export class TimeEntryService {
  async getStatistics(userId: string, filters: StatisticsFilters = {}) {
    const { startDate, endDate, projectId, clientId } = filters;

    // Build an array of safe Prisma SQL filter fragments to append as AND clauses.
    const extraFilters: Prisma.Sql[] = [];
    if (startDate)  extraFilters.push(Prisma.sql`AND te.start_time >= ${new Date(startDate)}`);
    if (endDate)    extraFilters.push(Prisma.sql`AND te.start_time <= ${new Date(endDate)}`);
    if (projectId)  extraFilters.push(Prisma.sql`AND te.project_id = ${projectId}`);
    if (clientId)   extraFilters.push(Prisma.sql`AND p.client_id = ${clientId}`);

    const filterClause = extraFilters.length
      ? Prisma.join(extraFilters, " ")
      : Prisma.empty;

    const [projectGroups, clientGroups, totalAgg] = await Promise.all([
      prisma.$queryRaw<
        {
          project_id: string;
          project_name: string;
          project_color: string | null;
          total_seconds: bigint;
          entry_count: bigint;
        }[]
      >(Prisma.sql`
        SELECT
          p.id   AS project_id,
          p.name AS project_name,
          p.color AS project_color,
          COALESCE(SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) - (te.break_minutes * 60)), 0)::bigint AS total_seconds,
          COUNT(te.id)::bigint AS entry_count
        FROM time_entries te
        JOIN projects p ON p.id = te.project_id
        JOIN clients  c ON c.id = p.client_id
        WHERE te.user_id = ${userId}
          AND te.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND c.deleted_at IS NULL
        ${filterClause}
        GROUP BY p.id, p.name, p.color
        ORDER BY total_seconds DESC
      `),

      prisma.$queryRaw<
        {
          client_id: string;
          client_name: string;
          total_seconds: bigint;
          entry_count: bigint;
        }[]
      >(Prisma.sql`
        SELECT
          c.id   AS client_id,
          c.name AS client_name,
          COALESCE(SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) - (te.break_minutes * 60)), 0)::bigint AS total_seconds,
          COUNT(te.id)::bigint AS entry_count
        FROM time_entries te
        JOIN projects p ON p.id = te.project_id
        JOIN clients  c ON c.id = p.client_id
        WHERE te.user_id = ${userId}
          AND te.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND c.deleted_at IS NULL
        ${filterClause}
        GROUP BY c.id, c.name
        ORDER BY total_seconds DESC
      `),

      prisma.$queryRaw<{ total_seconds: bigint; entry_count: bigint }[]>(
        Prisma.sql`
          SELECT
            COALESCE(SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) - (te.break_minutes * 60)), 0)::bigint AS total_seconds,
            COUNT(te.id)::bigint AS entry_count
          FROM time_entries te
          JOIN projects p ON p.id = te.project_id
          JOIN clients  c ON c.id = p.client_id
          WHERE te.user_id = ${userId}
            AND te.deleted_at IS NULL
            AND p.deleted_at IS NULL
            AND c.deleted_at IS NULL
          ${filterClause}
        `,
      ),
    ]);

    return {
      totalSeconds: Number(totalAgg[0]?.total_seconds ?? 0),
      entryCount: Number(totalAgg[0]?.entry_count ?? 0),
      byProject: projectGroups.map((r) => ({
        projectId: r.project_id,
        projectName: r.project_name,
        projectColor: r.project_color,
        totalSeconds: Number(r.total_seconds),
        entryCount: Number(r.entry_count),
      })),
      byClient: clientGroups.map((r) => ({
        clientId: r.client_id,
        clientName: r.client_name,
        totalSeconds: Number(r.total_seconds),
        entryCount: Number(r.entry_count),
      })),
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        projectId: projectId || null,
        clientId: clientId || null,
      },
    };
  }

  async findAll(userId: string, filters: TimeEntryFilters = {}) {
    const {
      startDate,
      endDate,
      projectId,
      clientId,
      page = 1,
      limit = 50,
    } = filters;
    const skip = (page - 1) * limit;

    const where: {
      userId: string;
      deletedAt: null;
      startTime?: { gte?: Date; lte?: Date };
      projectId?: string;
      project?: { deletedAt: null; clientId?: string; client: { deletedAt: null } };
    } = { userId, deletedAt: null };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    if (projectId) {
      where.projectId = projectId;
    }

    // Always filter out entries whose project or client is soft-deleted,
    // merging the optional clientId filter into the project relation filter.
    where.project = {
      deletedAt: null,
      client: { deletedAt: null },
      ...(clientId && { clientId }),
    };

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        orderBy: { startTime: "desc" },
        skip,
        take: limit,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              color: true,
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.timeEntry.count({ where }),
    ]);

    return {
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, userId: string) {
    return prisma.timeEntry.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
        project: { deletedAt: null, client: { deletedAt: null } },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async create(userId: string, data: CreateTimeEntryInput) {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    const breakMinutes = data.breakMinutes ?? 0;

    // Validate end time is after start time
    if (endTime <= startTime) {
      throw new BadRequestError("End time must be after start time");
    }

    // Validate break time doesn't exceed duration
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
    if (breakMinutes > durationMinutes) {
      throw new BadRequestError("Break time cannot exceed total duration");
    }

    // Verify the project belongs to the user and is not soft-deleted (nor its client)
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, userId, deletedAt: null, client: { deletedAt: null } },
    });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Check for overlapping entries
    const hasOverlap = await hasOverlappingEntries(
      userId,
      startTime,
      endTime,
    );
    if (hasOverlap) {
      throw new ConflictError(
        "This time entry overlaps with an existing entry",
      );
    }

    return prisma.timeEntry.create({
      data: {
        startTime,
        endTime,
        breakMinutes,
        description: data.description,
        userId,
        projectId: data.projectId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, userId: string, data: UpdateTimeEntryInput) {
    const entry = await this.findById(id, userId);
    if (!entry) {
      throw new NotFoundError("Time entry not found");
    }

    const startTime = data.startTime
      ? new Date(data.startTime)
      : entry.startTime;
    const endTime = data.endTime ? new Date(data.endTime) : entry.endTime;
    const breakMinutes = data.breakMinutes ?? entry.breakMinutes;

    // Validate end time is after start time
    if (endTime <= startTime) {
      throw new BadRequestError("End time must be after start time");
    }

    // Validate break time doesn't exceed duration
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
    if (breakMinutes > durationMinutes) {
      throw new BadRequestError("Break time cannot exceed total duration");
    }

    // If project changed, verify it belongs to the user and is not soft-deleted
    if (data.projectId && data.projectId !== entry.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, userId, deletedAt: null, client: { deletedAt: null } },
      });

      if (!project) {
        throw new NotFoundError("Project not found");
      }
    }

    // Check for overlapping entries (excluding this entry)
    const hasOverlap = await hasOverlappingEntries(
      userId,
      startTime,
      endTime,
      id,
    );
    if (hasOverlap) {
      throw new ConflictError(
        "This time entry overlaps with an existing entry",
      );
    }

    return prisma.timeEntry.update({
      where: { id },
      data: {
        startTime,
        endTime,
        breakMinutes,
        description: data.description,
        projectId: data.projectId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async delete(id: string, userId: string) {
    const entry = await this.findById(id, userId);
    if (!entry) {
      throw new NotFoundError("Time entry not found");
    }

    await prisma.timeEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
