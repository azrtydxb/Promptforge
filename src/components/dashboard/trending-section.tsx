"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnifiedPromptCardClean as UnifiedPromptCard } from "@/components/ui/unified-prompt-card-clean";
import { getTrendingPrompts, getTrendingCategories, type TimePeriod, type TrendingMetric } from "@/app/actions/trending.actions";
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
  LineChart,
  Line,
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
  const [trendingPrompts, setTrendingPrompts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; count: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

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
  useEffect(() => {
    const loadTrendingData = async () => {
      setIsLoading(true);
      
      try {
        const result = await getTrendingPrompts({
          metric: selectedMetric,
          period: selectedPeriod,
          category: selectedCategory,
          limit: 5
        });

        if (result.success && result.prompts) {
          setTrendingPrompts(result.prompts);
          
          // Generate mock chart data for visualization
          // In a real app, this would come from getTrendingStats
          const days = selectedPeriod === 'today' ? 24 : selectedPeriod === 'week' ? 7 : 30;
          const mockChartData = Array.from({ length: days }, (_, i) => {
            const date = new Date();
            if (selectedPeriod === 'today') {
              date.setHours(date.getHours() - (days - i - 1));
            } else {
              date.setDate(date.getDate() - (days - i - 1));
            }
            
            return {
              date: selectedPeriod === 'today' 
                ? date.toLocaleTimeString('en-US', { hour: 'numeric' })
                : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              value: Math.floor(Math.random() * 100) + 20
            };
          });
          setChartData(mockChartData);
        } else {
          toast.error("Failed to load trending data");
        }
      } catch (error) {
        console.error("Error loading trending data:", error);
        toast.error("Failed to load trending data");
      } finally {
        setIsLoading(false);
      }
    };

    loadTrendingData();
  }, [selectedMetric, selectedPeriod, selectedCategory]);

  const handlePromptLike = (promptId: string, isLiked: boolean) => {
    setTrendingPrompts(prev => prev.map(prompt => 
      prompt.id === promptId 
        ? { ...prompt, isLiked, likeCount: prompt.likeCount + (isLiked ? 1 : -1) }
        : prompt
    ));
  };

  const handlePromptCopy = (promptId: string) => {
    setTrendingPrompts(prev => prev.map(prompt => 
      prompt.id === promptId 
        ? { ...prompt, copyCount: prompt.copyCount + 1 }
        : prompt
    ));
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
          <TabsList className="grid grid-cols-5 w-full">
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
                {trendingPrompts.map((prompt, index) => (
                  <div key={prompt.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <UnifiedPromptCard
                        variant="shared"
                        data={prompt}
                        onLikeToggle={handlePromptLike}
                        onCopy={handlePromptCopy}
                        className="shadow-sm"
                      />
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-medium" style={{ color: METRIC_CONFIG[selectedMetric].color }}>
                          {prompt.periodMetricCount} {prompt.metricLabel} {selectedPeriod !== 'all' && `in ${TIME_PERIOD_CONFIG[selectedPeriod].label.toLowerCase()}`}
                        </span>
                        <span>•</span>
                        <span>{prompt.viewCount} total views</span>
                      </div>
                    </div>
                  </div>
                ))}

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