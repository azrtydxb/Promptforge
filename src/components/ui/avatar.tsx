'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getAvatarUrl, getDisplayInitials, getInitialsBackgroundColor } from '@/lib/avatar-utils';
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

export function Avatar({ user, size = 'md', className, fallbackClassName }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const avatarUrl = getAvatarUrl(user, sizePx[size]);
  const initials = getDisplayInitials(user);
  const backgroundColor = getInitialsBackgroundColor(user.id);

  const shouldShowImage = avatarUrl && !imageError;
  const shouldShowInitials = !shouldShowImage;

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
        <div
          className={cn(
            'w-full h-full flex items-center justify-center text-white font-medium',
            fallbackClassName
          )}
          style={{ backgroundColor }}
        >
          {initials}
        </div>
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