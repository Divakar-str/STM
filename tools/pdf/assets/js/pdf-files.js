import { initPdfJsWorker } from './pdf-config.js';
import { validatePdfFile, validateImageFile } from './pdf-validation.js';
import { normalizeError } from './pdf-errors.js';

const activeObjectUrls = new Set();

export function createManagedObjectUrl(blob) {
  const url = URL.createObjectURL(blob);
  activeObjectUrls.add(url);
  return url;
}

export function revokeAllManagedUrls() {
  for (const url of activeObjectUrls) {
    try { URL.revokeObjectURL(url); } catch (_) {}
  }
  activeObjectUrls.clear();
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function sanitizeFilename(name, fallback = 'document') {
  const cleaned = (name || fallback)
    .replace(/\.pdf$/i, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .trim();
  return cleaned || fallback;
}

export async function inspectPdfFile(file) {
  await validatePdfFile(file);
  initPdfJsWorker();
  const arrayBuffer = await file.arrayBuffer();
  try {
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
    const pdfDoc = await loadingTask.promise;
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : `pdf-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      pageCount: pdfDoc.numPages,
      arrayBuffer,
      pdfDoc
    };
  } catch (err) {
    throw normalizeError(err, file.name);
  }
}

export async function renderPageThumbnail(pdfDoc, pageNum, maxWidth = 220, rotationOffset = 0) {
  const page = await pdfDoc.getPage(pageNum);
  const baseViewport = page.getViewport({ scale: 1, rotation: (page.rotate + rotationOffset) % 360 });
  const scale = maxWidth / baseViewport.width;
  const viewport = page.getViewport({ scale, rotation: (page.rotate + rotationOffset) % 360 });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d', { alpha: false });

  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

export async function inspectImageFile(file) {
  const { format } = await validateImageFile(file);
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });
  const objectUrl = createManagedObjectUrl(blob);

  const dimensions = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`Unable to decode image "${file.name}".`));
    img.src = objectUrl;
  });

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `img-${Date.now()}-${Math.random()}`,
    file,
    name: file.name,
    size: file.size,
    format,
    width: dimensions.width,
    height: dimensions.height,
    rotation: 0,
    arrayBuffer,
    objectUrl
  };
}