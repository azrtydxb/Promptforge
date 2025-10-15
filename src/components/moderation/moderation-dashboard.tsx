'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModerationQueue } from './moderation-queue';
import { ModerationStats } from './moderation-stats';
import { ModerationRules } from './moderation-rules';
import { ModerationLogs } from './moderation-logs';
import { Shield, Flag, List, Settings } from 'lucide-react';

interface SharedPrompt {
  id: string;
  title: string;
  description: string | null;
  content: string;
  status: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
  prompt: {
    title: string;
    description: string | null;
  };
}

interface ModerationLog {
  id: string;
  contentType: string;
  contentId: string;
  action: string;
  reason: string | null;
  automated: boolean;
  reviewedBy: string | null;
  createdAt: Date;
}

interface ModerationStats {
  pending: number;
  flagged: number;
  approved: number;
  rejected: number;
  todayActions: number;
  total: number;
}

interface ModerationDashboardProps {
  initialData: {
    pending: SharedPrompt[];
    flagged: SharedPrompt[];
    recentLogs: ModerationLog[];
  };
  initialStats: ModerationStats;
  userRole: string;
}

export function ModerationDashboard({
  initialData,
  initialStats,
  userRole,
}: ModerationDashboardProps) {
  const [stats, setStats] = useState(initialStats);

  const handleModerated = () => {
    // Refresh stats after moderation action
    setStats((prev) => ({
      ...prev,
      pending: Math.max(0, prev.pending - 1),
      todayActions: prev.todayActions + 1,
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8" />
          Content Moderation
        </h1>
        <p className="text-muted-foreground mt-2">
          Review and moderate user-submitted content
        </p>
      </div>

      <ModerationStats stats={stats} />

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Shield className="w-4 h-4" />
            Pending ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="flagged" className="gap-2">
            <Flag className="w-4 h-4" />
            Flagged ({stats.flagged})
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <List className="w-4 h-4" />
            Logs
          </TabsTrigger>
          {userRole === "ADMIN" && (
            <TabsTrigger value="rules" className="gap-2">
              <Settings className="w-4 h-4" />
              Rules
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <ModerationQueue
            prompts={initialData.pending}
            onModerated={handleModerated}
            type="pending"
          />
        </TabsContent>

        <TabsContent value="flagged" className="space-y-4">
          <ModerationQueue
            prompts={initialData.flagged}
            onModerated={handleModerated}
            type="flagged"
          />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <ModerationLogs initialLogs={initialData.recentLogs} />
        </TabsContent>

        {userRole === "ADMIN" && (
          <TabsContent value="rules" className="space-y-4">
            <ModerationRules />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
