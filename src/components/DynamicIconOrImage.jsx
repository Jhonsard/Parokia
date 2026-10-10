import { useState } from 'react';
import { ImageOff, LoaderCircle } from 'lucide-react';

/**
 * DynamicIconOrImage — renders an image with loading state and graceful icon fallback.
 *
 * Props:
 *   icon      {React.ComponentType}  — Lucide icon component to use as fallback
 *   imageUrl  {string}               — remote image URL (optional)
 *   alt       {string}               — alt text for the image
 *   className {string}               — CSS class forwarded to the root element
 */
export default function DynamicIconOrImage({ icon: Icon, imageUrl, alt = '', className = '' }) {
  const [isLoading, setIsLoading] = useState(Boolean(imageUrl));
  const [hasError,  setHasError]  = useState(false);

  /* ── Image path ─────────────────────────────────────────────────── */
  if (imageUrl && !hasError) {
    return (
      <span className={`dynamic-media ${className}`} aria-label={alt || undefined}>
        {isLoading && (
          <LoaderCircle
            className="media-loader"
            size={18}
            aria-hidden="true"
          />
        )}
        <img
          src={imageUrl}
          alt={alt}
          className={isLoading ? 'media-image is-loading' : 'media-image'}
          onLoad={() => setIsLoading(false)}
          onError={() => { setIsLoading(false); setHasError(true); }}
        />
      </span>
    );
  }

  /* ── Icon path ──────────────────────────────────────────────────── */
  if (Icon) {
    return <Icon className={className} aria-hidden="true" />;
  }

  /* ── Ultimate fallback ──────────────────────────────────────────── */
  return <ImageOff className={className} aria-hidden="true" />;
}
