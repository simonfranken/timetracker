import { prisma } from "../prisma/client";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from "../errors/AppError";
import { hasOverlappingEntries } from "../utils/timeUtils";
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

    // Validate startTime if provided
    let startTime: Date | undefined = undefined;
    if (data.startTime) {
      const parsed = new Date(data.startTime);
      const now = new Date();
      if (parsed >= now) {
        throw new BadRequestError("Start time must be in the past");
      }
      startTime = parsed;
    }

    const updateData: Record<string, unknown> = {};
    if (projectId !== undefined) updateData.projectId = projectId;
    if (startTime !== undefined) updateData.startTime = startTime;

    return prisma.ongoingTimer.update({
      where: { userId },
      data: updateData,
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

  async cancel(userId: string) {
    const timer = await this.getOngoingTimer(userId);
    if (!timer) {
      throw new NotFoundError("No timer is running");
    }

    await prisma.ongoingTimer.delete({ where: { userId } });
  }

  async pause(userId: string) {
    const timer = await this.getOngoingTimer(userId);
    if (!timer) {
      throw new NotFoundError("No timer is running");
    }

    if (timer.breakStart) {
      throw new BadRequestError("Timer is already paused");
    }

    return prisma.ongoingTimer.update({
      where: { userId },
      data: { breakStart: new Date() },
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

  async resume(userId: string) {
    const timer = await this.getOngoingTimer(userId);
    if (!timer) {
      throw new NotFoundError("No timer is running");
    }

    if (!timer.breakStart) {
      throw new BadRequestError("Timer is not paused");
    }

    const now = new Date();
    const breakStartMs = timer.breakStart.getTime();
    const breakDurationMinutes = Math.floor((now.getTime() - breakStartMs) / 60000);

    return prisma.ongoingTimer.update({
      where: { userId },
      data: {
        breakStart: null,
        breakMinutes: timer.breakMinutes + breakDurationMinutes,
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

    // Calculate final break minutes (including current pause if timer is paused)
    let breakMinutes = timer.breakMinutes;
    if (timer.breakStart) {
      const currentPauseMinutes = Math.floor(
        (endTime.getTime() - timer.breakStart.getTime()) / 60000
      );
      breakMinutes += currentPauseMinutes;
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

    // Delete ongoing timer and create time entry in a transaction
    const result = await prisma.$transaction([
      prisma.ongoingTimer.delete({
        where: { userId },
      }),
      prisma.timeEntry.create({
        data: {
          startTime,
          endTime,
          breakMinutes,
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
}
