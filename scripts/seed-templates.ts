import { seedTemplates } from "@/lib/seed-templates";

async function main() {
  try {
    await seedTemplates();
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed templates:", error);
    process.exit(1);
  }
}

main();