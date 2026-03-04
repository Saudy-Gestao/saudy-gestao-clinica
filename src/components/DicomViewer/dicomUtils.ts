import dicomParser from 'dicom-parser';
import { Decoder as JpegLosslessDecoder } from 'jpeg-lossless-decoder-js';

const TRANSFER_SYNTAX_LABELS: Record<string, string> = {
  '1.2.840.10008.1.2': 'Implicit VR Little Endian (não comprimido)',
  '1.2.840.10008.1.2.1': 'Explicit VR Little Endian (não comprimido)',
  '1.2.840.10008.1.2.2': 'Explicit VR Big Endian (não comprimido)',
  '1.2.840.10008.1.2.4.57': 'JPEG Lossless, Process 14 (comprimido)',
  '1.2.840.10008.1.2.4.70': 'JPEG Lossless, Process 14 [Selection 1] (comprimido)',
  '1.2.840.10008.1.2.5': 'RLE Lossless (comprimido)',
};

const JPEG_LOSSLESS_SYNTAXES = new Set([
  '1.2.840.10008.1.2.4.57',
  '1.2.840.10008.1.2.4.70',
]);

/* ───────────────── Types ───────────────── */

export interface DicomMetadata {
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  studyDescription: string;
  seriesDescription: string;
  institutionName: string;
  rows: number;
  columns: number;
  bitsAllocated: number;
  bitsStored: number;
  windowCenter: number;
  windowWidth: number;
  rescaleIntercept: number;
  rescaleSlope: number;
  photometricInterpretation: string;
  pixelSpacing: [number, number] | null;
  instanceNumber: number;
  sliceLocation: number | null;
}

export interface DicomImage {
  metadata: DicomMetadata;
  pixelData: Int16Array | Uint16Array | Uint8Array;
  minPixelValue: number;
  maxPixelValue: number;
}

export interface Measurement {
  id: string;
  startImg: { x: number; y: number };
  endImg: { x: number; y: number };
  distanceMm: number | null;
  distancePx: number;
}

/* ───────────────── Helpers ───────────────── */

