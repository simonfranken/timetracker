import { prisma } from "../prisma/client";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from "../errors/AppError";
import type {
  StartTimerInput,
  UpdateTimerInput,
  StopTimerInput,
} from "../types";

export class TimerService {
  async getOngoingTimer(userId: string) {
    return prisma.ongoingTimer.findUnique({
      where: { userId },
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

  async start(userId: string, data?: StartTimerInput) {
    // Check if user already has an ongoing timer
    const existingTimer = await this.getOngoingTimer(userId);
    if (existingTimer) {
      throw new BadRequestError("Timer is already running");
    }

    // If projectId provided, verify it belongs to the user
    let projectId: string | null = null;
    if (data?.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, userId },
      });

      if (!project) {
        throw new NotFoundError("Project not found");
      }

      projectId = data.projectId;
    }

    return prisma.ongoingTimer.create({
      data: {
        startTime: new Date(),
        userId,
        projectId,
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

  async update(userId: string, data: UpdateTimerInput) {
    const timer = await this.getOngoingTimer(userId);
    if (!timer) {
      throw new NotFoundError("No timer is running");
    }

    // If projectId is explicitly null, clear the project
    // If projectId is a string, verify it belongs to the user
    let projectId: string | null | undefined = undefined;

    if (data.projectId === null) {
      projectId = null;
    } else if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, userId },
      });

      if (!project) {
        throw new NotFoundError("Project not found");
      }

      projectId = data.projectId;
    }

    return prisma.ongoingTimer.update({
      where: { userId },
      data: projectId !== undefined ? { projectId } : {},
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

  async stop(userId: string, data?: StopTimerInput) {
    const timer = await this.getOngoingTimer(userId);
    if (!timer) {
      throw new NotFoundError("No timer is running");
    }

    // Determine which project to use
    let projectId = timer.projectId;

    // If data.projectId is provided, use it instead
    if (data?.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, userId },
      });

      if (!project) {
        throw new NotFoundError("Project not found");
      }

      projectId = data.projectId;
    }

    // If no project is selected, throw error requiring project selection
    if (!projectId) {
      throw new BadRequestError(
        "Please select a project before stopping the timer",
      );
    }

    const endTime = new Date();
    const startTime = timer.startTime;

    // Check for overlapping entries
    const hasOverlap = await this.hasOverlappingEntries(
      userId,
      startTime,
      endTime,
    );
    if (hasOverlap) {
      throw new ConflictError(
        "This time entry overlaps with an existing entry",
      );
    }

    // Delete ongoing timer and create time entry in a transaction
    const result = await prisma.$transaction([
      prisma.ongoingTimer.delete({
        where: { userId },
      }),
      prisma.timeEntry.create({
        data: {
          startTime,
          endTime,
          userId,
          projectId,
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
      }),
    ]);

    return result[1]; // Return the created time entry
  }

  private async hasOverlappingEntries(
    userId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> {
    const count = await prisma.timeEntry.count({
      where: {
        userId,
        OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }],
      },
    });
    return count > 0;
  }
}
