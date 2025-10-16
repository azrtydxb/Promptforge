'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AvatarRoot as Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, FileText } from 'lucide-react';
import Link from 'next/link';
import { FollowButton } from './follow-button';

interface User {
  id: string;
  name: string | null;
  username: string | null;
  profilePicture: string | null;
  avatarType: string;
  _count?: {
    prompts: number;
    followers: number;
    following?: number;
  };
}

interface UserListProps {
  users: User[];
  currentUserId: string;
  emptyMessage?: string;
  showFollowButton?: boolean;
}

export function UserList({
  users,
  currentUserId,
  emptyMessage = 'No users found',
  showFollowButton = true,
}: UserListProps) {
  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12">
          <div className="text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map((user) => (
        <Card key={user.id} className="hover:border-primary transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <Link
                href={`/users/${user.id}`}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <Avatar className="h-12 w-12">
                  {user.profilePicture && (
                    <AvatarImage src={user.profilePicture} alt={user.name || 'User'} />
                  )}
                  <AvatarFallback>
                    {(user.name || user.username || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {user.name || user.username || 'Unknown User'}
                  </p>
                  {user.username && (
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  )}
                </div>
              </Link>
              {showFollowButton && user.id !== currentUserId && (
                <FollowButton
                  userId={user.id}
                  size="sm"
                  showText={false}
                />
              )}
            </div>

            {user._count && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>{user._count.prompts} prompts</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{user._count.followers} followers</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface SuggestedUsersProps {
  users: User[];
  currentUserId: string;
  title?: string;
  description?: string;
}

export function SuggestedUsers({
  users,
  currentUserId,
  title = 'Suggested Users',
  description = 'Discover content creators in the community',
}: SuggestedUsersProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <UserList
        users={users}
        currentUserId={currentUserId}
        emptyMessage="No suggested users at the moment"
        showFollowButton={true}
      />
    </div>
  );
}
