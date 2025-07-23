"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModal } from "@/hooks/use-modal-store";
import { Key, User, Settings } from "lucide-react";
import { Avatar, AvatarUser } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { getCurrentUserProfile } from "@/app/actions/profile.actions";

export const AuthUserButton = () => {
  const { data: session } = useSession();
  const { onOpen } = useModal();
  const [userProfile, setUserProfile] = useState<AvatarUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.email) return;
      
      try {
        const result = await getCurrentUserProfile();
        if (result.success && result.user) {
          setUserProfile({
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            username: result.user.username,
            avatarType: result.user.avatarType,
            profilePicture: result.user.profilePicture,
            gravatarEmail: result.user.gravatarEmail,
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [session?.user?.email]);

  if (!session?.user) {
    return null;
  }

  const handleChangePassword = () => {
    onOpen("changePassword");
  };

  const handleProfileSettings = () => {
    // Navigate to profile page instead of opening modal
    window.location.href = '/profile';
  };

  const displayName = userProfile?.username || session.user.name || "User";
  const displayEmail = session.user.email;

  // Create a fallback user object for the avatar
  const avatarUser: AvatarUser = userProfile || {
    id: session.user.email || 'unknown',
    name: session.user.name,
    email: session.user.email,
    username: null,
    avatarType: 'INITIALS',
    profilePicture: null,
    gravatarEmail: null,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0" aria-label="User menu" aria-haspopup="true">
          {isLoading ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted animate-pulse">
              <div className="h-4 w-4 bg-muted-foreground/20 rounded-full" />
            </div>
          ) : (
            <Avatar user={avatarUser} size="sm" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <div className="flex items-center space-x-2 p-2">
          <Avatar user={avatarUser} size="md" />
          <div className="flex flex-col space-y-1">
            <div className="font-medium text-sm">{displayName}</div>
            <div className="text-xs text-muted-foreground">{displayEmail}</div>
            {userProfile?.username && (
              <div className="text-xs text-muted-foreground">@{userProfile.username}</div>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleProfileSettings}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          Profile Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleChangePassword}
          className="cursor-pointer"
        >
          <Key className="mr-2 h-4 w-4" />
          Change Password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};