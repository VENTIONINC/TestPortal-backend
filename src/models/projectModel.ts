import { PrismaClient, Project, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export const projectModel = {
  async findMany(filters?: {
    ownerId?: string;
    isActive?: boolean;
    name?: string;
  }): Promise<Project[]> {
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

    return await prisma.project.findMany({
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

  async findById(id: string): Promise<
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
    return await prisma.project.findUnique({
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

  async findByName(name: string): Promise<Project | null> {
    return await prisma.project.findUnique({
      where: { name },
    });
  },

  async create(data: {
    name: string;
    description?: string;
    ownerId: string;
  }): Promise<Project> {
    return await prisma.project.create({
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
  ): Promise<Project> {
    return await prisma.project.update({
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

  async delete(id: string): Promise<Project> {
    return await prisma.project.delete({
      where: { id },
    });
  },

  async checkOwnership(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        ownerId: userId,
      },
    });
    return !!project;
  },

  async findUserProjects(userId: string): Promise<Project[]> {
    return await prisma.project.findMany({
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