function formatDicomDate(raw: string): string {
  if (!raw || raw.length < 8) return raw || 'N/A';
  return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)}`;
}

/* ───────────────── Parse ───────────────── */

export function parseDicomFile(arrayBuffer: ArrayBuffer): DicomImage {
  const byteArray = new Uint8Array(arrayBuffer);
  const dataSet = dicomParser.parseDicom(byteArray);

  // Transfer Syntax
  const transferSyntax = (dataSet.string('x00020010') || '').trim();
  const transferSyntaxName =
    TRANSFER_SYNTAX_LABELS[transferSyntax] ||
    (transferSyntax.startsWith('1.2.840.10008.1.2.4')
      ? 'JPEG/JPEG2000 (comprimido)'
      : 'desconhecido');

  const isJpegFamilyCompressed = transferSyntax.startsWith('1.2.840.10008.1.2.4');
  const isRleCompressed = transferSyntax === '1.2.840.10008.1.2.5';
  const isJpegLosslessSupported = JPEG_LOSSLESS_SYNTAXES.has(transferSyntax);

  if (
    (isJpegFamilyCompressed || isRleCompressed) &&
    !isJpegLosslessSupported
  ) {
    throw new Error(
      `Arquivo DICOM comprimido com sintaxe ainda não suportada. Transfer Syntax: ${transferSyntax || 'não informado'} (${transferSyntaxName}). Atualmente o visualizador suporta não comprimido e JPEG Lossless (1.2.840.10008.1.2.4.57 / 1.2.840.10008.1.2.4.70).`,
    );
  }

  const rows = dataSet.uint16('x00280010') || 0;
  const columns = dataSet.uint16('x00280011') || 0;
  if (rows === 0 || columns === 0) {
    throw new Error('Dimensões da imagem inválidas no arquivo DICOM.');
  }

  const bitsAllocated = dataSet.uint16('x00280100') || 16;
  const bitsStored = dataSet.uint16('x00280101') || 12;
  const pixelRepresentation = dataSet.uint16('x00280103') || 0;

  const wcStr = dataSet.string('x00281050') || '';
  const wwStr = dataSet.string('x00281051') || '';
  const rescaleIntercept = parseFloat(dataSet.string('x00281052') || '0');
  const rescaleSlope = parseFloat(dataSet.string('x00281053') || '1');
  const photometricInterpretation = dataSet.string('x00280004') || 'MONOCHROME2';

  const windowCenter = parseFloat(wcStr.split('\\')[0] || '0');
  const windowWidth = parseFloat(wwStr.split('\\')[0] || '0');

  const psStr = dataSet.string('x00280030');
  const pixelSpacing: [number, number] | null = psStr
    ? (psStr.split('\\').map(Number) as [number, number])
    : null;

  // ---- Pixel data ----
  const pxElement = dataSet.elements.x7fe00010;
  if (!pxElement) throw new Error('Dados de pixel não encontrados no arquivo DICOM.');

  let aligned: ArrayBuffer;
  if (isJpegLosslessSupported) {
    const frameCount = dataSet.intString('x00280008') || 1;
    if (frameCount > 1) {
      throw new Error(
        `DICOM com múltiplos frames (${frameCount}) não é suportado neste visualizador.`,
      );
    }

    if (!pxElement.encapsulatedPixelData || !pxElement.fragments || pxElement.fragments.length === 0) {
      throw new Error('Dados de pixel encapsulados não encontrados ou sem fragmentos.');
    }

    // Read all fragments (works even when basicOffsetTable is empty)
    const encapsulatedFrame = dicomParser.readEncapsulatedPixelDataFromFragments(
      dataSet,
      pxElement,
      0,
      pxElement.fragments.length,
    );

    // Create an isolated copy of the JPEG stream so the decoder always starts at
    // offset 0 – avoids shared-buffer / byteOffset issues with views.
    const jpegBuffer = new ArrayBuffer(encapsulatedFrame.byteLength);
    new Uint8Array(jpegBuffer).set(encapsulatedFrame);

    const decoder = new JpegLosslessDecoder();
    const decoded = decoder.decompress(jpegBuffer, 0, jpegBuffer.byteLength);

    if (!decoded || decoded.byteLength === 0) {
      throw new Error('Falha na decodificação JPEG Lossless: dados de pixel vazios.');
    }

    // Ensure even byte length for 16-bit TypedArray view
    if (decoded.byteLength % 2 !== 0) {
      const padded = new ArrayBuffer(decoded.byteLength + 1);
      new Uint8Array(padded).set(new Uint8Array(decoded));
      aligned = padded;
    } else {
      aligned = decoded;
    }
  } else {
    // Uncompressed pixel data: copy into aligned ArrayBuffer (TypedArray needs aligned offsets)
    const rawLen = pxElement.length ?? 0;
    // Ensure even byte length for 16-bit arrays
    const alignedLen = bitsAllocated === 16 && rawLen % 2 !== 0 ? rawLen + 1 : rawLen;
    const rawBytes = new Uint8Array(arrayBuffer, pxElement.dataOffset, rawLen);
    aligned = new ArrayBuffer(alignedLen);
    new Uint8Array(aligned).set(rawBytes);
  }

  let pixelData: Int16Array | Uint16Array | Uint8Array;
  if (bitsAllocated === 16) {
    pixelData = pixelRepresentation === 1 ? new Int16Array(aligned) : new Uint16Array(aligned);
  } else {
    pixelData = new Uint8Array(aligned);
  }

  // Min / Max (rescaled) — skip leading zeros that some decoders emit as padding
  let minPixelValue = Infinity;
  let maxPixelValue = -Infinity;
  for (let i = 0; i < pixelData.length; i++) {
    const v = pixelData[i] * rescaleSlope + rescaleIntercept;
    if (v < minPixelValue) minPixelValue = v;
    if (v > maxPixelValue) maxPixelValue = v;
  }
  // Fallback if the whole buffer decoded to the same value (e.g. empty/corrupt)
  if (minPixelValue === maxPixelValue) {
    minPixelValue = minPixelValue - 1;
    maxPixelValue = maxPixelValue + 1;
  }

  // Use DICOM WC/WW only when they are present AND valid (WC=0 is valid, WW must be > 0)
  const hasDicomWC = wcStr !== '' && isFinite(windowCenter);
  const hasDicomWW = wwStr !== '' && isFinite(windowWidth) && windowWidth > 0;
  const autoWC = hasDicomWC ? windowCenter : (minPixelValue + maxPixelValue) / 2;
  const autoWW = hasDicomWW ? windowWidth : Math.max(maxPixelValue - minPixelValue, 1);

  const metadata: DicomMetadata = {
    patientName: dataSet.string('x00100010')?.replace(/\^/g, ' ').trim() || 'N/A',
    patientId: dataSet.string('x00100020') || 'N/A',
    studyDate: formatDicomDate(dataSet.string('x00080020') || ''),
    modality: dataSet.string('x00080060') || 'N/A',
    studyDescription: dataSet.string('x00081030') || '',
    seriesDescription: dataSet.string('x0008103e') || '',
    institutionName: dataSet.string('x00080080') || '',
    rows,
    columns,
    bitsAllocated,
    bitsStored,
    windowCenter: autoWC,
    windowWidth: autoWW,
    rescaleIntercept,
    rescaleSlope,
    photometricInterpretation,
    pixelSpacing,
    instanceNumber: dataSet.intString('x00200013') ?? 0,
    sliceLocation: dataSet.string('x00201041') ? parseFloat(dataSet.string('x00201041')!) : null,
  };

  return { metadata, pixelData, minPixelValue, maxPixelValue };
}

/* ───────────────── Series sorting ───────────────── */

export function sortDicomSeries(images: DicomImage[]): DicomImage[] {
  return [...images].sort((a, b) => {
    // Prefer sliceLocation (more reliable spatial ordering)
    if (a.metadata.sliceLocation != null && b.metadata.sliceLocation != null) {
      return a.metadata.sliceLocation - b.metadata.sliceLocation;
    }
    // Fallback to instanceNumber
    return a.metadata.instanceNumber - b.metadata.instanceNumber;
  });
}

/* ───────────────── Display pixels (W/L) ───────────────── */

export function buildDisplayPixels(
  image: DicomImage,
  wc: number,
  ww: number,
  invert: boolean,
): Uint8ClampedArray {
  const { metadata, pixelData } = image;
  const { rescaleSlope, rescaleIntercept, photometricInterpretation } = metadata;
  const isMono1 = photometricInterpretation === 'MONOCHROME1';
  const shouldInvert = isMono1 !== invert;

  const lower = wc - ww / 2;
  const upper = wc + ww / 2;
  const range = upper - lower || 1;

  const rgba = new Uint8ClampedArray(pixelData.length * 4);

  for (let i = 0; i < pixelData.length; i++) {
    const raw = pixelData[i] * rescaleSlope + rescaleIntercept;
    let g: number;
    if (raw <= lower) g = 0;
    else if (raw >= upper) g = 255;
    else g = ((raw - lower) / range) * 255;

    if (shouldInvert) g = 255 - g;

    const idx = i * 4;
    rgba[idx] = g;
    rgba[idx + 1] = g;
    rgba[idx + 2] = g;
    rgba[idx + 3] = 255;
  }

  return rgba;
}

/* ───────────────── Coordinate transforms ───────────────── */

export function screenToImage(
  sx: number,
  sy: number,
  cw: number,
  ch: number,
  iw: number,
  ih: number,
  zoom: number,
  px: number,
  py: number,
  rot: number,
): { x: number; y: number } {
  let x = sx - cw / 2 - px;
  let y = sy - ch / 2 - py;

  const rad = -(rot * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const rx = x * c - y * s;
  const ry = x * s + y * c;

  const fit = Math.min(cw / iw, ch / ih);
  return { x: rx / (zoom * fit) + iw / 2, y: ry / (zoom * fit) + ih / 2 };
}

export function imageToScreen(
  ix: number,
  iy: number,
  cw: number,
  ch: number,
  iw: number,
  ih: number,
  zoom: number,
  px: number,
  py: number,
  rot: number,
): { x: number; y: number } {
  const fit = Math.min(cw / iw, ch / ih);
  let x = (ix - iw / 2) * zoom * fit;
  let y = (iy - ih / 2) * zoom * fit;

  const rad = (rot * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: x * c - y * s + cw / 2 + px, y: x * s + y * c + ch / 2 + py };
}

/* ───────────────── Measurement ───────────────── */

export function calculateDistance(
  start: { x: number; y: number },
  end: { x: number; y: number },
  pixelSpacing: [number, number] | null,
): { distancePx: number; distanceMm: number | null } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distancePx = Math.sqrt(dx * dx + dy * dy);

  if (pixelSpacing && pixelSpacing[0] > 0 && pixelSpacing[1] > 0) {
    const dxMm = dx * pixelSpacing[1];
    const dyMm = dy * pixelSpacing[0];
    return { distancePx, distanceMm: Math.sqrt(dxMm * dxMm + dyMm * dyMm) };
  }

  return { distancePx, distanceMm: null };
}
