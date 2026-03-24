import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ActionIcon, Box, Button, Group, Loader, Paper, Text, Tooltip } from '@mantine/core';
import {
  ZoomIn,
  Move,
  RefreshCw,
  Ruler,
  ChevronLeft,
  ChevronRight,
  Eraser,
  RotateCcw,
  Play,
  Pause,
  Camera,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
} from 'lucide-react';

import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import * as cornerstoneMath from 'cornerstone-math';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import Hammer from 'hammerjs';
import dicomParser from 'dicom-parser';

/* Cornerstone setup */
cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.cornerstoneMath = cornerstoneMath;
cornerstoneWADOImageLoader.external.Hammer = Hammer;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

cornerstoneTools.init();

cornerstoneWADOImageLoader.configure({
  useWebWorkers: false,
  beforeSend: (xhr: XMLHttpRequest) => {
    // Use same-origin cookies if needed (backend auth token)
    xhr.withCredentials = true;
  },
});

const SIDEBAR_WIDTH = 176;
const THUMB_ITEM_HEIGHT = 92;
const THUMB_OVERSCAN = 8;
const CINE_BASE_FPS = 8;

const WINDOW_PRESETS = [
  { name: 'Auto', width: null as number | null, center: null as number | null, short: 'A' },
  { name: 'Tecidos moles', width: 400, center: 40, short: 'M' },
  { name: 'Pulmão', width: 1500, center: -600, short: 'P' },
  { name: 'Osso', width: 2000, center: 350, short: 'O' },
  { name: 'Cérebro', width: 80, center: 40, short: 'C' },
];

interface DicomViewerProps {
  style?: React.CSSProperties;
  /** optional series of buffers to load when viewer mounts */
  initialSeries?: ArrayBuffer[];
  /** optional single file buffer */
  initialData?: ArrayBuffer;
}

type ActiveTool =
  | 'wwwc'
  | 'zoom'
  | 'pan'
  | 'length'
  | 'angle'
  | 'rect'
  | 'ellipse'
  | 'probe'
  | 'arrow'
  | 'magnify';

