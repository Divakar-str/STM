import { createManagedObjectUrl, sanitizeFilename } from './pdf-files.js';

export function downloadBlob(blob, filename) {
  const url = createManagedObjectUrl(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadPdfBytes(uint8Array, filename) {
  const clean = `${sanitizeFilename(filename)}.pdf`;
  const blob = new Blob([uint8Array], { type: 'application/pdf' });
  downloadBlob(blob, clean);
  return { filename: clean, size: blob.size };
}

export async function createAndDownloadZip(items, zipFilename = 'pdf-studio-output.zip', onProgress = null) {
  if (!window.JSZip) {
    throw new Error('JSZip library is not loaded.');
  }
  const zip = new window.JSZip();
  items.forEach(item => {
    zip.file(item.filename, item.data);
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' }, metadata => {
    if (typeof onProgress === 'function') {
      onProgress(Math.round(metadata.percent));
    }
  });

  const cleanZip = zipFilename.endsWith('.zip') ? zipFilename : `${sanitizeFilename(zipFilename)}.zip`;
  downloadBlob(zipBlob, cleanZip);
  return { filename: cleanZip, size: zipBlob.size };
}