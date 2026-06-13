import crypto from 'crypto';

/**
 * Avatar utilities for handling different types of profile pictures
 */

export type AvatarType = 'INITIALS' | 'GRAVATAR' | 'UPLOAD';

/** Structured Pro: soft indigo fill for other users' initials avatars. */
export const OTHER_AVATAR_BG = '#DFE2F6';
export const OTHER_AVATAR_FG = '#3F49B8';
/** Structured Pro: indigo gradient for the current user's avatar. */
export const CURRENT_USER_AVATAR_GRADIENT = 'linear-gradient(135deg,#5E6AD2,#8B93E0)';
export const CURRENT_USER_AVATAR_FG = '#FFFFFF';

/**
 * Generates a Gravatar URL for the given email
 */
export function generateGravatarUrl(email: string, size: number = 200): string {
  if (!email) return '';
  
  const normalizedEmail = email.trim().toLowerCase();
  const hash = crypto.createHash('md5').update(normalizedEmail).digest('hex');
  
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon&r=pg`;
}

/**
 * Generates initials from a name
 */
export function generateInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'U';
  
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return words
    .slice(0, 2) // Take first two words
    .map(word => word.charAt(0).toUpperCase())
    .join('');
}

/**
 * Gets the appropriate avatar URL based on the user's avatar type and data
 */
export function getAvatarUrl(user: {
  avatarType: string;
  profilePicture?: string | null;
  gravatarEmail?: string | null;
  email?: string | null;
  name?: string | null;
}, size: number = 200): string | null {
  switch (user.avatarType) {
    case 'UPLOAD':
      return user.profilePicture || null;
    
    case 'GRAVATAR':
      const email = user.gravatarEmail || user.email;
      return email ? generateGravatarUrl(email, size) : null;
    
    case 'INITIALS':
    default:
      return null; // Will use initials component
  }
}

/**
 * Gets the display initials for a user
 */
export function getDisplayInitials(user: {
  name?: string | null;
  email?: string | null;
  username?: string | null;
}): string {
  if (user.name) {
    return generateInitials(user.name);
  }
  
  if (user.username) {
    return generateInitials(user.username);
  }
  
  if (user.email) {
    return user.email.charAt(0).toUpperCase();
  }
  
  return 'U';
}


/**
 * Validates if an uploaded file is a valid image
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)'
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image file size must be less than 5MB'
    };
  }
  
  return { valid: true };
}

/**
 * Resizes an image file to a maximum dimension while maintaining aspect ratio
 */
export function resizeImage(file: File, maxDimension: number = 400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw resized image
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to resize image'));
          }
        },
        'image/jpeg',
        0.9
      );
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Converts a Blob to a data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}