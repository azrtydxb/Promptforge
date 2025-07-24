'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Share2, 
  Loader2, 
  Globe, 
  Users, 
  Lock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { publishPromptToMarketplace } from '@/app/actions/shared-prompts.actions';
import { cn } from '@/lib/utils';

interface PublishPromptButtonProps {
  promptId: string;
  promptTitle: string;
  promptDescription?: string | null;
  isPublished?: boolean;
  onPublishSuccess?: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function PublishPromptButton({
  promptId,
  promptTitle,
  promptDescription,
  isPublished = false,
  onPublishSuccess,
  className,
  variant = 'outline',
  size = 'sm'
}: PublishPromptButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    message: string;
    status?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    title: promptTitle,
    description: promptDescription || '',
    visibility: 'PUBLIC' as 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
  });

  const handlePublish = async () => {
    if (isPublishing) return;

    setIsPublishing(true);
    setPublishResult(null);

    try {
      const result = await publishPromptToMarketplace({
        promptId,
        title: formData.title.trim() || promptTitle,
        description: formData.description.trim() || undefined,
        visibility: formData.visibility
      });

      setPublishResult({
        success: result.success,
        message: result.message || (result.success ? 'Published successfully!' : 'Failed to publish'),
        status: result.status
      });

      if (result.success) {
        setTimeout(() => {
          setIsOpen(false);
          onPublishSuccess?.();
          setPublishResult(null);
        }, 2000);
      }

    } catch (error) {
      console.error('Error publishing prompt:', error);
      setPublishResult({
        success: false,
        message: 'An error occurred while publishing'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    if (!isPublishing) {
      setIsOpen(false);
      setPublishResult(null);
      // Reset form data
      setFormData({
        title: promptTitle,
        description: promptDescription || '',
        visibility: 'PUBLIC'
      });
    }
  };

  const visibilityOptions = [
    {
      value: 'PUBLIC' as const,
      label: 'Public',
      description: 'Anyone can discover and use this prompt',
      icon: Globe
    },
    {
      value: 'UNLISTED' as const,
      label: 'Unlisted',
      description: 'Only people with the link can access',
      icon: Users
    },
    {
      value: 'PRIVATE' as const,
      label: 'Private',
      description: 'Only you can see this prompt',
      icon: Lock
    }
  ];

  if (isPublished) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className={cn("text-green-400 cursor-default", className)}
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Published
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn("text-white hover:text-white", className)}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Publish
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Publish to Marketplace
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Share your prompt with the community. All content will be reviewed for quality and appropriateness.
          </DialogDescription>
        </DialogHeader>

        {publishResult && (
          <div className={cn(
            "p-4 rounded-lg border",
            publishResult.success 
              ? "bg-green-100 border-green-300 text-green-700"
              : "bg-red-100 border-red-300 text-red-700"
          )}>
            <div className="flex items-center gap-2">
              {publishResult.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <span className="font-medium">{publishResult.message}</span>
            </div>
            {publishResult.status && (
              <p className="text-sm mt-1 text-gray-600">
                Status: {publishResult.status === 'APPROVED' ? 'Approved and live' : 'Pending review'}
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter a catchy title..."
              disabled={isPublishing}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what your prompt does and when to use it..."
              disabled={isPublishing}
              rows={3}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none"
            />
          </div>

          {/* Visibility */}
          <div className="space-y-3">
            <Label>Visibility</Label>
            <div className="space-y-2">
              {visibilityOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.value}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      formData.visibility === option.value
                        ? "border-[#007DB8] bg-[#007DB8]/10"
                        : "border-gray-600 hover:border-gray-500",
                      isPublishing && "cursor-not-allowed opacity-50"
                    )}
                    onClick={() => !isPublishing && setFormData(prev => ({ ...prev, visibility: option.value }))}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="radio"
                        checked={formData.visibility === option.value}
                        onChange={() => setFormData(prev => ({ ...prev, visibility: option.value }))}
                        disabled={isPublishing}
                        className="text-[#007DB8]"
                      />
                      <Icon className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-400">{option.description}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isPublishing}
            className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing || !formData.title.trim()}
            className="bg-[#007DB8] hover:bg-[#007DB8]/90 text-white"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Publish Prompt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}