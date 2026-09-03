// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import argon2 from "argon2";
import "dotenv/config";
import { PrismaClient, UserRole, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

const parseArgs = () => {
  const values: Record<string, string> = {};

  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (!arg?.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    const value = process.argv[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    values[key] = value;
    index += 1;
  }

  return {
    name: values.name ?? process.env.ADMIN_NAME ?? "Admin",
    email: values.email ?? process.env.ADMIN ?? process.env.ADMIN_EMAIL,
    password: values.password ?? process.env.ADMIN_PASSWORD,
  };
};

const assertRequired = (value: string | undefined, field: string): string => {
  if (!value?.trim()) {
    const envName =
      field === "email" ? "ADMIN or ADMIN_EMAIL" : `ADMIN_${field.toUpperCase()}`;
    throw new Error(
      `Missing ${field}. Provide --${field} or set ${envName}.`,
    );
  }

  return value.trim();
};

const main = async (): Promise<void> => {
  const { name, email, password } = parseArgs();

  const resolvedName = assertRequired(name, "name");
  const resolvedEmail = assertRequired(email, "email");
  const resolvedPassword = assertRequired(password, "password");

  const passwordHash = await argon2.hash(resolvedPassword, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  const existingUser = await prisma.user.findUnique({
    where: { email: resolvedEmail },
  });

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: resolvedName,
          passwordHash,
          status: UserStatus.active,
          role: UserRole.admin,
        },
      })
    : await prisma.user.create({
        data: {
          name: resolvedName,
          email: resolvedEmail,
          passwordHash,
          status: UserStatus.active,
          role: UserRole.admin,
        },
      });

  console.log(
    `${existingUser ? "Updated" : "Created"} admin user ${user.email} with active admin access.`,
  );
  console.log(
    "Note: the migration-created System Owner fallback user is not an implicit admin account.",
  );
};

main()
  .catch((error: unknown) => {
    const err = error as Error;
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
