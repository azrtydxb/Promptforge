import React from 'react';
import { requireAdmin } from '@/lib/admin-auth';
import { Sidebar } from '@/components/layout/sidebar';
import { SidebarProvider } from '@/components/providers/sidebar-provider';
import { DashboardContent } from '@/components/layout/dashboard-content';
import { PageErrorBoundary } from '@/components/error-boundary';

export const dynamic = 'force-dynamic';

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  await requireAdmin(); // This will redirect if not admin
  
  return (
    <PageErrorBoundary>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
          <Sidebar />
          <DashboardContent>{children}</DashboardContent>
        </div>
      </SidebarProvider>
    </PageErrorBoundary>
  );
};

export default AdminLayout;