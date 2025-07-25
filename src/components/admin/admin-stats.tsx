"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserStats } from "@/app/actions/admin-users.actions";
import { 
  Users, 
  UserCheck, 
  Shield, 
  ShieldCheck,
  UserPlus,
  Activity
} from "lucide-react";
import { LoadingStates } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
  moderatorCount: number;
  verifiedUsers: number;
  newUsersThisMonth: number;
}

export function AdminStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getUserStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <LoadingStates.CardGrid count={6} />;
  }

  if (!stats) {
    return (
      <EmptyState
        type="error"
        title="Failed to load statistics"
        description="Unable to retrieve user statistics. Please try again later."
        size="sm"
      />
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      description: "All registered users",
      color: "text-[#546ee5]",
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      icon: Activity,
      description: "Currently active accounts",
      color: "text-[#10b981]",
    },
    {
      title: "Admins",
      value: stats.adminCount,
      icon: Shield,
      description: "Administrator accounts",
      color: "text-[#546ee5]",
    },
    {
      title: "Moderators",
      value: stats.moderatorCount,
      icon: ShieldCheck,
      description: "Moderator accounts",
      color: "text-[#f59e0b]",
    },
    {
      title: "Verified Users",
      value: stats.verifiedUsers,
      icon: UserCheck,
      description: "Email verified accounts",
      color: "text-[#3b82f6]",
    },
    {
      title: "New This Month",
      value: stats.newUsersThisMonth,
      icon: UserPlus,
      description: "Users joined this month",
      color: "text-[#6379c3]",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="min-h-[var(--card-min-height)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">
                {stat.title}
              </CardTitle>
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#6379c3]/20 to-[#546ee5]/20">
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}