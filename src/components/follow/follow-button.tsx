'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { followUser, unfollowUser, isFollowing } from '@/app/actions/user-follow.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
  className?: string;
}

export function FollowButton({
  userId,
  initialIsFollowing = false,
  variant = 'default',
  size = 'default',
  showText = true,
  className,
}: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check initial following status
  useEffect(() => {
    const checkFollowStatus = async () => {
      const result = await isFollowing(userId);
      if (result.success) {
        setFollowing(result.isFollowing);
      }
      setChecking(false);
    };

    checkFollowStatus();
  }, [userId]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);

    try {
      if (following) {
        const result = await unfollowUser(userId);
        if (result.success) {
          setFollowing(false);
          toast.success('Unfollowed successfully');
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to unfollow');
        }
      } else {
        const result = await followUser(userId);
        if (result.success) {
          setFollowing(true);
          toast.success('Following successfully');
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to follow');
        }
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={className}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      variant={following ? 'outline' : variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : following ? (
        <>
          <UserMinus className="w-4 h-4" />
          {showText && <span className="ml-2">Unfollow</span>}
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          {showText && <span className="ml-2">Follow</span>}
        </>
      )}
    </Button>
  );
}
