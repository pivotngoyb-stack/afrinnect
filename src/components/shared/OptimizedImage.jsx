import React, { useState } from 'react';
import { cn } from '@/lib/utils';

// Optimized image component with lazy loading, blur placeholder, and error handling
export default function OptimizedImage({ 
  src, 
  alt, 
  className, 
  aspectRatio = 'aspect-square',
  priority = false,
  onLoad,
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className={cn('bg-gray-200 flex items-center justify-center', aspectRatio, className)}>
        <span className="text-gray-400 text-sm">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', aspectRatio, className)}>
      {/* Blur placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
      )}
      
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
    </div>
  );
}