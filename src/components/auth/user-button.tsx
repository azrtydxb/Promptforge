"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModal } from "@/hooks/use-modal-store";
import { Key, User, Settings } from "lucide-react";
import { Avatar, AvatarUser } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { getCurrentUserProfile } from "@/app/actions/profile.actions";

export const AuthUserButton = React.memo(() => {
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

  const handleChangePassword = React.useCallback(() => {
    onOpen("changePassword");
  }, [onOpen]);

  const handleProfileSettings = React.useCallback(() => {
    // Navigate to profile page instead of opening modal
    window.location.href = '/profile';
  }, []);

  if (!session?.user) {
    return null;
  }

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
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 hover:bg-primary-foreground/10" aria-label="User menu" aria-haspopup="true">
          {isLoading ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted animate-pulse">
              <div className="h-4 w-4 bg-muted-foreground/20 rounded-full" />
            </div>
          ) : (
            <Avatar user={avatarUser} size="sm" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg" align="end" forceMount>
        <div className="flex items-center space-x-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <Avatar user={avatarUser} size="md" />
          <div className="flex flex-col space-y-1 min-w-0 flex-1">
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{displayName}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{displayEmail}</div>
            {userProfile?.username && (
              <div className="text-xs text-gray-500 dark:text-gray-500 truncate">@{userProfile.username}</div>
            )}
          </div>
        </div>
        <div className="py-1">
          <DropdownMenuItem
            onClick={handleProfileSettings}
            className="cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 mx-2 my-1 rounded-md"
          >
            <User className="mr-2 h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleChangePassword}
            className="cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 mx-2 my-1 rounded-md"
          >
            <Key className="mr-2 h-4 w-4" />
            Change Password
          </DropdownMenuItem>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 py-1">
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/" })}
            className="cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 mx-2 my-1 mb-2 rounded-md"
          >
            <Settings className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

AuthUserButton.displayName = "AuthUserButton";