"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  RotateCcw,
  Eye
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
import { toast } from "sonner";
import {
  getPromptVersions,
  restorePromptVersion
} from "@/app/actions/prompt-version.actions";

interface PromptVersion {
  id: string;
  content: string;
  version: string | null;
  changeMessage: string | null;
  createdAt: Date;
}

interface PromptHistoryTimelineProps {
  promptId: string;
  onRestore?: () => void;
  onLoad?: (content: string) => void;  // NEW: callback to load version content into IDE
}

export function PromptHistoryTimeline({
  promptId,
  onRestore,
  onLoad  // Add this
}: PromptHistoryTimelineProps) {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [processingRevert, setProcessingRevert] = useState(false);

  useEffect(() => {
    const loadVersions = async () => {
      try {
        setLoading(true);
        const data = await getPromptVersions(promptId);
        setVersions(data);
      } catch {
        toast.error("Failed to load version history");
      } finally {
        setLoading(false);
      }
    };


    loadVersions();
  }, [promptId]);

  const handleLoadVersion = (version: PromptVersion) => {
    // Load the version content into the IDE for viewing (read-only preview)
    onLoad?.(version.content);
  };

  const handleRevertVersion = async () => {
    if (!selectedVersion) return;

    try {
      setProcessingRevert(true);
      const result = await restorePromptVersion(promptId, selectedVersion.id);

      toast.success(`Reverted to ${result.restoredVersion}. Newer versions have been deleted.`);

      setShowRevertDialog(false);
      setSelectedVersion(null);

      // Reload versions and notify parent
      const data = await getPromptVersions(promptId);
      setVersions(data);
      onRestore?.();
    } catch {
      toast.error("Failed to revert to this version");
    } finally {
      setProcessingRevert(false);
    }
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
            <div className="space-y-3">
              {versions.map((version, index) => (
                <Card key={version.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-1">
                      {/* Version Info */}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">
                          {version.version || `Version ${versions.length - index}`}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadVersion(version)}
                          className="h-9 px-3"
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          Load
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedVersion(version);
                            setShowRevertDialog(true);
                          }}
                          className="h-9 px-3 bg-[#546ee5] hover:bg-[#4560d6] text-white"
                        >
                          <RotateCcw className="h-4 w-4 mr-1.5" />
                          Revert
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Revert Confirmation Dialog */}
      <Dialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert to This Version</DialogTitle>
            <DialogDescription>
              Are you sure you want to revert to {selectedVersion?.version}?
              <br /><br />
              <strong>Warning:</strong> This will permanently delete all versions created after this one.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRevertDialog(false);
                setSelectedVersion(null);
              }}
              disabled={processingRevert}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRevertVersion}
              disabled={processingRevert}
              className="bg-[#546ee5] hover:bg-[#4560d6] text-white"
            >
              {processingRevert ? "Reverting..." : "Revert and Delete Newer Versions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}