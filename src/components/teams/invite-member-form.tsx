"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { inviteTeamMember } from "@/app/actions/team-members.actions";
import { TeamRole } from "@/generated/prisma";
import { Mail } from "lucide-react";

interface InviteMemberFormProps {
  teamId: string;
}

export function InviteMemberForm({ teamId }: InviteMemberFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "MEMBER" as TeamRole,
  });
  const [errors, setErrors] = useState<{
    email?: string;
  }>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
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
      const result = await inviteTeamMember({
        teamId,
        email: formData.email.trim(),
        role: formData.role,
      });

      if (result.success) {
        toast.success(`An invitation has been sent to ${formData.email}`);
        
        // Redirect back to team members page
        router.push(`/teams/${teamId}/members`);
      }
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="colleague@company.com"
            className="pl-10"
            value={formData.email}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, email: e.target.value }));
              if (errors.email) {
                setErrors(prev => ({ ...prev, email: undefined }));
              }
            }}
            disabled={isSubmitting}
            required
          />
        </div>
        <p className="text-sm text-muted-foreground">
          The email address of the person you want to invite.
        </p>
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as TeamRole }))}
          disabled={isSubmitting}
        >
          <SelectTrigger id="role">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="VIEWER">
              <div>
                <div className="font-medium">Viewer</div>
                <div className="text-sm text-muted-foreground">
                  Can view team prompts but cannot create or edit
                </div>
              </div>
            </SelectItem>
            <SelectItem value="MEMBER">
              <div>
                <div className="font-medium">Member</div>
                <div className="text-sm text-muted-foreground">
                  Can create, edit, and manage their own prompts
                </div>
              </div>
            </SelectItem>
            <SelectItem value="ADMIN">
              <div>
                <div className="font-medium">Admin</div>
                <div className="text-sm text-muted-foreground">
                  Can manage team members and all prompts
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Choose what permissions this person will have in the team.
        </p>
      </div>
      
      <div className="flex gap-4">
        <LoadingButton
          type="submit"
          loading={isSubmitting}
          loadingText="Sending..."
          disabled={!formData.email.trim()}
        >
          Send Invitation
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