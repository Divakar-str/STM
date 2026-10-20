export const PDF_CONFIG = {
  APP_NAME: 'PDF Studio',
  VERSION: '2.0.0',
  CDN: {
    PDFJS_LIB: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    PDFJS_WORKER: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    PDFLIB: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
    JSZIP: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    SORTABLE: 'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.2/Sortable.min.js',
    TESSERACT: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.5/dist/tesseract.min.js'
  },
  LIMITS: {
    MAX_FILE_SIZE_MB: 150,
    WARN_FILE_SIZE_MB: 50,
    MAX_TOTAL_FILES: 50,
    MAX_PAGES_WARN: 200,
    HIGH_DPI_MEMORY_WARN: 150
  },
  PAGE_SIZES: {
    A4: [595.28, 841.89],
    A3: [841.89, 1190.55],
    Letter: [612, 792],
    Legal: [612, 1008]
  },
TOOLS: [
    { id: 'dashboard', title: 'Dashboard', href: 'index.html', icon: 'bi-grid-1x2-fill', desc: 'Overview of all PDF tools' },
    { id: 'organize', title: 'Organize PDF', href: 'organize.html', icon: 'bi-grid-3x3-gap-fill', desc: 'Reorder, rotate, crop, copy, duplicate, extract & delete PDF pages' },
    { id: 'merge', title: 'Merge PDF', href: 'merge.html', icon: 'bi-arrows-angle-contract', desc: 'Combine two or more PDF files in your desired order' },
    { id: 'split', title: 'Split PDF', href: 'split.html', icon: 'bi-arrows-angle-expand', desc: 'Preview & extract custom ranges, groups, or every page into separate PDFs' },
    { id: 'scan', title: 'Scan to PDF', href: 'scan.html', icon: 'bi-camera-fill', desc: 'Capture from camera or import scans, adjust filters, crop & export' },
    { id: 'pdf-to-image', title: 'PDF to Image', href: 'pdf-to-image.html', icon: 'bi-file-earmark-image', desc: 'Render PDF pages to PNG or JPEG with live size, copy & single-page download' },
    { id: 'image-to-pdf', title: 'Add Image to PDF', href: 'image-to-pdf.html', icon: 'bi-file-earmark-plus-fill', desc: 'Insert image pages into an existing PDF or stamp images onto existing PDF pages' }
  ]
};

export function initPdfJsWorker() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_CONFIG.CDN.PDFJS_WORKER;
  }
}