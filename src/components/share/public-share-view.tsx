"use client";

import { useState } from "react";
import { validateShareAccess } from "@/app/actions/prompt-share.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarRoot as Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, Check, Lock, Calendar, Share2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface ShareSettings {
  showAuthor?: boolean;
  allowEmbed?: boolean;
  expiresIn?: string;
}

interface PublicShareViewProps {
  shareData: {
    id: string;
    title: string;
    description: string | null;
    content: string;
    tags: string[];
    hasPassword: boolean;
    createdAt: Date;
    settings: ShareSettings;
    user: {
      id: string;
      name: string | null;
      username: string;
      image: string | null;
    };
  };
  shareId: string;
}

export function PublicShareView({ shareData, shareId }: PublicShareViewProps) {
  const [isUnlocked, setIsUnlocked] = useState(!shareData.hasPassword);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleUnlock = async () => {
    if (!password) {
      setError("Please enter a password");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await validateShareAccess(shareId, password);
      
      if (result.valid) {
        setIsUnlocked(true);
      } else {
        setError(
          result.reason === "invalid_password" 
            ? "Incorrect password" 
            : "Access denied"
        );
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareData.content);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Prompt content copied to clipboard"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.description || "Check out this prompt on PromptForge",
          url: shareUrl
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback to copying URL
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Share link copied to clipboard"
        });
      } catch {
        toast({
          title: "Error",
          description: "Failed to copy share link",
          variant: "destructive"
        });
      }
    }
  };

  // Password protection screen
  if (!isUnlocked) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-muted rounded-full">
                <Lock className="h-6 w-6" />
              </div>
            </div>
            <CardTitle>Password Protected</CardTitle>
            <CardDescription>
              This prompt is password protected. Enter the password to view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleUnlock(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  disabled={isLoading}
                />
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Unlocking..." : "Unlock"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main content view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold">PromptForge</span>
            </Link>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Title and Description */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{shareData.title}</h1>
            {shareData.description && (
              <p className="text-lg text-muted-foreground">
                {shareData.description}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 items-center text-sm text-muted-foreground">
            {shareData.settings.showAuthor && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {shareData.user.image && (
                    <AvatarImage
                      src={shareData.user.image}
                      alt={shareData.user.name || shareData.user.username}
                    />
                  )}
                  <AvatarFallback>
                    {shareData.user.name?.[0] || shareData.user.username[0]}
                  </AvatarFallback>
                </Avatar>
                <span>{shareData.user.name || shareData.user.username}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Shared {format(new Date(shareData.createdAt), "MMM d, yyyy")}</span>
            </div>
          </div>

          {/* Tags */}
          {shareData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {shareData.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Prompt Content */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Prompt Content</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-md p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {shareData.content}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <Card className="bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/30">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h2 className="text-xl font-semibold">
                  Create Your Own Prompts
                </h2>
                <p className="text-muted-foreground">
                  Join PromptForge to create, organize, and share your own AI prompts.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href="/register">
                    <Button>Get Started Free</Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline">Sign In</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} PromptForge. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}