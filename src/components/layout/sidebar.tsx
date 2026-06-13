import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { db } from "@/lib/db";
import { getPlanContext } from "@/lib/plan";
import { SidebarClient } from "./sidebar-client";
import type { AvatarUser } from "@/components/ui/avatar";

export async function Sidebar() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [plan, prompts, favorites] = await Promise.all([
    getPlanContext(user.id),
    db.prompt.count({ where: { userId: user.id } }),
    db.promptFavorite.count({ where: { userId: user.id } }),
  ]);

  const avatarUser: AvatarUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    avatarType: user.avatarType,
    profilePicture: user.profilePicture,
    gravatarEmail: user.gravatarEmail,
  };

  return (
    <SidebarClient
      user={avatarUser}
      userName={user.name || user.username || user.email || "User"}
      isAdmin={user.role === UserRole.ADMIN}
      plan={plan.plan}
      roleLabel={plan.roleLabel}
      counts={{ prompts, favorites }}
    />
  );
}
