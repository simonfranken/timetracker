import { prisma } from '../prisma/client';

import type { CreateProjectInput, UpdateProjectInput } from '../types';

export class ProjectService {
  async findAll(userId: string, clientId?: string) {
    return prisma.project.findMany({
      where: {
        userId,
        ...(clientId && { clientId }),
      },
      orderBy: { name: 'asc' },
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
      where: { id, userId },
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
    // Verify the client belongs to the user
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, userId },
    });
    
    if (!client) {
      const error = new Error('Client not found or does not belong to user') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
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
      const error = new Error('Project not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }

    // If clientId is being updated, verify it belongs to the user
    if (data.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: data.clientId, userId },
      });
      
      if (!client) {
        const error = new Error('Client not found or does not belong to user') as Error & { statusCode: number };
        error.statusCode = 400;
        throw error;
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
      const error = new Error('Project not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }

    await prisma.project.delete({
      where: { id },
    });
  }
}