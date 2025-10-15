'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AvatarRoot as Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Flag, User, Calendar, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { moderatePrompt } from '@/app/actions/moderation.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SharedPrompt {
  id: string;
  title: string;
  description: string | null;
  content: string;
  status: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
  prompt: {
    title: string;
    description: string | null;
  };
}

interface ModerationQueueProps {
  prompts: SharedPrompt[];
  onModerated: () => void;
  type: 'pending' | 'flagged';
}

export function ModerationQueue({ prompts, onModerated, type }: ModerationQueueProps) {
  const router = useRouter();
  const [selectedPrompt, setSelectedPrompt] = useState<SharedPrompt | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [moderating, setModerating] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleApprove = async (promptId: string) => {
    setModerating(true);
    try {
      const result = await moderatePrompt({
        promptId,
        status: 'APPROVED',
      });

      if (result.success) {
        toast.success('Content approved successfully');
        onModerated();
        router.refresh();
        setSelectedPrompt(null);
      } else {
        toast.error(result.error || 'Failed to approve content');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setModerating(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPrompt || !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setModerating(true);
    try {
      const result = await moderatePrompt({
        promptId: selectedPrompt.id,
        status: 'REJECTED',
        reason: rejectReason,
      });

      if (result.success) {
        toast.success('Content rejected successfully');
        onModerated();
        router.refresh();
        setShowRejectDialog(false);
        setSelectedPrompt(null);
        setRejectReason('');
      } else {
        toast.error(result.error || 'Failed to reject content');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setModerating(false);
    }
  };

  const handleFlag = async (promptId: string) => {
    setModerating(true);
    try {
      const result = await moderatePrompt({
        promptId,
        status: 'FLAGGED',
      });

      if (result.success) {
        toast.success('Content flagged for review');
        onModerated();
        router.refresh();
        setSelectedPrompt(null);
      } else {
        toast.error(result.error || 'Failed to flag content');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setModerating(false);
    }
  };

  if (prompts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12">
          <div className="text-center text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No {type} content to review</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        {prompts.map((prompt) => (
          <Card key={prompt.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <CardTitle className="text-xl">{prompt.prompt.title}</CardTitle>
                  {prompt.prompt.description && (
                    <p className="text-sm text-muted-foreground">
                      {prompt.prompt.description}
                    </p>
                  )}
                </div>
                <Badge variant={type === 'flagged' ? 'destructive' : 'secondary'}>
                  {type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Author Info */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    {prompt.author.image && (
                      <AvatarImage
                        src={prompt.author.image}
                        alt={prompt.author.name || 'User'}
                      />
                    )}
                    <AvatarFallback>
                      {(prompt.author.name || prompt.author.username || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <User className="w-4 h-4" />
                  <span>{prompt.author.name || prompt.author.username}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatDistanceToNow(new Date(prompt.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Content Preview */}
              <div className="border rounded-md p-4 bg-muted/30 max-h-40 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {prompt.content.substring(0, 500)}
                  {prompt.content.length > 500 && '...'}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => handleApprove(prompt.id)}
                  disabled={moderating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {moderating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPrompt(prompt);
                    setShowRejectDialog(true);
                  }}
                  disabled={moderating}
                  className="border-red-600 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                {type === 'pending' && (
                  <Button
                    variant="outline"
                    onClick={() => handleFlag(prompt.id)}
                    disabled={moderating}
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Flag for Review
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Content</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this content. The author will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this content is being rejected..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleReject}
                disabled={moderating || !rejectReason.trim()}
                variant="destructive"
                className="flex-1"
              >
                {moderating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Confirm Rejection'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason('');
                }}
                disabled={moderating}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
