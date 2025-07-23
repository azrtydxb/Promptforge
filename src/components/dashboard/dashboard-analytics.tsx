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

const COLORS = ['#007DB8', '#0F8CE6', '#40A9FF', '#69C0FF', '#91D5FF'];

export function DashboardAnalytics({ data }: DashboardAnalyticsProps) {
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prompts</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPrompts}</div>
            <p className="text-xs text-muted-foreground">
              Active prompt templates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Folders</CardTitle>
            <Folder className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalFolders}</div>
            <p className="text-xs text-muted-foreground">
              Organization structures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tags</CardTitle>
            <Tag className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalTags}</div>
            <p className="text-xs text-muted-foreground">
              Unique categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Versions</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalVersions}</div>
            <p className="text-xs text-muted-foreground">
              Total revisions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* All Charts in Single Horizontal Row */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-4">
        {/* Trends */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trends</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <SectionErrorBoundary fallback={<MinimalErrorFallback />}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.promptGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="prompts"
                  stroke="#007DB8"
                  strokeWidth={2}
                  name="New Prompts"
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#0F8CE6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Total Prompts"
                />
                </LineChart>
              </ResponsiveContainer>
            </SectionErrorBoundary>
          </CardContent>
        </Card>

        {/* Folders */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Folders</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <SectionErrorBoundary fallback={<MinimalErrorFallback />}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                <Pie
                  data={data.promptsByFolder}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.promptsByFolder.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value}`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </SectionErrorBoundary>
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <SectionErrorBoundary fallback={<MinimalErrorFallback />}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.promptsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#007DB8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionErrorBoundary>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tags</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2 max-h-[180px] overflow-y-auto">
              {data.topTags.map((tag) => (
                <div key={tag.name} className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium leading-none truncate pr-1">{tag.name}</p>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">{tag.count}</p>
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
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
            <CardTitle>Recently Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentlyUsedPrompts.map((prompt) => (
                <div key={prompt.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <a href={`/prompts/${prompt.id}`} className="text-sm font-medium hover:text-blue-600 transition-colors">
                      {prompt.title}
                    </a>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        Last used: {prompt.lastUsedAt ? new Date(prompt.lastUsedAt).toLocaleDateString() : 'Never'}
                      </p>
                      {prompt.tags.length > 0 && (
                        <div className="flex gap-1">
                          {prompt.tags.slice(0, 2).map((tag, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
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
              <CardTitle>Most Popular Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.mostLikedPrompts.map((prompt, index) => (
                  <div key={prompt.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <a href={`/prompts/${prompt.id}`} className="text-sm font-medium hover:text-blue-600 transition-colors">
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
              <CardTitle>Most Edited Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.mostVersionedPrompts.map((prompt, index) => (
                  <div key={prompt.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <a href={`/prompts/${prompt.id}`} className="text-sm font-medium hover:text-blue-600 transition-colors">
                        {prompt.title}
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <History className="h-3 w-3 text-blue-500" />
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
              <CardTitle>Most Favorited Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.mostFavoritedPrompts.map((prompt, index) => (
                  <div key={prompt.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <a href={`/prompts/${prompt.id}`} className="text-sm font-medium hover:text-blue-600 transition-colors">
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

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
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
    </div>
  );
}