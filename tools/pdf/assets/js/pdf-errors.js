export class PdfStudioError extends Error {
  constructor(code, message, file = null, remediation = '', recoverable = true) {
    super(message);
    this.name = 'PdfStudioError';
    this.code = code;
    this.file = file;
    this.remediation = remediation;
    this.recoverable = recoverable;
  }
}

export const ERROR_CODES = {
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  MAGIC_BYTE_MISMATCH: 'MAGIC_BYTE_MISMATCH',
  ENCRYPTED_PDF: 'ENCRYPTED_PDF',
  CORRUPT_FILE: 'CORRUPT_FILE',
  INVALID_RANGE: 'INVALID_RANGE',
  EMPTY_SELECTION: 'EMPTY_SELECTION',
  SIZE_EXCEEDED: 'SIZE_EXCEEDED',
  CAMERA_DENIED: 'CAMERA_DENIED',
  OUTPUT_INVALID: 'OUTPUT_INVALID',
  CANCELLED: 'CANCELLED',
  PROCESSING_FAILED: 'PROCESSING_FAILED'
};

export function normalizeError(err, filename = null) {
  if (err instanceof PdfStudioError) return err;
  const msg = String(err?.message || err || 'Unknown error');

  if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypted')) {
    return new PdfStudioError(
      ERROR_CODES.ENCRYPTED_PDF,
      `The PDF "${filename || 'Document'}" is password-protected or encrypted.`,
      filename,
      'Please remove the password protection in your PDF reader and upload the unlocked file.'
    );
  }
  if (msg.toLowerCase().includes('invalid pdf') || msg.toLowerCase().includes('header')) {
    return new PdfStudioError(
      ERROR_CODES.CORRUPT_FILE,
      `The file "${filename || 'Document'}" appears to be corrupted or is not a valid PDF.`,
      filename,
      'Verify that the file opens normally in a PDF viewer and try uploading a fresh copy.'
    );
  }
  return new PdfStudioError(
    ERROR_CODES.PROCESSING_FAILED,
    msg,
    filename,
    'Please check your input files or settings and click Retry.'
  );
}