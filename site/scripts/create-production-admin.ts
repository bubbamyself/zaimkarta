import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createPasswordHash } from "../src/lib/password";

const connectionString = process.env.DATABASE_URL;
const username = process.env.ADMIN_USERNAME?.trim();
const password = process.env.ADMIN_PASSWORD;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

if (!username || !/^[A-Za-z0-9._-]{3,64}$/.test(username)) {
  throw new Error(
    "ADMIN_USERNAME must be 3-64 characters and contain only letters, numbers, dot, underscore, or hyphen.",
  );
}

if (!password || password.length < 16) {
  throw new Error("ADMIN_PASSWORD must be at least 16 characters long.");
}

const adminUsername = username;
const adminPassword = password;

async function main() {
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.adminUser.create({
      data: {
        username: adminUsername,
        passwordHash: createPasswordHash(adminPassword),
        role: "BOSS",
        permissions: ["analytics", "admin_users"],
        isActive: true,
      },
    });

    console.log(`Production BOSS admin created: ${adminUsername}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
