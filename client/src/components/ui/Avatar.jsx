import React, { useState, useEffect } from 'react';
import { getAvatarPalette, getInitials } from '../../utils/avatar.js';
import { getMediaUrl } from '../../utils/file.js';

export default function Avatar({
  src,
  name = '',
  id = '',
  size = 'md',
  isOnline = false,
  showOnline = false,
  className = '',
}) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-12 h-12 text-base font-semibold',
    xl: 'w-16 h-16 text-xl font-bold',
    '2xl': 'w-24 h-24 text-3xl font-extrabold',
  };

  const badgeSizeClasses = {
    xs: 'w-1.5 h-1.5 border-[1px] bottom-0 right-0',
    sm: 'w-2 h-2 border-[1.5px] bottom-0 right-0',
    md: 'w-3 h-3 border-2 bottom-0 right-0',
    lg: 'w-3.5 h-3.5 border-2 bottom-0.5 right-0.5',
    xl: 'w-4 h-4 border-2 bottom-1 right-1',
    '2xl': 'w-6 h-6 border-2 bottom-1.5 right-1.5',
  };

  const palette = getAvatarPalette(id || name);
  const initials = getInitials(name);
  const dimensionClass = sizeClasses[size] || sizeClasses.md;
  const badgeClass = badgeSizeClasses[size] || badgeSizeClasses.md;

  const hasValidImage = src && !imageError;

  return (
    <div className={`relative inline-flex flex-shrink-0 select-none ${className}`}>
      {hasValidImage ? (
        <img
          src={getMediaUrl(src)}
          alt={name || 'User avatar'}
          onError={() => setImageError(true)}
          className={`${dimensionClass} rounded-full object-cover shadow-subtle border border-border-main`}
        />
      ) : (
        <div
          className={`${dimensionClass} rounded-full flex items-center justify-center text-white shadow-subtle tracking-tight`}
          style={{
            background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
          }}
          title={name}
        >
          {initials}
        </div>
      )}

      {showOnline && (
        <span
          className={`absolute rounded-full border-white ${badgeClass} ${
            isOnline ? 'bg-status-online' : 'bg-status-offline'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}

