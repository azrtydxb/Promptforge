"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { updateTeam, deleteTeam } from "@/app/actions/team.actions";
import { Loader2, Trash2, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

interface TeamSettingsFormProps {
  team: {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
    members: Array<{
      id: string;
      userId: string;
      teamId: string;
      role: string;
      user: {
        id: string;
        email: string | null;
        name: string | null;
      };
    }>;
    _count: {
      prompts: number;
      folders: number;
      tags: number;
    };
  };
  isOwner: boolean;
  currentUserId: string;
}

export function TeamSettingsForm({ team, isOwner, currentUserId }: TeamSettingsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: team.name,
    description: team.description || "",
  });
  const [errors, setErrors] = useState<{
    name?: string;
    description?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Team name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Team name must be at least 2 characters";
    } else if (formData.name.length > 50) {
      newErrors.name = "Team name must be less than 50 characters";
    }
    
    if (formData.description && formData.description.length > 200) {
      newErrors.description = "Description must be less than 200 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Check if there are any changes
    const hasChanges = 
      formData.name.trim() !== team.name || 
      formData.description.trim() !== (team.description || "");
    
    if (!hasChanges) {
      toast({
        title: "No changes",
        description: "No changes were made to the team settings.",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const updates: any = {};
      
      if (formData.name.trim() !== team.name) {
        updates.name = formData.name.trim();
      }
      
      if (formData.description.trim() !== (team.description || "")) {
        updates.description = formData.description.trim() || null;
      }
      
      const result = await updateTeam({
        teamId: team.id,
        ...updates,
      });
      
      if (result.success) {
        toast({
          title: "Settings updated",
          description: "Your team settings have been updated successfully.",
        });
        
        router.refresh();
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      console.error("Error updating team:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update team settings",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const result = await deleteTeam(team.id);
      
      if (result.success) {
        toast({
          title: "Team deleted",
          description: "The team has been permanently deleted.",
        });
        
        // Redirect to teams page after deletion
        router.push("/teams");
        router.refresh();
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      console.error("Error deleting team:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete team",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Update your team's basic information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                placeholder="My Awesome Team"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                  if (errors.name) {
                    setErrors(prev => ({ ...prev, name: undefined }));
                  }
                }}
                disabled={isSubmitting}
                maxLength={50}
                required
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this team about?"
                className="resize-none"
                value={formData.description}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, description: e.target.value }));
                  if (errors.description) {
                    setErrors(prev => ({ ...prev, description: undefined }));
                  }
                }}
                disabled={isSubmitting}
                maxLength={200}
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Brief description of your team's purpose (optional)
              </p>
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>
            
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Team Information */}
      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
          <CardDescription>
            Additional details about your team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span>{format(new Date(team.createdAt), "PPP")}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Members:</span>
            <span>{team.members.length} {team.members.length === 1 ? 'member' : 'members'}</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Prompts:</span>{" "}
              <span className="font-medium">{team._count.prompts}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Folders:</span>{" "}
              <span className="font-medium">{team._count.folders}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Tags:</span>{" "}
              <span className="font-medium">{team._count.tags}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone - Only visible to owners */}
      {isOwner && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that permanently affect your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/20 p-4">
                <h4 className="text-sm font-medium mb-2">Delete this team</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete a team, there is no going back. All prompts, folders, tags, 
                  and team data will be permanently deleted.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Team
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>
                          This action cannot be undone. This will permanently delete the{" "}
                          <span className="font-semibold">{team.name}</span> team and remove all 
                          associated data.
                        </p>
                        <p className="text-destructive font-medium">
                          This includes {team._count.prompts} prompts, {team._count.folders} folders, 
                          and {team._count.tags} tags.
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Delete Team"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}