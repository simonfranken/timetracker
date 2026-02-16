import { prisma } from '../prisma/client';
import type { CreateClientInput, UpdateClientInput } from '../types';

export class ClientService {
  async findAll(userId: string) {
    return prisma.client.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.client.findFirst({
      where: { id, userId },
    });
  }

  async create(userId: string, data: CreateClientInput) {
    return prisma.client.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async update(id: string, userId: string, data: UpdateClientInput) {
    const client = await this.findById(id, userId);
    if (!client) {
      const error = new Error('Client not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }

    return prisma.client.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string) {
    const client = await this.findById(id, userId);
    if (!client) {
      const error = new Error('Client not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }

    await prisma.client.delete({
      where: { id },
    });
  }
}