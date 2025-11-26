import { Project, Prisma } from "@prisma/client";
import { dbClient } from "@/prisma/client";

export const projectModel = {
  async findMany(
    filters?: {
      ownerId?: string;
      isActive?: boolean;
      name?: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Project[]> {
    const client = tx ?? dbClient;
    const where: Prisma.ProjectWhereInput = {};

    if (filters?.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.name) {
      where.name = {
        contains: filters.name,
        mode: "insensitive",
      };
    }

    return await client.project.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            executions: true,
            specs: true,
            issues: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<
    | (Project & {
        owner: { id: string; name: string; email: string };
        _count: {
          executions: number;
          specs: number;
          issues: number;
        };
      })
    | null
  > {
    const client = tx ?? dbClient;
    return await client.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            executions: true,
            specs: true,
            issues: true,
          },
        },
      },
    });
  },

  async findByName(
    name: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Project | null> {
    const client = tx ?? dbClient;
    return await client.project.findUnique({
      where: { name },
    });
  },

  async create(
    data: {
      name: string;
      description?: string;
      ownerId: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Project> {
    const client = tx ?? dbClient;
    return await client.project.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        ownerId: data.ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      isActive?: boolean;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Project> {
    const client = tx ?? dbClient;
    return await client.project.update({
      where: { id },
      data,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<Project> {
    const client = tx ?? dbClient;
    return await client.project.delete({
      where: { id },
    });
  },

  async checkOwnership(
    projectId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx ?? dbClient;
    const project = await client.project.findUnique({
      where: {
        id: projectId,
        ownerId: userId,
      },
    });
    return !!project;
  },

  async findUserProjects(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Project[]> {
    const client = tx ?? dbClient;
    return await client.project.findMany({
      where: {
        ownerId: userId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            executions: true,
            specs: true,
            issues: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },
};
