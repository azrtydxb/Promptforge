"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvatarRoot as Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommentList } from "@/components/comments/comment-list";
import { SimilarPrompts } from "@/components/prompts/similar-prompts";
import { UserReputation } from "@/components/ui/user-reputation";
import { copySharedPrompt } from "@/app/actions/shared-prompts.actions";
import { togglePromptLike } from "@/app/actions/likes-comments.actions";
import { 
  Copy, 
  Heart, 
  Eye, 
  MessageSquare, 
  Share2, 
  ArrowLeft,
  Code2,
  Calendar,
  Shield,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface SharedPromptDetailProps {
  sharedPrompt: {
    id: string;
    promptId: string;
    title: string;
    description?: string | null;
    content: string;
    publishedAt: Date | null;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    copyCount: number;
    isLiked?: boolean;
    author: {
      id: string;
      username: string | null;
      name: string | null;
      avatarType: string;
      profilePicture: string | null;
      reputationScore?: number;
    };
    prompt: {
      tags: Array<{
        id: string;
        name: string;
      }>;
    };
    comments?: any[];
  };
}

export function SharedPromptDetail({ sharedPrompt }: SharedPromptDetailProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(sharedPrompt.isLiked || false);
  const [likeCount, setLikeCount] = useState(sharedPrompt.likeCount);
  const [copyCount, setCopyCount] = useState(sharedPrompt.copyCount);
  const [isCopying, setIsCopying] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");

  const authorDisplayName = sharedPrompt.author.name || sharedPrompt.author.username || "Anonymous";
  const authorInitials = authorDisplayName.slice(0, 2).toUpperCase();

  const handleBack = () => {
    router.push("/shared-prompts");
  };

  const handleLike = async () => {
    if (!session?.user) {
      toast.error("Please sign in to like prompts");
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

    try {
      const result = await togglePromptLike(sharedPrompt.promptId);
      
      if (result.success) {
        // The action returns isLiked but not likeCount
        // So we keep the optimistic update for likeCount
      } else {
        // Revert on error
        setIsLiked(sharedPrompt.isLiked || false);
        setLikeCount(sharedPrompt.likeCount);
        toast.error("Failed to update like");
      }
    } catch (error) {
      // Revert on error
      setIsLiked(sharedPrompt.isLiked || false);
      setLikeCount(sharedPrompt.likeCount);
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  const handleCopy = async () => {
    if (!session?.user) {
      toast.error("Please sign in to copy prompts");
      return;
    }

    if (isCopying) return;

    setIsCopying(true);
    
    try {
      const result = await copySharedPrompt(sharedPrompt.id);
      
      if (result.success) {
        setCopyCount(copyCount + 1);
        toast.success("Prompt copied to your library!");
        
        // Optionally navigate to the new prompt
        if (result.promptId) {
          setTimeout(() => {
            router.push(`/prompts/${result.promptId}`);
          }, 1000);
        }
      } else {
        toast.error(result.error || "Failed to copy prompt");
      }
    } catch (error) {
      toast.error("Failed to copy prompt");
    } finally {
      setIsCopying(false);
    }
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prompt Details Card */}
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold">{sharedPrompt.title}</h1>
                  {sharedPrompt.description && (
                    <p className="text-muted-foreground">{sharedPrompt.description}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>

              {/* Author Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {sharedPrompt.author.profilePicture && (
                      <AvatarImage src={sharedPrompt.author.profilePicture} alt={authorDisplayName} />
                    )}
                    <AvatarFallback>{authorInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{authorDisplayName}</span>
                      {sharedPrompt.author.reputationScore && sharedPrompt.author.reputationScore > 100 && (
                        <Shield className="h-4 w-4 text-[#546ee5]" />
                      )}
                    </div>
                    {sharedPrompt.author.reputationScore && (
                      <UserReputation reputationScore={sharedPrompt.author.reputationScore} size="sm" />
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {sharedPrompt.publishedAt && format(new Date(sharedPrompt.publishedAt), "MMM d, yyyy")}
                </div>
              </div>

              {/* Tags */}
              {sharedPrompt.prompt.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sharedPrompt.prompt.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2">
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{sharedPrompt.viewCount} views</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  <span>{likeCount} likes</span>
                </div>
                <div className="flex items-center gap-1">
                  <Copy className="h-4 w-4" />
                  <span>{copyCount} copies</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{sharedPrompt.commentCount} comments</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={isLiked ? "default" : "outline"}
                  onClick={handleLike}
                  disabled={isLiking}
                  className={cn(
                    "gap-2",
                    isLiked && "bg-red-500 hover:bg-red-600"
                  )}
                >
                  <Heart className={cn(
                    "h-4 w-4",
                    isLiked && "fill-current"
                  )} />
                  {isLiked ? "Liked" : "Like"}
                </Button>

                <Button
                  onClick={handleCopy}
                  disabled={isCopying}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {isCopying ? "Copying..." : "Copy to Library"}
                </Button>
              </div>

              {/* Prompt Content */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="raw">Raw</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          const isInline = !match && !className;

                          return !isInline && match ? (
                            <SyntaxHighlighter
                              style={vscDarkPlus as any}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {sharedPrompt.content}
                    </ReactMarkdown>
                  </div>
                </TabsContent>

                <TabsContent value="raw" className="mt-4">
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg overflow-x-auto">
                      <code>{sharedPrompt.content}</code>
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={async () => {
                        await navigator.clipboard.writeText(sharedPrompt.content);
                        toast.success("Copied to clipboard!");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardContent className="pt-6">
              <CommentList
                sharedPromptId={sharedPrompt.id}
                promptAuthorId={sharedPrompt.author.id}
                initialComments={sharedPrompt.comments || []}
                commentCount={sharedPrompt.commentCount}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Author Card */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">About the Author</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {sharedPrompt.author.profilePicture && (
                    <AvatarImage src={sharedPrompt.author.profilePicture} alt={authorDisplayName} />
                  )}
                  <AvatarFallback>{authorInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{authorDisplayName}</p>
                  {sharedPrompt.author.reputationScore && (
                    <UserReputation reputationScore={sharedPrompt.author.reputationScore} />
                  )}
                </div>
              </div>
              
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => router.push(`/profile/${sharedPrompt.author.username}`)}
              >
                View Profile
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Similar Prompts */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Similar Prompts</h3>
            </CardHeader>
            <CardContent>
              <SimilarPrompts
                promptId={sharedPrompt.promptId}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}