export function DicomViewer({ style, initialSeries, initialData }: DicomViewerProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const thumbnailRailRef = useRef<HTMLDivElement | null>(null);
  const thumbnailItemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageCount, setImageCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stackImageIds, setStackImageIds] = useState<string[]>([]);
  const [thumbnailDataUrls, setThumbnailDataUrls] = useState<string[]>([]);
  const [thumbnailInstanceLabels, setThumbnailInstanceLabels] = useState<string[]>([]);
  const [thumbWindow, setThumbWindow] = useState({ start: 0, end: 0 });
  const [activeTool, setActiveTool] = useState<ActiveTool>('wwwc');
  const [isInverted, setIsInverted] = useState(false);
  const [windowPresetIndex, setWindowPresetIndex] = useState(0);
  const [cinePlaying, setCinePlaying] = useState(false);
  const [cineSpeed, setCineSpeed] = useState(1);

  const thumbnailDataUrlsRef = useRef<string[]>([]);
  const thumbnailInstanceLabelsRef = useRef<string[]>([]);

  const seriesBuffers = useMemo(() => {
    if (initialSeries && initialSeries.length > 0) return initialSeries;
    if (initialData) return [initialData];
    return [] as ArrayBuffer[];
  }, [initialSeries, initialData]);

  const viewerId = useMemo(() => Math.random().toString(36).slice(2), []);
  const cleanupBlobUrls = useRef<string[]>([]);

  useEffect(() => {
    thumbnailDataUrlsRef.current = thumbnailDataUrls;
  }, [thumbnailDataUrls]);

  useEffect(() => {
    thumbnailInstanceLabelsRef.current = thumbnailInstanceLabels;
  }, [thumbnailInstanceLabels]);

  const applyViewportState = useCallback((element: HTMLDivElement, invert: boolean) => {
    const viewport = cornerstone.getViewport(element);
    if (!viewport) return;
    if (viewport.invert !== invert) {
      viewport.invert = invert;
      cornerstone.setViewport(element, viewport);
    }
  }, []);

  const setTool = useCallback((tool: ActiveTool) => {
    setActiveTool(tool);

    const element = elementRef.current;
    if (!element) return;

    // Deactivate all interaction tools and activate selected one for left mouse button.
    cornerstoneTools.setToolDisabled('Wwwc');
    cornerstoneTools.setToolDisabled('Pan');
    cornerstoneTools.setToolDisabled('Zoom');
    cornerstoneTools.setToolDisabled('Length');
    cornerstoneTools.setToolDisabled('Angle');
    cornerstoneTools.setToolDisabled('RectangleRoi');
    cornerstoneTools.setToolDisabled('EllipticalRoi');
    cornerstoneTools.setToolDisabled('Probe');
    cornerstoneTools.setToolDisabled('ArrowAnnotate');
    cornerstoneTools.setToolDisabled('Magnify');

    switch (tool) {
      case 'wwwc':
        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
        break;
      case 'zoom':
        cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 1 });
        break;
      case 'pan':
        cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 1 });
        break;
      case 'length':
        cornerstoneTools.setToolActive('Length', { mouseButtonMask: 1 });
        break;
      case 'angle':
        cornerstoneTools.setToolActive('Angle', { mouseButtonMask: 1 });
        break;
      case 'rect':
        cornerstoneTools.setToolActive('RectangleRoi', { mouseButtonMask: 1 });
        break;
      case 'ellipse':
        cornerstoneTools.setToolActive('EllipticalRoi', { mouseButtonMask: 1 });
        break;
      case 'probe':
        cornerstoneTools.setToolActive('Probe', { mouseButtonMask: 1 });
        break;
      case 'arrow':
        cornerstoneTools.setToolActive('ArrowAnnotate', { mouseButtonMask: 1 });
        break;
      case 'magnify':
        cornerstoneTools.setToolActive('Magnify', { mouseButtonMask: 1 });
        break;
    }

    // Keep wheel scrolling available regardless of active left-button tool.
    cornerstoneTools.setToolActive('StackScrollMouseWheel', {});
  }, []);

  const computeThumbWindow = useCallback((scrollTop: number, viewportHeight: number, total: number) => {
    if (total <= 0) return { start: 0, end: 0 };

    const visibleStart = Math.max(0, Math.floor(scrollTop / THUMB_ITEM_HEIGHT));
    const visibleCount = Math.max(1, Math.ceil(viewportHeight / THUMB_ITEM_HEIGHT));

    const start = Math.max(0, visibleStart - THUMB_OVERSCAN);
    const end = Math.min(total - 1, visibleStart + visibleCount + THUMB_OVERSCAN);

    return { start, end };
  }, []);

  const handleThumbnailRailScroll = useCallback(() => {
    const rail = thumbnailRailRef.current;
    if (!rail || !stackImageIds.length) return;

    const next = computeThumbWindow(rail.scrollTop, rail.clientHeight, stackImageIds.length);
    setThumbWindow((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, [computeThumbWindow, stackImageIds.length]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    cornerstone.enable(element);

    // Register tools commonly used in radiology workflows.
    cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
    cornerstoneTools.addTool(cornerstoneTools.PanTool);
    cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
    cornerstoneTools.addTool(cornerstoneTools.LengthTool);
    cornerstoneTools.addTool(cornerstoneTools.AngleTool);
    cornerstoneTools.addTool(cornerstoneTools.RectangleRoiTool);
    cornerstoneTools.addTool(cornerstoneTools.EllipticalRoiTool);
    cornerstoneTools.addTool(cornerstoneTools.ProbeTool);
    cornerstoneTools.addTool(cornerstoneTools.ArrowAnnotateTool);
    cornerstoneTools.addTool(cornerstoneTools.MagnifyTool);
    cornerstoneTools.addTool(cornerstoneTools.StackScrollMouseWheelTool);

    setTool('wwwc');

    return () => {
      cornerstone.disable(element);
    };
  }, [setTool]);

  useEffect(() => {
    if (!seriesBuffers.length) {
      setError('Nenhum DICOM disponível.');
      setLoading(false);
      setStackImageIds([]);
      setThumbnailDataUrls([]);
      setThumbnailInstanceLabels([]);
      setThumbWindow({ start: 0, end: 0 });
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    setLoading(true);
    setError(null);

    // Cleanup previous blob URLs
    cleanupBlobUrls.current.forEach((url) => URL.revokeObjectURL(url));
    cleanupBlobUrls.current = [];

    const imageIds = seriesBuffers.map((buf) => {
      const blob = new Blob([buf], { type: 'application/dicom' });
      const url = URL.createObjectURL(blob);
      cleanupBlobUrls.current.push(url);
      return `wadouri:${url}`;
    });

    const stack = {
      currentImageIdIndex: 0,
      imageIds,
    };

    setStackImageIds(imageIds);
    thumbnailItemRefs.current = Array(imageIds.length).fill(null);

    const emptyThumbs = Array(imageIds.length).fill('');
    const emptyLabels = Array(imageIds.length).fill('');
    setThumbnailDataUrls(emptyThumbs);
    setThumbnailInstanceLabels(emptyLabels);
    thumbnailDataUrlsRef.current = emptyThumbs;
    thumbnailInstanceLabelsRef.current = emptyLabels;

    setThumbWindow({ start: 0, end: Math.min(imageIds.length - 1, 28) });

    cornerstoneTools.addStackStateManager(element, ['stack']);
    cornerstoneTools.addToolState(element, 'stack', stack);

    cornerstone.loadImage(imageIds[0])
      .then((image: any) => {
        cornerstone.displayImage(element, image);
        applyViewportState(element, isInverted);
        setImageCount(imageIds.length);
        setCurrentIndex(0);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err?.message || 'Erro ao carregar DICOM.');
        setLoading(false);
      });

    const onNewImage = () => {
      const state = cornerstoneTools.getToolState(element, 'stack');
      const stackStateItem = state?.data?.[0];
      if (stackStateItem) {
        setCurrentIndex(stackStateItem.currentImageIdIndex);
      }
      applyViewportState(element, isInverted);
    };

    element.addEventListener('cornerstoneimagerendered', onNewImage);

    return () => {
      element.removeEventListener('cornerstoneimagerendered', onNewImage);
      cleanupBlobUrls.current.forEach((url) => URL.revokeObjectURL(url));
      cleanupBlobUrls.current = [];
      setCinePlaying(false);
    };
  }, [applyViewportState, isInverted, seriesBuffers]);

  useEffect(() => {
    if (!stackImageIds.length) {
      setThumbnailDataUrls([]);
      setThumbnailInstanceLabels([]);
      return;
    }

    let cancelled = false;
    const previewElement = document.createElement('div');
    previewElement.style.position = 'fixed';
    previewElement.style.left = '-9999px';
    previewElement.style.top = '-9999px';
    previewElement.style.width = '128px';
    previewElement.style.height = '128px';
    document.body.appendChild(previewElement);
    cornerstone.enable(previewElement);

    const generateThumbnails = async () => {
      for (let i = thumbWindow.start; i <= thumbWindow.end; i += 1) {
        if (cancelled) break;

        const hasThumb = Boolean(thumbnailDataUrlsRef.current[i]);
        const hasLabel = Boolean(thumbnailInstanceLabelsRef.current[i]);
        if (hasThumb && hasLabel) continue;

        try {
          const image = await cornerstone.loadAndCacheImage(stackImageIds[i]);
          if (cancelled) break;

          const instanceNumber = image?.data?.string?.('x00200013');
          const nextLabel = instanceNumber ? `Inst ${instanceNumber}` : `Inst ${i + 1}`;

          if (!hasLabel) {
            setThumbnailInstanceLabels((prev) => {
              if (prev[i]) return prev;
              const next = [...prev];
              next[i] = nextLabel;
              thumbnailInstanceLabelsRef.current = next;
              return next;
            });
          }

          if (!hasThumb) {
            cornerstone.displayImage(previewElement, image);
            await new Promise((resolve) => {
              requestAnimationFrame(() => resolve(null));
            });

            const canvas = previewElement.querySelector('canvas') as HTMLCanvasElement | null;
            if (canvas) {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
              setThumbnailDataUrls((prev) => {
                if (prev[i]) return prev;
                const next = [...prev];
                next[i] = dataUrl;
                thumbnailDataUrlsRef.current = next;
                return next;
              });
            }
          }
        } catch {
          setThumbnailInstanceLabels((prev) => {
            if (prev[i]) return prev;
            const next = [...prev];
            next[i] = `Inst ${i + 1}`;
            thumbnailInstanceLabelsRef.current = next;
            return next;
          });
        }
      }
    };

    generateThumbnails();

    return () => {
      cancelled = true;
      try {
        cornerstone.disable(previewElement);
      } catch {
        // no-op
      }
      previewElement.remove();
    };
  }, [stackImageIds, thumbWindow.start, thumbWindow.end]);

  useEffect(() => {
    if (!stackImageIds.length) return;

    const rail = thumbnailRailRef.current;
    const activeItem = thumbnailItemRefs.current[currentIndex];
    if (!rail || !activeItem) return;

    const railTop = rail.scrollTop;
    const railBottom = railTop + rail.clientHeight;
    const itemTop = activeItem.offsetTop;
    const itemBottom = itemTop + activeItem.offsetHeight;

    if (itemTop < railTop || itemBottom > railBottom) {
      activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    setThumbWindow((prev) => {
      const keepStart = Math.max(0, currentIndex - THUMB_OVERSCAN);
      const keepEnd = Math.min(stackImageIds.length - 1, currentIndex + THUMB_OVERSCAN + 6);
      return {
        start: Math.min(prev.start, keepStart),
        end: Math.max(prev.end, keepEnd),
      };
    });
  }, [currentIndex, stackImageIds.length]);

  useEffect(() => {
    const rail = thumbnailRailRef.current;
    if (!rail || !stackImageIds.length) return;

    const next = computeThumbWindow(rail.scrollTop, rail.clientHeight, stackImageIds.length);
    setThumbWindow(next);
  }, [computeThumbWindow, stackImageIds.length]);

  const displayImageAtIndex = useCallback(async (index: number) => {
    const element = elementRef.current;
    if (!element) return;

    const state = cornerstoneTools.getToolState(element, 'stack');
    const stackStateItem = state?.data?.[0];
    if (!stackStateItem) return;

    const clamped = Math.max(0, Math.min(index, stackStateItem.imageIds.length - 1));
    stackStateItem.currentImageIdIndex = clamped;

    try {
      const imageId = stackStateItem.imageIds[clamped];
      const image = await cornerstone.loadImage(imageId);
      cornerstone.displayImage(element, image);
      applyViewportState(element, isInverted);
      setCurrentIndex(clamped);
    } catch (err: any) {
      setError(err?.message || 'Erro ao navegar entre cortes.');
    }
  }, [applyViewportState, isInverted]);

  const scrollNext = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;
    const stackToolState = cornerstoneTools.getToolState(element, 'stack');
    const stack = stackToolState?.data?.[0];
    if (!stack) return;
    displayImageAtIndex(stack.currentImageIdIndex + 1);
  }, [displayImageAtIndex]);

  const scrollPrevious = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;
    const stackToolState = cornerstoneTools.getToolState(element, 'stack');
    const stack = stackToolState?.data?.[0];
    if (!stack) return;
    displayImageAtIndex(stack.currentImageIdIndex - 1);
  }, [displayImageAtIndex]);

  useEffect(() => {
    if (!cinePlaying || imageCount <= 1) return;

    const intervalMs = Math.max(40, 1000 / (CINE_BASE_FPS * cineSpeed));
    const handle = setInterval(() => {
      const element = elementRef.current;
      if (!element) return;
      const stackToolState = cornerstoneTools.getToolState(element, 'stack');
      const stack = stackToolState?.data?.[0];
      if (!stack) return;

      const next = (stack.currentImageIdIndex + 1) % stack.imageIds.length;
      displayImageAtIndex(next);
    }, intervalMs);

    return () => clearInterval(handle);
  }, [cinePlaying, cineSpeed, imageCount, displayImageAtIndex]);

  const toggleInvert = () => {
    const element = elementRef.current;
    if (!element) return;

    const next = !isInverted;
    setIsInverted(next);
    applyViewportState(element, next);
  };

  const applyWindowPreset = (presetIndex: number) => {
    const element = elementRef.current;
    if (!element) return;

    const preset = WINDOW_PRESETS[presetIndex];
    setWindowPresetIndex(presetIndex);

    if (!preset) return;
    if (preset.width === null || preset.center === null) return;

    const viewport = cornerstone.getViewport(element);
    if (!viewport) return;

    viewport.voi = viewport.voi || { windowWidth: 0, windowCenter: 0 };
    viewport.voi.windowWidth = preset.width;
    viewport.voi.windowCenter = preset.center;
    cornerstone.setViewport(element, viewport);
  };

  const cycleWindowPreset = () => {
    const next = (windowPresetIndex + 1) % WINDOW_PRESETS.length;
    applyWindowPreset(next);
  };

  const flipHorizontal = () => {
    const element = elementRef.current;
    if (!element) return;
    const viewport = cornerstone.getViewport(element);
    if (!viewport) return;
    viewport.hflip = !viewport.hflip;
    cornerstone.setViewport(element, viewport);
  };

  const flipVertical = () => {
    const element = elementRef.current;
    if (!element) return;
    const viewport = cornerstone.getViewport(element);
    if (!viewport) return;
    viewport.vflip = !viewport.vflip;
    cornerstone.setViewport(element, viewport);
  };

  const rotate90 = () => {
    const element = elementRef.current;
    if (!element) return;
    const viewport = cornerstone.getViewport(element);
    if (!viewport) return;
    viewport.rotation = ((viewport.rotation || 0) + 90) % 360;
    cornerstone.setViewport(element, viewport);
  };

  const clearMeasurements = () => {
    const element = elementRef.current;
    if (!element) return;

    const measurementTools = ['Length', 'Angle', 'Probe', 'RectangleRoi', 'EllipticalRoi', 'ArrowAnnotate'];
    measurementTools.forEach((toolName) => {
      cornerstoneTools.clearToolState(element, toolName);
    });
    cornerstone.updateImage(element);
  };

  const exportScreenshot = async () => {
    const element = elementRef.current;
    if (!element) return;

    const canvas = element.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `dicom-slice-${currentIndex + 1}.png`;
    link.click();
  };

  const resetView = () => {
    const element = elementRef.current;
    if (!element) return;
    cornerstone.reset(element);
    applyViewportState(element, isInverted);
    setWindowPresetIndex(0);
  };

  const cycleCineSpeed = () => {
    setCineSpeed((prev) => {
      if (prev === 1) return 2;
      if (prev === 2) return 4;
      return 1;
    });
  };

  const hasImages = imageCount > 0;

  return (
    <Box style={{ ...style, position: 'relative', background: '#000' }}>
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          padding: hasImages ? 12 : 0,
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: hasImages ? `${SIDEBAR_WIDTH}px 1fr` : '1fr',
          gridTemplateRows: hasImages ? 'auto 1fr' : '1fr',
          gap: hasImages ? 12 : 0,
        }}
      >
        {hasImages && (
          <Paper
            radius="md"
            p={6}
            style={{
              gridColumn: 1,
              gridRow: '1 / span 2',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(10, 14, 24, 0.92)',
              border: '1px solid rgba(95, 123, 255, 0.35)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <Box
              ref={thumbnailRailRef}
              onScroll={handleThumbnailRailScroll}
              style={{ minHeight: 0, overflowY: 'auto', flex: 1 }}
            >
              <Group gap={6}>
                {stackImageIds.map((_, index) => {
                  const active = index === currentIndex;
                  const thumbSrc = thumbnailDataUrls[index];
                  const instanceLabel = thumbnailInstanceLabels[index] || `Inst ${index + 1}`;

                  return (
                    <Box
                      key={`thumb-${index}`}
                      ref={(el) => {
                        thumbnailItemRefs.current[index] = el;
                      }}
                      onClick={() => displayImageAtIndex(index)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(evt: KeyboardEvent<HTMLDivElement>) => {
                        if (evt.key === 'Enter' || evt.key === ' ') {
                          evt.preventDefault();
                          displayImageAtIndex(index);
                        }
                      }}
                      style={{
                        width: '100%',
                        minHeight: 132,
                        cursor: 'pointer',
                        borderRadius: 10,
                        border: active ? '2px solid #339af0' : '1px solid rgba(95, 123, 255, 0.25)',
                        background: active ? 'rgba(51, 154, 240, 0.18)' : 'rgba(16, 22, 34, 0.9)',
                        padding: 6,
                      }}
                    >
                      <Box
                        style={{
                          width: '100%',
                          height: 92,
                          borderRadius: 6,
                          overflow: 'hidden',
                          background: '#020203',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt={`Corte ${index + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <Loader size="xs" color="gray" />
                        )}
                      </Box>
                      <Text size="sm" fw={700} c={active ? 'blue.2' : 'gray.2'} ta="center" mt={5}>
                        {index + 1}
                      </Text>
                      <Text size="xs" c={active ? 'blue.1' : 'gray.5'} ta="center" lh={1.1}>
                        {instanceLabel}
                      </Text>
                    </Box>
                  );
                })}
              </Group>
            </Box>

            <Paper
              radius="md"
              p={6}
              style={{
                marginTop: 6,
                background: 'rgba(8, 12, 20, 0.95)',
                border: '1px solid rgba(95, 123, 255, 0.35)',
              }}
            >
              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: '30px 1fr 30px',
                  alignItems: 'center',
                  columnGap: 6,
                }}
              >
                <ActionIcon size="sm" radius="md" variant="light" color="gray" onClick={scrollPrevious} disabled={currentIndex === 0}>
                  <ChevronLeft size={14} />
                </ActionIcon>

                <Text size="sm" c="white" fw={600} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {currentIndex + 1} / {imageCount}
                </Text>

                <ActionIcon size="sm" radius="md" variant="light" color="gray" onClick={scrollNext} disabled={currentIndex + 1 >= imageCount}>
                  <ChevronRight size={14} />
                </ActionIcon>
              </Box>

              <Group gap={6} mt={6} wrap="nowrap" justify="space-between">
                <Button
                  size="xs"
                  variant={cinePlaying ? 'filled' : 'light'}
                  color={cinePlaying ? 'blue' : 'gray'}
                  leftSection={cinePlaying ? <Pause size={14} /> : <Play size={14} />}
                  onClick={() => setCinePlaying((p) => !p)}
                  style={{ flex: 1 }}
                >
                  Cine
                </Button>

                <Tooltip label={`Velocidade cine: x${cineSpeed}`}>
                  <Button size="xs" variant="light" color="gray" onClick={cycleCineSpeed} style={{ minWidth: 44, paddingInline: 8 }}>
                    x{cineSpeed}
                  </Button>
                </Tooltip>
              </Group>
            </Paper>
          </Paper>
        )}

        {hasImages && (
          <Paper
            radius="md"
            p={6}
            style={{
              gridColumn: 2,
              gridRow: 1,
              overflowX: 'auto',
              background: 'rgba(10, 14, 24, 0.92)',
              border: '1px solid rgba(95, 123, 255, 0.35)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <Group gap={6} wrap="nowrap" style={{ minWidth: 'max-content' }}>
              <Tooltip label="Janela / Nível (W/L)">
                <Button size="xs" variant={activeTool === 'wwwc' ? 'filled' : 'light'} color={activeTool === 'wwwc' ? 'blue' : 'gray'} onClick={() => setTool('wwwc')}>
                  WL
                </Button>
              </Tooltip>

              <Tooltip label="Lupa">
                <Button size="xs" leftSection={<ZoomIn size={14} />} variant={activeTool === 'magnify' ? 'filled' : 'light'} color={activeTool === 'magnify' ? 'blue' : 'gray'} onClick={() => setTool('magnify')}>
                  Lupa
                </Button>
              </Tooltip>

              <Tooltip label="Pan">
                <Button size="xs" leftSection={<Move size={14} />} variant={activeTool === 'pan' ? 'filled' : 'light'} color={activeTool === 'pan' ? 'blue' : 'gray'} onClick={() => setTool('pan')}>
                  Pan
                </Button>
              </Tooltip>

              <Tooltip label="Distância">
                <Button size="xs" leftSection={<Ruler size={14} />} variant={activeTool === 'length' ? 'filled' : 'light'} color={activeTool === 'length' ? 'blue' : 'gray'} onClick={() => setTool('length')}>
                  Distância
                </Button>
              </Tooltip>

              <Tooltip label="Ângulo">
                <Button size="xs" variant={activeTool === 'angle' ? 'filled' : 'light'} color={activeTool === 'angle' ? 'blue' : 'gray'} onClick={() => setTool('angle')}>
                  Ângulo
                </Button>
              </Tooltip>

              <Tooltip label="ROI Retangular">
                <Button size="xs" variant={activeTool === 'rect' ? 'filled' : 'light'} color={activeTool === 'rect' ? 'blue' : 'gray'} onClick={() => setTool('rect')}>
                  ROI Ret.
                </Button>
              </Tooltip>

              <Tooltip label="ROI Elíptica">
                <Button size="xs" variant={activeTool === 'ellipse' ? 'filled' : 'light'} color={activeTool === 'ellipse' ? 'blue' : 'gray'} onClick={() => setTool('ellipse')}>
                  ROI Elíp.
                </Button>
              </Tooltip>

              <Tooltip label="Probe (HU / intensidade)">
                <Button size="xs" variant={activeTool === 'probe' ? 'filled' : 'light'} color={activeTool === 'probe' ? 'blue' : 'gray'} onClick={() => setTool('probe')}>
                  Probe
                </Button>
              </Tooltip>

              <Tooltip label="Anotação com seta">
                <Button size="xs" variant={activeTool === 'arrow' ? 'filled' : 'light'} color={activeTool === 'arrow' ? 'blue' : 'gray'} onClick={() => setTool('arrow')}>
                  Anotar
                </Button>
              </Tooltip>

              <Tooltip label={`Preset de janela: ${WINDOW_PRESETS[windowPresetIndex].name}`}>
                <Button size="xs" variant="light" color="gray" onClick={cycleWindowPreset}>
                  Janela {WINDOW_PRESETS[windowPresetIndex].short}
                </Button>
              </Tooltip>

              <Tooltip label="Flip horizontal">
                <Button size="xs" leftSection={<FlipHorizontal size={14} />} variant="light" color="gray" onClick={flipHorizontal}>
                  Flip H
                </Button>
              </Tooltip>

              <Tooltip label="Flip vertical">
                <Button size="xs" leftSection={<FlipVertical size={14} />} variant="light" color="gray" onClick={flipVertical}>
                  Flip V
                </Button>
              </Tooltip>

              <Tooltip label="Rotacionar 90°">
                <Button size="xs" leftSection={<RotateCw size={14} />} variant="light" color="gray" onClick={rotate90}>
                  Rot. 90°
                </Button>
              </Tooltip>

              <Tooltip label={isInverted ? 'Desfazer invert' : 'Invert'}>
                <Button size="xs" leftSection={<RotateCcw size={14} />} variant={isInverted ? 'filled' : 'light'} color={isInverted ? 'orange' : 'gray'} onClick={toggleInvert}>
                  Invert
                </Button>
              </Tooltip>

              <Tooltip label="Exportar PNG">
                <Button size="xs" leftSection={<Camera size={14} />} variant="light" color="gray" onClick={exportScreenshot}>
                  Exportar
                </Button>
              </Tooltip>

              <Tooltip label="Limpar medidas e anotações">
                <Button size="xs" leftSection={<Eraser size={14} />} variant="light" color="gray" onClick={clearMeasurements}>
                  Limpar
                </Button>
              </Tooltip>

              <Tooltip label="Reset view">
                <Button size="xs" leftSection={<RefreshCw size={14} />} variant="light" color="gray" onClick={resetView}>
                  Reset
                </Button>
              </Tooltip>
            </Group>
          </Paper>
        )}

        <Box
          style={{
            gridColumn: hasImages ? 2 : 1,
            gridRow: hasImages ? 2 : 1,
            position: 'relative',
            minHeight: 0,
            borderRadius: 10,
            overflow: 'hidden',
            border: hasImages ? '1px solid rgba(95, 123, 255, 0.25)' : 'none',
            background: '#000',
          }}
        >
          <Box
            ref={elementRef}
            style={{ width: '100%', height: '100%', touchAction: 'none' }}
            id={`cornerstone-viewer-${viewerId}`}
          />

          {loading && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}>
              <Loader color="blue" />
            </Box>
          )}

          {error && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}>
              <Text color="red">{error}</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
