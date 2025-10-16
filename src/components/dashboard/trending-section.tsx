"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UnifiedPromptCardClean as UnifiedPromptCard } from "@/components/ui/unified-prompt-card-clean";
import { getTrendingPrompts, getTrendingCategories, getTrendingStats, type TimePeriod, type TrendingMetric } from "@/app/actions/trending.actions";
import {
  TrendingUp,
  Eye,
  Heart,
  Copy,
  MessageSquare,
  Zap,
  Loader2,
  Calendar,
  Filter,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { useTheme } from "next-themes";

interface TrendingSectionProps {
  userId?: string;
  className?: string;
}

const METRIC_CONFIG: Record<TrendingMetric, { 
  label: string; 
  icon: React.ElementType; 
  color: string;
  description: string;
}> = {
  views: { 
    label: "Most Viewed", 
    icon: Eye, 
    color: "#546ee5",
    description: "Prompts with the most views"
  },
  likes: { 
    label: "Most Liked", 
    icon: Heart, 
    color: "#ef4444",
    description: "Prompts receiving the most likes"
  },
  copies: { 
    label: "Most Copied", 
    icon: Copy, 
    color: "#10b981",
    description: "Prompts copied to the most libraries"
  },
  comments: { 
    label: "Most Discussed", 
    icon: MessageSquare, 
    color: "#f59e0b",
    description: "Prompts with active discussions"
  },
  rising: { 
    label: "Rising Fast", 
    icon: Zap, 
    color: "#8b5cf6",
    description: "Fastest growing prompts"
  }
};

const TIME_PERIOD_CONFIG: Record<TimePeriod, { label: string; icon?: React.ElementType }> = {
  today: { label: "Today" },
  week: { label: "This Week" },
  month: { label: "This Month" },
  all: { label: "All Time" }
};

export function TrendingSection({ userId, className }: TrendingSectionProps) {
  const { theme } = useTheme();
  const [selectedMetric, setSelectedMetric] = useState<TrendingMetric>("views");
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("week");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [trendingPrompts, setTrendingPrompts] = useState<unknown[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; count: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<Array<{ date: string; value: number }>>([]);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      const result = await getTrendingCategories();
      if (result.success && result.categories) {
        setCategories(result.categories);
      }
    };
    loadCategories();
  }, []);

  // Load trending prompts when filters change
  const loadTrendingData = useCallback(async () => {
      setIsLoading(true);

      try {
        const [promptsResult, statsResult] = await Promise.all([
          getTrendingPrompts({
            metric: selectedMetric,
            period: selectedPeriod,
            category: selectedCategory,
            limit: 5
          }),
          getTrendingStats({ period: selectedPeriod, userId })
        ]);

        if (promptsResult.success && promptsResult.prompts) {
          setTrendingPrompts(promptsResult.prompts as unknown[]);
        } else {
          toast.error("Failed to load trending data");
        }

        // Process stats data for chart based on selected metric
        if (statsResult.success && statsResult.stats) {
          const stats = statsResult.stats;
          let dataSource = stats.viewsByDay;

          switch (selectedMetric) {
            case 'likes':
              dataSource = stats.likesByDay;
              break;
            case 'copies':
              dataSource = stats.copiesByDay;
              break;
            case 'views':
            default:
              dataSource = stats.viewsByDay;
              break;
          }

          const chartData = dataSource.map(item => ({
            date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: item.count
          }));

          setChartData(chartData);
        }
      } catch (error) {
        console.error("Error loading trending data:", error);
        toast.error("Failed to load trending data");
      } finally {
        setIsLoading(false);
      }
    }, [selectedMetric, selectedPeriod, selectedCategory, userId]);

  useEffect(() => {
    loadTrendingData();
  }, [loadTrendingData]);

  const handlePromptLike = (promptId: string, isLiked: boolean) => {
    setTrendingPrompts(prev => prev.map((prompt: unknown) => {
      const p = prompt as { id: string; isLiked?: boolean; likeCount: number };
      return p.id === promptId
        ? { ...p, isLiked, likeCount: p.likeCount + (isLiked ? 1 : -1) }
        : p;
    }));
  };

  const handlePromptCopy = (promptId: string) => {
    setTrendingPrompts(prev => prev.map((prompt: unknown) => {
      const p = prompt as { id: string; copyCount: number };
      return p.id === promptId
        ? { ...p, copyCount: p.copyCount + 1 }
        : p;
    }));
  };

  const chartColors = {
    grid: theme === 'dark' ? '#36404d' : '#e7ebf0',
    text: theme === 'dark' ? '#a1acb8' : '#6c757d',
    tooltip: {
      bg: theme === 'dark' ? '#313a46' : '#ffffff',
      border: theme === 'dark' ? '#36404d' : '#e7ebf0'
    }
  };

  const MetricIcon = METRIC_CONFIG[selectedMetric].icon;

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#546ee5]" />
            <CardTitle>Trending Prompts</CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[140px] h-8">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-categories">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name} ({category.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Time Period Selector */}
            <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as TimePeriod)}>
              <SelectTrigger className="w-[120px] h-8">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIME_PERIOD_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Metric Tabs */}
        <Tabs value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as TrendingMetric)}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 w-full">
            {Object.entries(METRIC_CONFIG).map(([metric, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger 
                  key={metric} 
                  value={metric}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{config.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={selectedMetric} className="mt-6 space-y-6">
            {/* Metric Description */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <MetricIcon className="h-5 w-5" style={{ color: METRIC_CONFIG[selectedMetric].color }} />
              <div>
                <p className="text-sm font-medium">{METRIC_CONFIG[selectedMetric].label}</p>
                <p className="text-xs text-muted-foreground">
                  {METRIC_CONFIG[selectedMetric].description}
                </p>
              </div>
            </div>

            {/* Trend Chart */}
            {isLoading ? (
              <div className="h-[200px] bg-muted/30 rounded-lg animate-pulse" />
            ) : chartData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
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
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartColors.tooltip.bg,
                        border: `1px solid ${chartColors.tooltip.border}`,
                        borderRadius: '6px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={METRIC_CONFIG[selectedMetric].color}
                      fill={METRIC_CONFIG[selectedMetric].color}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Chart data will be available soon</p>
              </div>
            )}

            {/* Trending Prompts List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : trendingPrompts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No trending prompts found for this period
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {trendingPrompts.map((promptData: unknown, index) => {
                  const prompt = promptData as {
                    id: string;
                    periodMetricCount: number;
                    metricLabel: string;
                    viewCount: number;
                  };
                  return (
                    <div key={prompt.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <UnifiedPromptCard
                          variant="shared"
                          data={promptData as never}
                          onLikeToggle={handlePromptLike}
                          onCopy={handlePromptCopy}
                          className="shadow-sm"
                        />
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="font-medium" style={{ color: METRIC_CONFIG[selectedMetric].color }}>
                            {prompt.periodMetricCount} {prompt.metricLabel} {selectedPeriod !== 'all' && `in ${TIME_PERIOD_CONFIG[selectedPeriod].label.toLowerCase()}`}
                          </span>
                          <span>&bull;</span>
                          <span>{prompt.viewCount} total views</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* View All Button */}
                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.href = '/shared-prompts'}
                  >
                    View All Trending Prompts
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}