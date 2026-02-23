import { prisma } from "../prisma/client";
import { NotFoundError } from "../errors/AppError";
import type { CreateClientInput, UpdateClientInput } from "../types";

export class ClientService {
  async findAll(userId: string) {
    return prisma.client.findMany({
      where: { userId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.client.findFirst({
      where: { id, userId, deletedAt: null },
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
      throw new NotFoundError("Client not found");
    }

    return prisma.client.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string) {
    const client = await this.findById(id, userId);
    if (!client) {
      throw new NotFoundError("Client not found");
    }

    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
