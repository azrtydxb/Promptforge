'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Flag, CheckCircle, XCircle, Activity, AlertTriangle } from 'lucide-react';

interface ModerationStatsProps {
  stats: {
    pending: number;
    flagged: number;
    approved: number;
    rejected: number;
    todayActions: number;
    total: number;
  };
}

export function ModerationStats({ stats }: ModerationStatsProps) {
  const statCards = [
    {
      label: 'Pending Review',
      value: stats.pending,
      icon: Shield,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      label: 'Flagged',
      value: stats.flagged,
      icon: Flag,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
    },
    {
      label: 'Today\'s Actions',
      value: stats.todayActions,
      icon: Activity,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      label: 'Total Content',
      value: stats.total,
      icon: AlertTriangle,
      color: 'text-gray-500',
      bgColor: 'bg-gray-100 dark:bg-gray-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
