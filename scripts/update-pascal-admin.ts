import { db } from "../src/lib/db";
import { UserRole } from "../src/generated/prisma";

async function makePascalAdmin() {
  try {
    // First, let's check if the user exists
    const user = await db.user.findUnique({
      where: { email: "pascal@watteel.com" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });

    if (!user) {
      console.error("❌ User pascal@watteel.com not found in database");
      process.exit(1);
    }

    console.log("Found user:", {
      id: user.id,
      email: user.email,
      name: user.name,
      currentRole: user.role
    });

    // Update the user to admin
    const updatedUser = await db.user.update({
      where: { email: "pascal@watteel.com" },
      data: { 
        role: UserRole.ADMIN,
        isActive: true // Ensure the account is active
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      }
    });

    console.log("\n✅ Successfully updated user to ADMIN role!");
    console.log("Updated user details:", {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      isActive: updatedUser.isActive
    });

  } catch (error) {
    console.error("❌ Error updating user:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Execute the update
makePascalAdmin();