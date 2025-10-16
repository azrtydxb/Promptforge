"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, FileText, Folder, Tag, BarChart3, Heart, History } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { SectionErrorBoundary } from "@/components/error-boundary";
import { MinimalErrorFallback } from "@/components/error-boundary/error-fallbacks";
import { useTheme } from "next-themes";
import { TrendingSection } from "./trending-section";

interface DashboardData {
  totalPrompts: number;
  totalFolders: number;
  totalTags: number;
  totalVersions: number;
  promptsByMonth: Array<{ month: string; count: number }>;
  promptsByFolder: Array<{ name: string; count: number }>;
  topTags: Array<{ name: string; count: number }>;
  recentActivity: Array<{ id: string; title: string; type: string; createdAt: string }>;
  promptGrowth: Array<{ date: string; prompts: number; cumulative: number }>;
  recentlyUsedPrompts?: Array<{
    id: string;
    title: string;
    description: string | null;
    lastUsedAt: Date | null;
    tags: Array<{ id: string; name: string }>;
    _count: { likes: number };
  }>;
  mostLikedPrompts?: Array<{
    id: string;
    title: string;
    _count: { likes: number };
  }>;
  mostVersionedPrompts?: Array<{
    id: string;
    title: string;
    _count: { versions: number };
  }>;
  mostFavoritedPrompts?: Array<{
    id: string;
    title: string;
    _count: { favorites: number };
  }>;
}

interface DashboardAnalyticsProps {
  data: DashboardData;
}

// Professional color palette for charts - using the Hyper blue gradient
const COLORS = [
  '#6379c3', // Primary gradient start
  '#546ee5', // Primary gradient end
  '#7a8fd3', // Lighter variant
  '#9aa9e1', // Even lighter
  '#bac4ee'  // Very light
];

const getChartColors = (theme: string | undefined) => ({
  grid: theme === 'dark' ? '#36404d' : '#e7ebf0',
  text: theme === 'dark' ? '#a1acb8' : '#6c757d',
  tooltip: {
    bg: theme === 'dark' ? '#313a46' : '#ffffff',
    border: theme === 'dark' ? '#36404d' : '#e7ebf0'
  }
});

