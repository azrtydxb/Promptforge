import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { SidebarProvider } from '@/components/providers/sidebar-provider';
import { DashboardContent } from '@/components/layout/dashboard-content';

const TagsLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
        <Sidebar />
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  );
};

export default TagsLayout;