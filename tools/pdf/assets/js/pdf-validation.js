import { PDF_CONFIG } from './pdf-config.js';
import { PdfStudioError, ERROR_CODES } from './pdf-errors.js';

export async function validatePdfFile(file) {
  if (!file) {
    throw new PdfStudioError(ERROR_CODES.EMPTY_SELECTION, 'No file provided.', null, 'Please select a valid PDF file.');
  }
  const maxBytes = PDF_CONFIG.LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new PdfStudioError(
      ERROR_CODES.SIZE_EXCEEDED,
      `File "${file.name}" (${(file.size / 1048576).toFixed(1)} MB) exceeds the ${PDF_CONFIG.LIMITS.MAX_FILE_SIZE_MB} MB limit.`,
      file.name,
      'Split or compress the file before uploading.'
    );
  }
  if (file.size < 8) {
    throw new PdfStudioError(ERROR_CODES.CORRUPT_FILE, `File "${file.name}" is empty or truncated.`, file.name, 'Choose a valid non-empty PDF document.');
  }

  const headerSlice = await file.slice(0, 1024).arrayBuffer();
  const headerText = new TextDecoder('ascii').decode(headerSlice);
  if (!headerText.includes('%PDF-')) {
    throw new PdfStudioError(
      ERROR_CODES.MAGIC_BYTE_MISMATCH,
      `File "${file.name}" does not have a valid PDF signature (%PDF-). It may have a misleading file extension.`,
      file.name,
      'Ensure the file is a genuine PDF document and not another format renamed to .pdf.'
    );
  }
  return true;
}

export async function validateImageFile(file) {
  if (!file || file.size < 12) {
    throw new PdfStudioError(ERROR_CODES.CORRUPT_FILE, `Image "${file?.name || ''}" is empty or corrupted.`, file?.name, 'Select a valid JPG, PNG, or WebP file.');
  }
  const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
  const isWebp = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
                 buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;

  if (!isJpeg && !isPng && !isWebp) {
    throw new PdfStudioError(
      ERROR_CODES.UNSUPPORTED_FORMAT,
      `File "${file.name}" is not a valid JPG, PNG, or WebP image.`,
      file.name,
      'Convert the image to standard JPEG, PNG, or WebP format before uploading.'
    );
  }
  return { format: isJpeg ? 'JPEG' : isPng ? 'PNG' : 'WEBP' };
}

export function parseAndValidatePageRanges(rangeStr, maxPages, allowOverlap = true) {
  const cleaned = (rangeStr || '').trim();
  if (!cleaned) {
    throw new PdfStudioError(
      ERROR_CODES.INVALID_RANGE,
      'Page range cannot be empty.',
      null,
      `Enter page numbers or ranges between 1 and ${maxPages} (e.g., 1-3, 5, 7-9).`
    );
  }

  const tokens = cleaned.split(',').map(t => t.trim()).filter(Boolean);
  if (tokens.length === 0) {
    throw new PdfStudioError(ERROR_CODES.INVALID_RANGE, 'No valid page numbers found.', null, 'Use commas to separate ranges.');
  }

  const groups = [];
  const seenPages = new Set();
  let hasOverlap = false;

  for (const token of tokens) {
    if (!/^\d+(\s*-\s*\d+)?$/.test(token)) {
      throw new PdfStudioError(
        ERROR_CODES.INVALID_RANGE,
        `Malformed range segment "${token}".`,
        null,
        'Use positive integers and hyphens only, such as "1-5" or "1-3, 7, 9-12".'
      );
    }

    const parts = token.split('-').map(n => parseInt(n.trim(), 10));
    const start = parts[0];
    const end = parts.length === 2 ? parts[1] : start;

    if (start < 1 || end < 1) {
      throw new PdfStudioError(ERROR_CODES.INVALID_RANGE, `Page numbers must be 1 or greater (found "${token}").`, null, `Valid pages are 1 to ${maxPages}.`);
    }
    if (start > end) {
      throw new PdfStudioError(ERROR_CODES.INVALID_RANGE, `Reversed page range "${token}" (${start} is greater than ${end}).`, null, `Write the smaller page number first, e.g., "${end}-${start}".`);
    }
    if (end > maxPages) {
      throw new PdfStudioError(
        ERROR_CODES.INVALID_RANGE,
        `Page range "${token}" exceeds the document's total page count (${maxPages}).`,
        null,
        `Enter page numbers between 1 and ${maxPages}.`
      );
    }

    const pages = [];
    for (let p = start; p <= end; p++) {
      if (seenPages.has(p)) {
        hasOverlap = true;
      }
      seenPages.add(p);
      pages.push(p);
    }
    groups.push({ label: start === end ? `Page ${start}` : `Pages ${start}-${end}`, pages });
  }

  if (hasOverlap && !allowOverlap) {
    throw new PdfStudioError(
      ERROR_CODES.INVALID_RANGE,
      'Overlapping page ranges detected.',
      null,
      'Ensure each page number appears in only one range, or enable overlap support.'
    );
  }

  return { groups, flatPages: Array.from(seenPages), hasOverlap };
}

export async function verifyGeneratedPdfBytes(uint8Array) {
  if (!uint8Array || uint8Array.byteLength < 64) {
    throw new PdfStudioError(ERROR_CODES.OUTPUT_INVALID, 'Generated PDF is empty or incomplete.', null, 'Please retry the operation.');
  }
  try {
    const doc = await window.PDFLib.PDFDocument.load(uint8Array);
    const pageCount = doc.getPageCount();
    if (pageCount < 1) {
      throw new Error('Generated PDF contains 0 pages.');
    }
    return { valid: true, pageCount, byteLength: uint8Array.byteLength };
  } catch (err) {
    throw new PdfStudioError(
      ERROR_CODES.OUTPUT_INVALID,
      `Output verification failed: ${err.message}`,
      null,
      'The generated PDF failed integrity verification. Your original files are untouched.'
    );
  }
}