import { useEffect, useState } from 'react';
import { Box, Loader, Text } from '@mantine/core';
import cornerstone from 'cornerstone-core';

type SeriesThumbnailProps = {
  imageUrl: string;
  active: boolean;
  loading?: boolean;
  label: string;
  count: number;
  onClick: () => void;
  disabled?: boolean;
};

export function SeriesThumbnail({
  imageUrl,
  active,
  loading = false,
  label,
  count,
  onClick,
  disabled = false,
}: SeriesThumbnailProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setThumbError(true);
      return;
    }
    let cancelled = false;

    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:120px;height:120px;';
    document.body.appendChild(div);
    cornerstone.enable(div);

    const base = String((import.meta.env.VITE_API_URL as string) || '').replace(/\/$/, '');
    const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    const imageId = imageUrl.startsWith('wadors:') || imageUrl.startsWith('wadouri:')
      ? imageUrl
      : `wadouri:${base}${path}`;

    cornerstone.loadAndCacheImage(imageId)
      .then((image: any) => {
        if (cancelled) return;
        cornerstone.displayImage(div, image);
        requestAnimationFrame(() => {
          if (cancelled) return;
          const canvas = div.querySelector('canvas') as HTMLCanvasElement | null;
          if (canvas) setDataUrl(canvas.toDataURL('image/jpeg', 0.75));
          try { cornerstone.disable(div); } catch { /* no-op */ }
          div.remove();
        });
      })
      .catch(() => {
        if (!cancelled) setThumbError(true);
        try { cornerstone.disable(div); } catch { /* no-op */ }
        div.remove();
      });

    return () => {
      cancelled = true;
      try { cornerstone.disable(div); } catch { /* no-op */ }
      if (div.parentNode) div.remove();
    };
  }, [imageUrl]);

  return (
    <Box
      onClick={() => { if (!disabled) onClick(); }}
      style={{
        cursor: disabled ? 'default' : 'pointer',
        padding: '10px 10px 12px',
        borderRadius: 10,
        border: active ? '2px solid #339af0' : '1px solid rgba(95,123,255,0.15)',
        background: active ? 'rgba(51,154,240,0.12)' : 'rgba(14,20,34,0.9)',
        position: 'relative',
        opacity: disabled ? 0.75 : 1,
      }}
    >
      {active && (
        <Box
          style={{
            position: 'absolute',
            left: 0,
            top: 12,
            bottom: 12,
            width: 3,
            borderRadius: '0 3px 3px 0',
            background: 'linear-gradient(180deg, #74c0fc, #339af0)',
          }}
        />
      )}

      <Box
        style={{
          width: '100%',
          aspectRatio: '1',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#060b14',
          border: '1px solid rgba(148, 163, 184, 0.18)',
        }}
      >
        {dataUrl ? (
          <img src={dataUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : thumbError ? (
          <Text size="xs" c="dimmed">-</Text>
        ) : (
          <Loader size="sm" color="gray" />
        )}
      </Box>

      <Box mt={8}>
        <Text size="sm" fw={700} c={active ? 'blue.2' : 'gray.2'} lh={1.3}>
          {label}
        </Text>
        <Text size="xs" c={active ? 'blue.3' : 'dimmed'} lh={1.3}>
          {count} imagens
        </Text>
      </Box>

      {loading && active && (
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 10,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(2px)',
          }}
        >
          <Loader size="sm" color="blue" />
        </Box>
      )}
    </Box>
  );
}
