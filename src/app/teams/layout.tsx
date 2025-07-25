import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { SidebarProvider } from '@/components/providers/sidebar-provider';
import { DashboardContent } from '@/components/layout/dashboard-content';
import { PageErrorBoundary } from '@/components/error-boundary';

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
}