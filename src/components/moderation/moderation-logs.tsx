'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Calendar,
  User,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Flag,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getModerationLogs } from '@/app/actions/moderation.actions';
import { toast } from 'sonner';

interface ModerationLog {
  id: string;
  contentType: string;
  contentId: string;
  action: string;
  reason: string | null;
  automated: boolean;
  reviewedBy: string | null;
  createdAt: Date;
  rule?: {
    id: string;
    name: string;
  } | null;
}

interface ModerationLogsProps {
  initialLogs: ModerationLog[];
}

const ACTION_CONFIG = {
  FLAG: {
    icon: Flag,
    label: 'Flagged',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  },
  REJECT: {
    icon: XCircle,
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  },
  APPROVE: {
    icon: CheckCircle,
    label: 'Approved',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  },
  BLOCK: {
    icon: Shield,
    label: 'Blocked',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  },
  REQUIRE_REVIEW: {
    icon: AlertCircle,
    label: 'Review Required',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  },
};

export function ModerationLogs({ initialLogs }: ModerationLogsProps) {
  const [logs, setLogs] = useState<ModerationLog[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [limit, setLimit] = useState(100);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const contentType = filter === 'all' ? undefined : filter;
      const result = await getModerationLogs(limit, contentType);

      if (result.success && result.logs) {
        setLogs(result.logs);
      } else {
        toast.error(result.error || 'Failed to load logs');
      }
    } catch {
      toast.error('An error occurred loading logs');
    } finally {
      setLoading(false);
    }
  }, [filter, limit]);

  useEffect(() => {
    if (filter !== 'all' || limit !== 100) {
      loadLogs();
    }
  }, [filter, limit, loadLogs]);

  const handleRefresh = () => {
    loadLogs();
  };

  const getActionConfig = (action: string) => {
    return ACTION_CONFIG[action as keyof typeof ACTION_CONFIG] || {
      icon: AlertCircle,
      label: action,
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Moderation Logs
            </CardTitle>
            <CardDescription>
              Audit trail of all moderation actions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="prompt">Prompts</SelectItem>
                <SelectItem value="comment">Comments</SelectItem>
                <SelectItem value="user">Users</SelectItem>
              </SelectContent>
            </Select>

            <Select value={limit.toString()} onValueChange={(val) => setLimit(Number(val))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 logs</SelectItem>
                <SelectItem value="100">100 logs</SelectItem>
                <SelectItem value="200">200 logs</SelectItem>
                <SelectItem value="500">500 logs</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No moderation logs found</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => {
                const actionConfig = getActionConfig(log.action);
                const ActionIcon = actionConfig.icon;

                return (
                  <Card key={log.id} className="border-l-4" style={{ borderLeftColor: 'currentColor' }}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-full ${actionConfig.color}`}>
                            <ActionIcon className="w-4 h-4" />
                          </div>

                          <div className="flex-1 space-y-2">
                            {/* Action and Type */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={actionConfig.color}>
                                {actionConfig.label}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {log.contentType}
                              </Badge>
                              {log.automated ? (
                                <Badge variant="secondary" className="gap-1">
                                  <Shield className="w-3 h-3" />
                                  Automated
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <User className="w-3 h-3" />
                                  Manual
                                </Badge>
                              )}
                            </div>

                            {/* Rule Name */}
                            {log.rule && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Rule: </span>
                                <span className="font-medium">{log.rule.name}</span>
                              </div>
                            )}

                            {/* Reason */}
                            {log.reason && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Reason: </span>
                                <span>{log.reason}</span>
                              </div>
                            )}

                            {/* Content ID */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="font-mono">{log.contentId.substring(0, 12)}...</span>

                              {log.reviewedBy && !log.automated && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span>Reviewed by moderator</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {logs.length > 0 && (
          <div className="mt-4 pt-4 border-t text-center text-sm text-muted-foreground">
            Showing {logs.length} most recent logs
          </div>
        )}
      </CardContent>
    </Card>
  );
}
