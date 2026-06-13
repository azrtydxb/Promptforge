'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  getAvatarUrl,
  getDisplayInitials,
  OTHER_AVATAR_BG,
  OTHER_AVATAR_FG,
  CURRENT_USER_AVATAR_GRADIENT,
  CURRENT_USER_AVATAR_FG,
} from '@/lib/avatar-utils';
import { useState } from 'react';

export interface AvatarUser {
  id: string;
  name?: string | null;
  email?: string | null;
  username?: string | null;
  avatarType: string;
  profilePicture?: string | null;
  gravatarEmail?: string | null;
}

interface AvatarProps {
  user: AvatarUser;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  fallbackClassName?: string;
  isCurrentUser?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl',
};

const sizePx = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 80,
};

export function Avatar({ user, size = 'md', className, fallbackClassName, isCurrentUser = false }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const avatarUrl = getAvatarUrl(user, sizePx[size]);
  const initials = getDisplayInitials(user);

  const shouldShowImage = avatarUrl && !imageError;
  const shouldShowInitials = !shouldShowImage;

  const fallbackStyle = isCurrentUser
    ? { background: CURRENT_USER_AVATAR_GRADIENT, color: CURRENT_USER_AVATAR_FG }
    : { backgroundColor: OTHER_AVATAR_BG, color: OTHER_AVATAR_FG };

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {shouldShowImage && (
        <Image
          src={avatarUrl}
          alt={user.name || user.username || 'User avatar'}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
        />
      )}

      {shouldShowInitials && (
        <span
          data-avatar
          role="img"
          aria-label={user.name || user.username || 'User avatar'}
          style={fallbackStyle}
          className={cn(
            'flex h-full w-full items-center justify-center font-semibold select-none',
            fallbackClassName
          )}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

export function AvatarFallback({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center w-full h-full', className)}>
      {children}
    </div>
  );
}

export function AvatarImage({ 
  src, 
  alt, 
  className,
  onError 
}: { 
  src: string; 
  alt: string; 
  className?: string;
  onError?: () => void;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={cn('object-cover', className)}
      onError={onError}
    />
  );
}

// Simple avatar wrapper for compatibility with existing code
export function AvatarRoot({ 
  className, 
  children 
}: { 
  className?: string; 
  children: React.ReactNode;
}) {
  return (
    <div className={cn('relative flex items-center justify-center rounded-full overflow-hidden', className)}>
      {children}
    </div>
  );
}