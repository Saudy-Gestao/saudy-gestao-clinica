/**
 * Custom Cornerstone3D image loader that uses dicom-parser directly.
 * Bypasses the @cornerstonejs/dicom-image-loader web worker/WASM pipeline,
 * ensuring reliable DICOM parsing and rendering in any bundler (Vite, etc.).
 */
import { registerImageLoader, metaData as csMetaData } from '@cornerstonejs/core';
import type { Types as csTypes } from '@cornerstonejs/core';
import {
  parseDicomFile,
  buildDisplayPixels,
  type DicomImage,
  type DicomMetadata,
} from './dicomUtils';

const SCHEME = 'saudy';

/* ─── Internal cache ─── */
const cache = new Map<string, DicomImage>();
let nextId = 0;

/* ═══════════════ Public API ═══════════════ */

/**
 * Read a DICOM File, parse it with dicom-parser, cache the result.
 * @returns a Cornerstone-compatible imageId (`saudy:N`).
 */
export async function addFile(file: File): Promise<string> {
  const ab = await file.arrayBuffer();
  const parsed = parseDicomFile(ab);
  const imageId = `${SCHEME}:${nextId++}`;
  cache.set(imageId, parsed);
  return imageId;
}

/** Retrieve the full parsed DICOM data for a given imageId. */
export function getImageData(imageId: string): DicomImage | undefined {
  return cache.get(imageId);
}

/** Retrieve just the DICOM metadata for a given imageId. */
export function getMetadata(imageId: string): DicomMetadata | undefined {
  return cache.get(imageId)?.metadata;
}

/** Clear the image cache (call when loading a new series). */
export function clearCache(): void {
  cache.clear();
  nextId = 0;
}

/* ═══════════════ Cornerstone image loader ═══════════════ */

function buildCsImage(imageId: string): csTypes.IImage {
  const data = cache.get(imageId);
  if (!data) throw new Error(`DICOM não encontrado no cache: ${imageId}`);

  const { metadata: m, pixelData } = data;

  // Raw (pre-rescale) min/max — Cornerstone applies slope/intercept itself
  let rawMin = Infinity;
  let rawMax = -Infinity;
  for (let i = 0; i < pixelData.length; i++) {
    if (pixelData[i] < rawMin) rawMin = pixelData[i];
    if (pixelData[i] > rawMax) rawMax = pixelData[i];
  }
  if (!Number.isFinite(rawMin)) rawMin = 0;
  if (!Number.isFinite(rawMax)) rawMax = 255;

  const dataType =
    pixelData instanceof Int16Array
      ? 'Int16Array'
      : pixelData instanceof Uint16Array
        ? 'Uint16Array'
        : 'Uint8Array';

  return {
    imageId,
    rows: m.rows,
    columns: m.columns,
    height: m.rows,
    width: m.columns,
    color: false,
    rgba: false,
    numberOfComponents: 1,
    columnPixelSpacing: m.pixelSpacing?.[1] ?? 1,
    rowPixelSpacing: m.pixelSpacing?.[0] ?? 1,
    invert: m.photometricInterpretation === 'MONOCHROME1',
    sizeInBytes: pixelData.byteLength,
    slope: m.rescaleSlope,
    intercept: m.rescaleIntercept,
    windowCenter: [m.windowCenter],
    windowWidth: [m.windowWidth],
    voiLUTFunction: 'LINEAR',
    minPixelValue: rawMin,
    maxPixelValue: rawMax,
    isPreScaled: false,
    getPixelData: () => pixelData,
    getCanvas: () => {
      const canvas = document.createElement('canvas');
      canvas.width = m.columns;
      canvas.height = m.rows;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imgData = ctx.createImageData(m.columns, m.rows);
        const rgba = buildDisplayPixels(data, m.windowCenter, m.windowWidth, false);
        imgData.data.set(rgba);
        ctx.putImageData(imgData, 0, 0);
      }
      return canvas;
    },
    dataType,
  } as csTypes.IImage;
}

function saudyLoader(imageId: string): csTypes.IImageLoadObject {
  return {
    promise: Promise.resolve(buildCsImage(imageId)),
  };
}

/* ═══════════════ Cornerstone metadata provider ═══════════════ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function metadataProvider(type: string, imageId: string): any {
  if (!imageId.startsWith(`${SCHEME}:`)) return;
  const data = cache.get(imageId);
  if (!data) return;
  const m = data.metadata;

  switch (type) {
    case 'generalSeriesModule':
      return { modality: m.modality, seriesDescription: m.seriesDescription };
    case 'patientModule':
      return { patientName: m.patientName, patientId: m.patientId };
    case 'generalStudyModule':
      return { studyDate: m.studyDate, studyDescription: m.studyDescription };
    case 'imagePlaneModule':
      return {
        rowPixelSpacing: m.pixelSpacing?.[0],
        columnPixelSpacing: m.pixelSpacing?.[1],
      };
    case 'imagePixelModule':
      return {
        rows: m.rows,
        columns: m.columns,
        bitsAllocated: m.bitsAllocated,
        bitsStored: m.bitsStored,
        samplesPerPixel: 1,
        pixelRepresentation: 0,
        photometricInterpretation: m.photometricInterpretation,
      };
    case 'voiLutModule':
      return { windowCenter: [m.windowCenter], windowWidth: [m.windowWidth] };
    case 'modalityLutModule':
      return { rescaleIntercept: m.rescaleIntercept, rescaleSlope: m.rescaleSlope };
    default:
      return;
  }
}

/* ═══════════════ Registration (call once after csCore.init()) ═══════════════ */

export function registerSaudyLoader(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerImageLoader(SCHEME, saudyLoader as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  csMetaData.addProvider(metadataProvider as any, 10000);
}
