import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { SidebarClient } from "./sidebar-client";

export async function Sidebar() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === UserRole.ADMIN;
  
  return <SidebarClient isAdmin={isAdmin} />;
}