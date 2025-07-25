"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  Clock, 
  GitBranch, 
  RotateCcw, 
  Trash2, 
  Eye, 
  ChevronDown,
  ChevronUp,
  FileText,
  GitCompare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingStates } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  getPromptVersions,
  restorePromptVersion,
  deletePromptVersion
} from "@/app/actions/prompt-version.actions";
import { PromptDiffModal } from "./prompt-diff-modal";

interface PromptVersion {
  id: string;
  content: string;
  version: string | null;
  changeMessage: string | null;
  createdAt: Date;
}

interface PromptHistoryTimelineProps {
  promptId: string;
  currentContent: string;
  currentTitle?: string;
  onRestore?: () => void;
}

export function PromptHistoryTimeline({ 
  promptId,
  currentContent,
  currentTitle = "Current Version",
  onRestore 
}: PromptHistoryTimelineProps) {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const [showDiffDialog, setShowDiffDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [diffVersion, setDiffVersion] = useState<PromptVersion | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadVersions = async () => {
      try {
        setLoading(true);
        const data = await getPromptVersions(promptId);
        setVersions(data);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load version history",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadVersions();
  }, [promptId, toast]);

  const handleRestore = async () => {
    if (!selectedVersion) return;

    try {
      setProcessingAction("restore");
      const result = await restorePromptVersion(promptId, selectedVersion.id);
      
      toast({
        title: "Success",
        description: `Restored to ${result.restoredVersion}`
      });
      
      setShowRestoreDialog(false);
      setSelectedVersion(null);
      
      // Reload versions and notify parent
      const data = await getPromptVersions(promptId);
      setVersions(data);
      onRestore?.();
    } catch {
      toast({
        title: "Error",
        description: "Failed to restore version",
        variant: "destructive"
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedVersion) return;

    try {
      setProcessingAction("delete");
      await deletePromptVersion(promptId, selectedVersion.id);
      
      toast({
        title: "Success",
        description: "Version deleted successfully"
      });
      
      setShowDeleteDialog(false);
      setSelectedVersion(null);
      
      // Reload versions
      const data = await getPromptVersions(promptId);
      setVersions(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete version",
        variant: "destructive"
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const toggleVersionExpanded = (versionId: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  const getDiffPreview = (oldContent: string, newContent: string) => {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    let addedCount = 0;
    let removedCount = 0;
    
    for (let i = 0; i < maxLines; i++) {
      if (i >= oldLines.length) {
        addedCount++;
      } else if (i >= newLines.length) {
        removedCount++;
      } else if (oldLines[i] !== newLines[i]) {
        addedCount++;
        removedCount++;
      }
    }
    
    return { addedCount, removedCount };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingStates.List count={3} />
        </CardContent>
      </Card>
    );
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            type="noData"
            icon={Clock}
            title="No version history yet"
            description="Versions are created when you save changes to your prompt."
            size="sm"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Version History
            </div>
            <Badge variant="secondary">{versions.length} versions</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {/* Current version indicator */}
              <div className="flex items-start gap-4 pb-4 border-b">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Current Version</span>
                    <Badge variant="default" className="text-xs">Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Last modified {formatDistanceToNow(new Date(), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Version timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                
                {versions.map((version, index) => {
                  const isExpanded = expandedVersions.has(version.id);
                  const isLatest = index === 0;
                  const diff = index < versions.length - 1 
                    ? getDiffPreview(versions[index + 1].content, version.content)
                    : getDiffPreview("", version.content);

                  return (
                    <div key={version.id} className="relative flex items-start gap-4 pb-6">
                      {/* Timeline node */}
                      <div className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10",
                        isLatest ? "bg-[hsl(var(--primary))]/20" : "bg-muted"
                      )}>
                        <GitBranch className={cn(
                          "h-5 w-5",
                          isLatest ? "text-[hsl(var(--primary))]" : "text-muted-foreground"
                        )} />
                      </div>
                      
                      {/* Version content */}
                      <div className="flex-1 bg-card border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {version.version || `Version ${versions.length - index}`}
                              </span>
                              {version.changeMessage && (
                                <Badge variant="outline" className="text-xs">
                                  {version.changeMessage}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                            </p>
                            
                            {/* Diff summary */}
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-green-600">
                                +{diff.addedCount} added
                              </span>
                              <span className="text-red-600">
                                -{diff.removedCount} removed
                              </span>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleVersionExpanded(version.id)}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isExpanded ? "Hide content" : "Show content"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedVersion(version);
                                      setShowDiffDialog(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View full content</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDiffVersion(version);
                                    }}
                                  >
                                    <GitCompare className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Compare with current</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedVersion(version);
                                      setShowRestoreDialog(true);
                                    }}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Restore this version</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {versions.length > 1 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedVersion(version);
                                        setShowDeleteDialog(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete this version</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                        
                        {/* Expanded content preview */}
                        {isExpanded && (
                          <div className="mt-4 p-3 bg-muted rounded-md">
                            <pre className="text-sm whitespace-pre-wrap break-words">
                              {version.content.substring(0, 200)}
                              {version.content.length > 200 && "..."}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* View Content Dialog */}
      <Dialog open={showDiffDialog} onOpenChange={setShowDiffDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedVersion?.version || "Version Content"}
            </DialogTitle>
            <DialogDescription>
              Created {selectedVersion && formatDistanceToNow(new Date(selectedVersion.createdAt), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] mt-4 p-4 bg-muted rounded-md">
            <pre className="text-sm whitespace-pre-wrap break-words">
              {selectedVersion?.content}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Version</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore to {selectedVersion?.version}? 
              The current content will be saved as a new version before restoring.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRestoreDialog(false)}
              disabled={processingAction === "restore"}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestore}
              disabled={processingAction === "restore"}
            >
              {processingAction === "restore" ? "Restoring..." : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Version</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedVersion?.version}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={processingAction === "delete"}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={processingAction === "delete"}
            >
              {processingAction === "delete" ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diff Comparison Modal */}
      {diffVersion && (
        <PromptDiffModal
          open={!!diffVersion}
          onOpenChange={(open) => !open && setDiffVersion(null)}
          leftPrompt={{
            id: "current",
            title: currentTitle,
            content: currentContent,
            createdAt: new Date(),
            updatedAt: new Date(),
          }}
          rightPrompt={{
            id: diffVersion.id,
            title: diffVersion.version || `Version from ${formatDistanceToNow(new Date(diffVersion.createdAt), { addSuffix: true })}`,
            content: diffVersion.content,
            createdAt: new Date(diffVersion.createdAt),
            updatedAt: new Date(diffVersion.createdAt),
          }}
          leftTitle="Current Version"
          rightTitle={diffVersion.version || "Previous Version"}
        />
      )}
    </>
  );
}