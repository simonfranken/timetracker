import { prisma } from '../prisma/client';
import type { CreateTimeEntryInput, UpdateTimeEntryInput, TimeEntryFilters } from '../types';

export class TimeEntryService {
  async findAll(userId: string, filters: TimeEntryFilters = {}) {
    const { startDate, endDate, projectId, clientId, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: {
      userId: string;
      startTime?: { gte?: Date; lte?: Date };
      projectId?: string;
      project?: { clientId?: string };
    } = { userId };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (clientId) {
      where.project = { clientId };
    }

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        orderBy: { startTime: 'desc' },
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
      where: { id, userId },
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

    // Validate end time is after start time
    if (endTime <= startTime) {
      const error = new Error('End time must be after start time') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }

    // Verify the project belongs to the user
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, userId },
    });

    if (!project) {
      const error = new Error('Project not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }

    // Check for overlapping entries
    const hasOverlap = await this.hasOverlappingEntries(userId, startTime, endTime);
    if (hasOverlap) {
      const error = new Error('This time entry overlaps with an existing entry') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }

    return prisma.timeEntry.create({
      data: {
        startTime,
        endTime,
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
      const error = new Error('Time entry not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }

    const startTime = data.startTime ? new Date(data.startTime) : entry.startTime;
    const endTime = data.endTime ? new Date(data.endTime) : entry.endTime;

    // Validate end time is after start time
    if (endTime <= startTime) {
      const error = new Error('End time must be after start time') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }

    // If project changed, verify it belongs to the user
    if (data.projectId && data.projectId !== entry.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, userId },
      });

      if (!project) {
        const error = new Error('Project not found') as Error & { statusCode: number };
        error.statusCode = 404;
        throw error;
      }
    }

    // Check for overlapping entries (excluding this entry)
    const hasOverlap = await this.hasOverlappingEntries(userId, startTime, endTime, id);
    if (hasOverlap) {
      const error = new Error('This time entry overlaps with an existing entry') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }

    return prisma.timeEntry.update({
      where: { id },
      data: {
        startTime,
        endTime,
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
      const error = new Error('Time entry not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }

    await prisma.timeEntry.delete({
      where: { id },
    });
  }

  private async hasOverlappingEntries(
    userId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<boolean> {
    const where: {
      userId: string;
      id?: { not: string };
      OR: Array<{
        startTime?: { lt: Date };
        endTime?: { gt: Date };
      }>;
    } = {
      userId,
      OR: [
        // Entry starts during the new entry
        { startTime: { lt: endTime }, endTime: { gt: startTime } },
      ],
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await prisma.timeEntry.count({ where });
    return count > 0;
  }
}