export function DashboardAnalytics({ data }: DashboardAnalyticsProps) {
  const { theme } = useTheme();
  const chartColors = getChartColors(theme);
  
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Prompts Card */}
        <Card className="group relative overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 bg-gradient-to-br from-blue-50/30 to-transparent dark:from-blue-950/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">TOTAL PROMPTS</CardTitle>
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
              <FileText className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{data.totalPrompts}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Active prompt templates
            </p>
          </CardContent>
        </Card>

        {/* Folders Card */}
        <Card className="group relative overflow-hidden border-l-4 border-l-purple-500 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 bg-gradient-to-br from-purple-50/30 to-transparent dark:from-purple-950/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">FOLDERS</CardTitle>
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 shadow-md">
              <Folder className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{data.totalFolders}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Organization structures
            </p>
          </CardContent>
        </Card>

        {/* Tags Card */}
        <Card className="group relative overflow-hidden border-l-4 border-l-emerald-500 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 bg-gradient-to-br from-emerald-50/30 to-transparent dark:from-emerald-950/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">TAGS</CardTitle>
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
              <Tag className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{data.totalTags}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Unique categories
            </p>
          </CardContent>
        </Card>

        {/* Versions Card */}
        <Card className="group relative overflow-hidden border-l-4 border-l-amber-500 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 bg-gradient-to-br from-amber-50/30 to-transparent dark:from-amber-950/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">VERSIONS</CardTitle>
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{data.totalVersions}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Total revisions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* All Charts in Single Horizontal Row */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-4">
        {/* Trends */}
        <Card className="border border-border/50 hover:border-blue-500/50 hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
              Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <SectionErrorBoundary fallback={<MinimalErrorFallback />}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.promptGrowth}>
                  <defs>
                    <linearGradient id="colorPrompts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis
                    dataKey="date"
                    stroke={chartColors.text}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={chartColors.text}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={25}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartColors.tooltip.bg,
                      border: `1px solid ${chartColors.tooltip.border}`,
                      borderRadius: '6px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="prompts"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name="New Prompts"
                    fill="url(#colorPrompts)"
                    animationDuration={750}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    name="Total Prompts"
                    fill="url(#colorCumulative)"
                    animationDuration={750}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </SectionErrorBoundary>
          </CardContent>
        </Card>

        {/* Folders */}
        <Card className="border border-border/50 hover:border-purple-500/50 hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
              Folders
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <SectionErrorBoundary fallback={<MinimalErrorFallback />}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <defs>
                    <linearGradient id="pieGradient1" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                    <linearGradient id="pieGradient2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={data.promptsByFolder}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={70}
                    fill="#6379c3"
                    dataKey="count"
                    animationDuration={750}
                  >
                    {data.promptsByFolder.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} prompts`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </SectionErrorBoundary>
          </CardContent>
        </Card>

        {/* Activity */}
        <Card className="border border-border/50 hover:border-emerald-500/50 hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <SectionErrorBoundary fallback={<MinimalErrorFallback />}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.promptsByMonth}>
                  <defs>
                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis
                    dataKey="month"
                    stroke={chartColors.text}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={chartColors.text}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={25}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartColors.tooltip.bg,
                      border: `1px solid ${chartColors.tooltip.border}`,
                      borderRadius: '6px'
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="url(#colorActivity)"
                    radius={[8, 8, 0, 0]}
                    animationDuration={750}
                  />
                </BarChart>
              </ResponsiveContainer>
            </SectionErrorBoundary>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="border border-border/50 hover:border-amber-500/50 hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
              {data.topTags.map((tag, index) => (
                <div key={tag.name} className="flex items-center group hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mr-2 shadow-sm">
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold leading-none truncate pr-2">{tag.name}</p>
                      <p className="text-xs text-foreground/70 font-bold whitespace-nowrap">{tag.count}</p>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 transition-all duration-500 group-hover:scale-x-105"
                        style={{
                          width: `${(tag.count / Math.max(...data.topTags.map(t => t.count))) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recently Used Prompts */}
      {data.recentlyUsedPrompts && data.recentlyUsedPrompts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-semibold">Recently Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentlyUsedPrompts.map((prompt) => (
                <div key={prompt.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <a href={`/prompts/${prompt.id}`} className="text-sm font-medium text-foreground hover:text-[#546ee5] transition-colors">
                      {prompt.title}
                    </a>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        Last used: {prompt.lastUsedAt ? new Date(prompt.lastUsedAt).toLocaleDateString() : 'Never'}
                      </p>
                      {prompt.tags.length > 0 && (
                        <div className="flex gap-1">
                          {prompt.tags.slice(0, 2).map((tag, idx) => (
                            <span key={idx} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Heart className="h-3 w-3" />
                    <span>{prompt._count.likes}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Statistics Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Most Liked Prompts */}
        {data.mostLikedPrompts && data.mostLikedPrompts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Most Popular Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.mostLikedPrompts.map((prompt, index) => (
                  <div key={prompt.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <a href={`/prompts/${prompt.id}`} className="text-sm font-medium text-foreground hover:text-[#546ee5] transition-colors">
                        {prompt.title}
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3 text-red-500 fill-current" />
                      <span className="text-sm">{prompt._count.likes}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Most Versioned Prompts */}
        {data.mostVersionedPrompts && data.mostVersionedPrompts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Most Edited Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.mostVersionedPrompts.map((prompt, index) => (
                  <div key={prompt.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <a href={`/prompts/${prompt.id}`} className="text-sm font-medium text-foreground hover:text-[#546ee5] transition-colors">
                        {prompt.title}
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <History className="h-3 w-3 text-[#546ee5]" />
                      <span className="text-sm">{prompt._count.versions} versions</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Most Favorited Prompts */}
        {data.mostFavoritedPrompts && data.mostFavoritedPrompts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Most Favorited Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.mostFavoritedPrompts.map((prompt, index) => (
                  <div key={prompt.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <a href={`/prompts/${prompt.id}`} className="text-sm font-medium text-foreground hover:text-[#546ee5] transition-colors">
                        {prompt.title}
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span className="text-sm">{prompt._count.favorites}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity and Trending Side by Side */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#6379c3] to-[#546ee5]" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.type} • {new Date(activity.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trending Section */}
        <TrendingSection />
      </div>
    </div>
  );
}