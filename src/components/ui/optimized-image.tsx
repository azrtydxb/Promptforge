import Image, { ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallback?: string;
  wrapperClassName?: string;
  enableBlur?: boolean;
  lowQualitySize?: number;
}

export function OptimizedImage({
  src,
  alt,
  fallback = '/images/placeholder.png',
  className,
  wrapperClassName,
  enableBlur = true,
  lowQualitySize: _lowQualitySize = 20,
  priority = false,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    if (!hasError && imgSrc !== fallback) {
      setHasError(true);
      setImgSrc(fallback);
    }
    setIsLoading(false);
  };

  // Generate low-quality image placeholder
  const blurDataURL = enableBlur ? undefined : undefined;

  return (
    <div className={cn('relative overflow-hidden', wrapperClassName)}>
      <Image
        src={imgSrc}
        alt={alt}
        className={cn(
          'duration-700 ease-in-out',
          isLoading ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        placeholder={enableBlur ? 'blur' : 'empty'}
        blurDataURL={blurDataURL}
        priority={priority}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        {...props}
      />
      
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse" />
      )}
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <span className="text-gray-400 text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  );
}

// Lazy loaded image component
export function LazyImage(props: OptimizedImageProps) {
  const [isInView, setIsInView] = useState(false);

  return (
    <div className="relative">
      {!isInView && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse" />
      )}
      <div
        ref={(el) => {
          if (el) {
            const observer = new IntersectionObserver(
              ([entry]) => {
                if (entry.isIntersecting) {
                  setIsInView(true);
                  observer.disconnect();
                }
              },
              {
                threshold: 0.1,
                rootMargin: '50px',
              }
            );
            observer.observe(el);
          }
        }}
      >
        {isInView && <OptimizedImage {...props} />}
      </div>
    </div>
  );
}

// Avatar component with optimization
interface OptimizedAvatarProps {
  src?: string | null;
  alt: string;
  size?: number;
  fallbackInitials?: string;
  className?: string;
}

export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  fallbackInitials,
  className,
}: OptimizedAvatarProps) {
  const [hasError, setHasError] = useState(!src);

  if (!src || hasError) {
    // Show initials or default avatar
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium rounded-full',
          className
        )}
        style={{ width: size, height: size }}
      >
        {fallbackInitials ? (
          <span style={{ fontSize: size * 0.4 }}>
            {fallbackInitials.slice(0, 2).toUpperCase()}
          </span>
        ) : (
          <svg
            className="w-1/2 h-1/2 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={cn('rounded-full object-cover', className)}
        onError={() => setHasError(true)}
        priority={size < 100} // Prioritize small avatars
      />
    </div>
  );
}

// Gallery image component with zoom capability
export function GalleryImage({
  src,
  alt,
  className,
  ...props
}: OptimizedImageProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      <OptimizedImage
        src={src}
        alt={alt}
        className={cn('cursor-pointer transition-transform hover:scale-105', className)}
        onClick={() => setIsZoomed(true)}
        {...props}
      />
      
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-7xl max-h-full">
            <OptimizedImage
              src={src}
              alt={alt}
              width={1200}
              height={800}
              className="max-w-full max-h-full object-contain"
              priority
            />
            <button
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
              onClick={() => setIsZoomed(false)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Background image component with lazy loading
interface OptimizedBackgroundImageProps {
  src: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
  overlayOpacity?: number;
}

export function OptimizedBackgroundImage({
  src,
  alt,
  className,
  children,
  overlayOpacity = 0.3,
}: OptimizedBackgroundImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'absolute inset-0 bg-cover bg-center transition-opacity duration-700',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        style={{ backgroundImage: `url(${src})` }}
      />
      <Image
        src={src}
        alt={alt || ''}
        fill
        className="object-cover"
        onLoad={() => setIsLoaded(true)}
        priority
        sizes="100vw"
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse" />
      )}
      {overlayOpacity > 0 && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Image preloader utility
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

// Batch image preloader
export async function preloadImages(srcs: string[]): Promise<void> {
  await Promise.all(srcs.map(preloadImage));
}