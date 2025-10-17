"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createTeam } from "@/app/actions/team.actions";

export function CreateTeamForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
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
    
    setIsSubmitting(true);
    
    try {
      const result = await createTeam({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });

      if (result.success && result.team) {
        toast.success("Your new team has been created successfully.");
        
        // Small delay to ensure toast is visible and state is updated
        setTimeout(() => {
          // Ensure the router is ready and redirect to the new team's dashboard
          router.push(`/teams/${result.team.id}`);
          router.refresh(); // Force a refresh to ensure navigation happens
        }, 100);
      } else {
        throw new Error("Team creation failed");
      }
    } catch (error) {
      console.error("Error creating team:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create team");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
        <p className="text-sm text-muted-foreground">
          This is your team&apos;s display name.
        </p>
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
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
          Brief description of your team&apos;s purpose.
        </p>
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description}</p>
        )}
      </div>
      
      <div className="flex gap-4">
        <LoadingButton
          type="submit"
          loading={isSubmitting}
          loadingText="Creating Team..."
          disabled={!formData.name.trim()}
        >
          Create Team
        </LoadingButton>

        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}