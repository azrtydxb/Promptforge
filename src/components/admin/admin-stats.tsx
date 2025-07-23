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
import { Skeleton } from "@/components/ui/skeleton";

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
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return <div>Failed to load statistics</div>;
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      description: "All registered users",
      color: "text-blue-600",
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      icon: Activity,
      description: "Currently active accounts",
      color: "text-green-600",
    },
    {
      title: "Admins",
      value: stats.adminCount,
      icon: Shield,
      description: "Administrator accounts",
      color: "text-purple-600",
    },
    {
      title: "Moderators",
      value: stats.moderatorCount,
      icon: ShieldCheck,
      description: "Moderator accounts",
      color: "text-orange-600",
    },
    {
      title: "Verified Users",
      value: stats.verifiedUsers,
      icon: UserCheck,
      description: "Email verified accounts",
      color: "text-cyan-600",
    },
    {
      title: "New This Month",
      value: stats.newUsersThisMonth,
      icon: UserPlus,
      description: "Users joined this month",
      color: "text-pink-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
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