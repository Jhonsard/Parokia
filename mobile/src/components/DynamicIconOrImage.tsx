/**
 * DynamicIconOrImage — mobile counterpart of the web component.
 *
 * Renders a real photograph when ``imageUrl`` is provided (with a spinner while
 * it loads and an automatic fallback to the vector icon on error), and the
 * supplied Ionicons glyph otherwise. This is what keeps the interface from
 * relying on invented generic icons.
 */

import React, { useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii } from '../theme/tokens';

export interface DynamicIconOrImageProps {
  /** Ionicons glyph rendered when no image is available. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Optional photograph replacing the icon. */
  imageUrl?: string | null;
  /** Alternative text describing the content. */
  alt: string;
  /** Square edge length in pixels. */
  size?: number;
  iconColor?: string;
  backgroundColor?: string;
}

export function DynamicIconOrImage({
  icon,
  imageUrl,
  alt,
  size = 44,
  iconColor,
  backgroundColor = colors.surfaceMuted,
}: DynamicIconOrImageProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);
  const hasImage = typeof imageUrl === 'string' && imageUrl.length > 0 && !failed;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radii.md,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {hasImage ? (
        <>
          <Image
            accessibilityLabel={alt}
            source={{ uri: imageUrl as string }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setFailed(true);
              setLoading(false);
            }}
            style={{ width: size, height: size }}
            resizeMode="cover"
          />
          {loading && (
            <ActivityIndicator
              size="small"
              color={colors.inkFaint}
              style={{ position: 'absolute' }}
            />
          )}
        </>
      ) : (
        <Ionicons name={icon} size={Math.round(size * 0.5)} color={iconColor ?? colors.inkMuted} />
      )}
    </View>
  );
}
