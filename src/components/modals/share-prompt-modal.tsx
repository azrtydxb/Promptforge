"use client";

import { useState, useEffect, useCallback } from "react";
import { useModal } from "@/hooks/use-modal-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  createShareLink,
  getUserShareLinks,
  updateShareLink,
  deleteShareLink,
  getShareLinkAnalytics
} from "@/app/actions/prompt-share.actions";
import { 
  Copy, 
  Check, 
  Trash2, 
  Eye, 
  EyeOff, 
  Calendar,
  Activity,
  Share2,
  QrCode,
  AlertCircle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface ShareLink {
  id: string;
  shareId: string;
  title: string;
  description: string | null;
  isActive: boolean;
  expiresAt: Date | null;
  maxViews: number | null;
  createdAt: Date;
  viewCount: number;
  isExpired: boolean;
  prompt: {
    id: string;
    title: string;
  };
}

export function SharePromptModal() {
  const { isOpen, onClose, type, data } = useModal();
  const isModalOpen = isOpen && type === "sharePrompt";
  const { promptData } = data;

  const [activeTab, setActiveTab] = useState("create");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  
  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiresIn, setExpiresIn] = useState<"1h" | "1d" | "7d" | "30d" | "never">("7d");
  const [password, setPassword] = useState("");
  const [maxViews, setMaxViews] = useState<number | undefined>(undefined);
  const [showAuthor, setShowAuthor] = useState(true);
  const [allowEmbed, setAllowEmbed] = useState(false);
  
  // Share links state
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [selectedLink, setSelectedLink] = useState<ShareLink | null>(null);
  const [analytics, setAnalytics] = useState<{
    totalViews: number;
    uniqueVisitors: number;
    recentViews: Array<{
      viewedAt: Date;
      ipAddress: string | null;
      referer: string | null;
    }>;
    dailyViews: Array<{
      viewedAt: Date;
      _count?: number;
    }>;
    shareLink: ShareLink;
  } | null>(null);
  
  // New share link state
  const [newShareUrl, setNewShareUrl] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const loadShareLinks = useCallback(async () => {
    if (!promptData) return;
    
    try {
      const links = await getUserShareLinks();
      const promptLinks = links.filter((link) => 
        link.prompt.id === promptData.id
      );
      setShareLinks(promptLinks);
      
      if (promptLinks.length > 0) {
        setActiveTab("manage");
      }
    } catch (error) {
      console.error("Error loading share links:", error);
    }
  }, [promptData]);

  useEffect(() => {
    if (isModalOpen && promptData) {
      setTitle(promptData.title);
      setDescription(promptData.description || "");
      loadShareLinks();
    }
  }, [isModalOpen, promptData, loadShareLinks]);


  const loadAnalytics = async (linkId: string) => {
    try {
      const data = await getShareLinkAnalytics(linkId);
      if (data && data.shareLink) {
        setAnalytics(data as unknown as typeof analytics);
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  const handleCreateShare = async () => {
    if (!promptData) return;
    
    setIsLoading(true);
    try {
      const result = await createShareLink({
        promptId: promptData.id,
        title,
        description,
        settings: {
          expiresIn,
          password: password || undefined,
          maxViews: maxViews || undefined,
          showAuthor,
          allowEmbed
        }
      });

      setNewShareUrl(result.shareUrl);
      toast.success("Your prompt can now be shared with others");
      
      // Reload share links
      await loadShareLinks();
      
      // Reset form
      setPassword("");
      setMaxViews(undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create share link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLink = async (linkId: string, updates: Partial<{
    title: string;
    description: string;
    isActive: boolean;
    password: string;
    expiresIn: "1h" | "1d" | "7d" | "30d" | "never";
    maxViews: number;
    showAuthor: boolean;
    allowEmbed: boolean;
  }>) => {
    setIsLoading(true);
    try {
      await updateShareLink(linkId, updates);
      toast.success("Your changes have been saved.");
      await loadShareLinks();
    } catch {
      toast.error("Failed to update share link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this share link?")) return;
    
    setIsLoading(true);
    try {
      await deleteShareLink(linkId);
      toast.success("The share link has been removed.");
      await loadShareLinks();
      setSelectedLink(null);
    } catch {
      toast.error("Failed to delete share link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const shareUrl = (shareId: string) => 
    `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/share/${shareId}`;

  if (!isModalOpen) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Share Prompt</DialogTitle>
          <DialogDescription>
            Create and manage share links for your prompt
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Link</TabsTrigger>
            <TabsTrigger value="manage">
              Manage Links {shareLinks.length > 0 && `(${shareLinks.length})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="space-y-4">
            {newShareUrl ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your share link has been created successfully!
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label>Share URL</Label>
                  <div className="flex gap-2">
                    <Input value={newShareUrl} readOnly />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(newShareUrl, "new-url")}
                    >
                      {copied === "new-url" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowQR(!showQR)}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    {showQR ? "Hide" : "Show"} QR Code
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewShareUrl(null);
                      setActiveTab("manage");
                    }}
                  >
                    View All Links
                  </Button>
                </div>
                
                {showQR && (
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <QRCodeSVG value={newShareUrl} size={200} />
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Public Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a title for the shared prompt"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Public Description</Label>
                    <Input
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expires">Expiration</Label>
                      <Select value={expiresIn} onValueChange={(v) => setExpiresIn(v as typeof expiresIn)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1h">1 hour</SelectItem>
                          <SelectItem value="1d">1 day</SelectItem>
                          <SelectItem value="7d">7 days</SelectItem>
                          <SelectItem value="30d">30 days</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxViews">Max Views (optional)</Label>
                      <Input
                        id="maxViews"
                        type="number"
                        value={maxViews || ""}
                        onChange={(e) => setMaxViews(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="Unlimited"
                        min="1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password (optional)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave empty for no password"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Author</Label>
                        <p className="text-sm text-muted-foreground">
                          Display your name on the shared prompt
                        </p>
                      </div>
                      <Switch
                        checked={showAuthor}
                        onCheckedChange={setShowAuthor}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow Embedding</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow this prompt to be embedded on other sites
                        </p>
                      </div>
                      <Switch
                        checked={allowEmbed}
                        onCheckedChange={setAllowEmbed}
                      />
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    onClick={handleCreateShare}
                    disabled={isLoading || !title}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Share2 className="mr-2 h-4 w-4" />
                        Create Share Link
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="manage" className="space-y-4">
            {shareLinks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No share links created yet
                </p>
                <Button onClick={() => setActiveTab("create")}>
                  Create Your First Share Link
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {shareLinks.map((link) => (
                    <div
                      key={link.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{link.title}</h4>
                          {link.description && (
                            <p className="text-sm text-muted-foreground">
                              {link.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {link.isExpired && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                          {!link.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteLink(link.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(link.createdAt), "MMM d, yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {link.viewCount} views
                        </div>
                        {link.maxViews && (
                          <div>Max: {link.maxViews}</div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            value={shareUrl(link.shareId)}
                            readOnly
                            className="text-xs"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopy(shareUrl(link.shareId), link.id)}
                        >
                          {copied === link.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSelectedLink(link);
                            loadAnalytics(link.id);
                          }}
                        >
                          <Activity className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateLink(link.id, { 
                            isActive: !link.isActive 
                          })}
                        >
                          {link.isActive ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            {selectedLink && analytics && (
              <Dialog open={!!selectedLink} onOpenChange={() => setSelectedLink(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Link Analytics</DialogTitle>
                    <DialogDescription>
                      View statistics for {selectedLink.title}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total Views</p>
                        <p className="text-2xl font-bold">{analytics.totalViews}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Unique Visitors</p>
                        <p className="text-2xl font-bold">{analytics.uniqueVisitors}</p>
                      </div>
                    </div>
                    
                    {analytics.recentViews.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Recent Views</h4>
                        <div className="space-y-2 text-sm">
                          {analytics.recentViews.slice(0, 5).map((view, i) => (
                            <div key={i} className="flex justify-between text-muted-foreground">
                              <span>{format(new Date(view.viewedAt), "MMM d, h:mm a")}</span>
                              {view.referer && (
                                <span className="truncate max-w-[200px]">
                                  from {new URL(view.referer).hostname}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}