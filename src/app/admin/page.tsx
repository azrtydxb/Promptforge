"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "@/components/admin/user-management";
import { AISettings } from "@/components/admin/ai-settings";
import { AdminStats } from "@/components/admin/admin-stats";
import { BackupRestore } from "@/components/admin/backup-restore";
import { Users, Bot, BarChart, Database } from "lucide-react";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("stats");

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage users, AI settings, backup/restore, and view system statistics</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Statistics</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">AI Settings</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Backup</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-4">
          <AdminStats />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <AISettings />
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <BackupRestore />
        </TabsContent>
      </Tabs>
    </div>
  );
}