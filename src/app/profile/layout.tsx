import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { Sidebar } from '@/components/layout/sidebar';
import { SidebarProvider } from '@/components/providers/sidebar-provider';
import { DashboardContent } from '@/components/layout/dashboard-content';

const ProfileLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/sign-in');
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
        <Sidebar />
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  );
};

export default ProfileLayout;