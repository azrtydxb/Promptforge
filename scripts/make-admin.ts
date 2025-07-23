import { db } from "../src/lib/db";
import { UserRole } from "../src/generated/prisma";

async function makeAdmin(email: string) {
  try {
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { role: UserRole.ADMIN },
    });

    console.log(`✅ Successfully made ${updatedUser.email} an admin`);
    console.log(`User ID: ${updatedUser.id}`);
    console.log(`Name: ${updatedUser.name || "N/A"}`);
    console.log(`Role: ${updatedUser.role}`);
  } catch (error) {
    console.error("Error making user admin:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error("Please provide an email address");
  console.error("Usage: npm run make-admin <email>");
  process.exit(1);
}

makeAdmin(email);