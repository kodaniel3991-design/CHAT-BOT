import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

const prisma = new PrismaClient();

async function main() {
  const filePath = resolve(__dirname, "../config/services.json");
  const raw = readFileSync(filePath, "utf-8");
  const services = JSON.parse(raw) as Array<{
    id: string;
    label: string;
    description?: string;
    config: object;
  }>;

  for (const s of services) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: {
        label: s.label,
        description: s.description,
        config: s.config,
      },
      create: {
        id: s.id,
        label: s.label,
        description: s.description,
        config: s.config,
      },
    });
    console.log(`  ✓ ${s.id} (${s.label})`);
  }

  console.log(`\nSeeded ${services.length} services.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
