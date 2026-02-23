import { prisma } from "../prisma/client";
import { NotFoundError, BadRequestError } from "../errors/AppError";
import type { CreateProjectInput, UpdateProjectInput } from "../types";

export class ProjectService {
  async findAll(userId: string, clientId?: string) {
    return prisma.project.findMany({
      where: {
        userId,
        deletedAt: null,
        client: { deletedAt: null },
        ...(clientId && { clientId }),
      },
      orderBy: { name: "asc" },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.project.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
        client: { deletedAt: null },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async create(userId: string, data: CreateProjectInput) {
    // Verify the client belongs to the user and is not soft-deleted
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, userId, deletedAt: null },
    });

    if (!client) {
      throw new BadRequestError("Client not found or does not belong to user");
    }

    return prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        userId,
        clientId: data.clientId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async update(id: string, userId: string, data: UpdateProjectInput) {
    const project = await this.findById(id, userId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // If clientId is being updated, verify it belongs to the user and is not soft-deleted
    if (data.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: data.clientId, userId, deletedAt: null },
      });

      if (!client) {
        throw new BadRequestError(
          "Client not found or does not belong to user",
        );
      }
    }

    return prisma.project.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        clientId: data.clientId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async delete(id: string, userId: string) {
    const project = await this.findById(id, userId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
