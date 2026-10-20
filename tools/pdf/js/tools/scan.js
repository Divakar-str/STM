import { initToolPage } from '../pdf-app.js';
import { PDF_CONFIG } from '../pdf-config.js';
import { inspectImageFile, formatBytes, sanitizeFilename } from '../pdf-files.js';
import { verifyGeneratedPdfBytes } from '../pdf-validation.js';
import { downloadPdfBytes } from '../pdf-download.js';
import { processImageFilterOffThread } from '../pdf-worker.js';
import { normalizeError, PdfStudioError, ERROR_CODES } from '../pdf-errors.js';
import {
  bindDropzone,
  showToast,
  showErrorBanner,
  clearErrorBanner,
  updateProgressPanel,
  renderResultPanel,
  openCropModal
} from '../pdf-ui.js';

initToolPage('scan');

let pages = [];
let activeStream = null;
let lastPdfBytes = null;

const dropzone = document.getElementById('scanDropzone');
const fileInput = document.getElementById('scanFileInput');
const cameraVideo = document.getElementById('cameraVideo');
const cameraPanel = document.getElementById('cameraCapturePanel');
const workspace = document.getElementById('scanWorkspace');
const scanGrid = document.getElementById('scanPagesGrid');
const errorPanel = document.getElementById('errorPanel');
const progressPanel = document.getElementById('progressPanel');
const resultPanel = document.getElementById('resultPanel');

bindDropzone(dropzone, fileInput, handleImportedImages);

document.getElementById('startCameraBtn').addEventListener('click', async () => {
  clearErrorBanner(errorPanel);
  if (!navigator.mediaDevices?.getUserMedia) {
    showErrorBanner(errorPanel, new PdfStudioError(
      ERROR_CODES.CAMERA_DENIED,
      'Camera capture is not supported in this browser context.',
      null,
      'Use HTTPS/localhost or import scanned images from your device.'
    ));
    return;
  }
  try {
    activeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    cameraVideo.srcObject = activeStream;
    cameraPanel.classList.remove('d-none');
  } catch (err) {
    showErrorBanner(errorPanel, new PdfStudioError(
      ERROR_CODES.CAMERA_DENIED,
      `Camera access denied: ${err.message}`,
      null,
      'Allow camera permissions or import images from your device.'
    ));
  }
});

document.getElementById('stopCameraBtn').addEventListener('click', stopCamera);

function stopCamera() {
  if (activeStream) {
    activeStream.getTracks().forEach(t => t.stop());
    activeStream = null;
  }
  cameraPanel.classList.add('d-none');
}

document.getElementById('captureFrameBtn').addEventListener('click', async () => {
  if (!activeStream) return;
  const canvas = document.createElement('canvas');
  canvas.width = cameraVideo.videoWidth || 1280;
  canvas.height = cameraVideo.videoHeight || 720;
  canvas.getContext('2d').drawImage(cameraVideo, 0, 0);
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92));
  const file = new File([blob], `scan-${pages.length + 1}.jpg`, { type: 'image/jpeg' });
  await handleImportedImages([file]);
  showToast('Captured page added.', 'success');
});

async function handleImportedImages(files) {
  clearErrorBanner(errorPanel);
  for (const file of files) {
    try {
      const inspected = await inspectImageFile(file);
      pages.push({
        ...inspected,
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        processedDataUrl: inspected.objectUrl,
        processedBytes: file.size,
        renderWidth: inspected.width,
        renderHeight: inspected.height
      });
    } catch (err) {
      showErrorBanner(errorPanel, normalizeError(err, file.name));
      return;
    }
  }
  if (pages.length > 0) {
    workspace.classList.remove('d-none');
    await applyEnhancementsToAllPages();
  }
}

['scanBrightness', 'scanContrast', 'scanColorMode', 'scanQuality'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', applyEnhancementsToAllPages);
  document.getElementById(id)?.addEventListener('change', applyEnhancementsToAllPages);
});

async function applyEnhancementsToAllPages() {
  const brightness = parseInt(document.getElementById('scanBrightness').value, 10) || 0;
  const contrast = parseInt(document.getElementById('scanContrast').value, 10) || 0;
  const colorMode = document.getElementById('scanColorMode').value;
  const quality = parseFloat(document.getElementById('scanQuality').value) || 0.8;

  for (const page of pages) {
    const img = await loadImageElement(page.objectUrl);
    const c = page.crop || { top: 0, right: 0, bottom: 0, left: 0 };
    const cropX = Math.floor((img.naturalWidth * c.left) / 100);
    const cropY = Math.floor((img.naturalHeight * c.top) / 100);
    const srcW = Math.max(20, Math.floor(img.naturalWidth * (1 - (c.left + c.right) / 100)));
    const srcH = Math.max(20, Math.floor(img.naturalHeight * (1 - (c.top + c.bottom) / 100)));

    const canvas = document.createElement('canvas');
    const rot = (page.rotation % 360 + 360) % 360;
    if (rot === 90 || rot === 270) {
      canvas.width = srcH;
      canvas.height = srcW;
    } else {
      canvas.width = srcW;
      canvas.height = srcH;
    }

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(img, cropX, cropY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
    ctx.restore();

    if (brightness !== 0 || contrast !== 0 || colorMode !== 'color') {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const filtered = await processImageFilterOffThread(imgData, { brightness, contrast, colorMode });
      ctx.putImageData(filtered, 0, 0);
    }

    const outBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
    page.processedBlob = outBlob;
    page.processedBytes = outBlob.size;
    page.processedDataUrl = canvas.toDataURL('image/jpeg', quality);
    page.renderWidth = canvas.width;
    page.renderHeight = canvas.height;
  }

  renderScanGrid();
}

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function renderScanGrid() {
  const totalBytes = pages.reduce((sum, p) => sum + (p.processedBytes || 0), 0);
  document.getElementById('scanCountBadge').textContent = `${pages.length} Page${pages.length === 1 ? '' : 's'}`;
  document.getElementById('scanLiveTotalSizeBadge').textContent = `Live Est. PDF Size: ${formatBytes(totalBytes + pages.length * 650)}`;
  scanGrid.innerHTML = '';

  pages.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'ps-thumb-card';
    card.innerHTML = `
      <span class="ps-badge-page">Page ${idx + 1}</span>
      <div class="ps-thumb-canvas-wrap">
        <img src="${p.processedDataUrl}" alt="Scanned page ${idx + 1}">
        <span class="ps-badge-size">${formatBytes(p.processedBytes)} &bull; ${p.renderWidth}×${p.renderHeight}</span>
      </div>
      <div class="btn-group btn-group-sm w-100 mt-1" role="group" aria-label="Actions for scan ${idx + 1}">
        <button type="button" class="btn btn-outline-secondary left-btn" title="Move Earlier" ${idx === 0 ? 'disabled' : ''}><i class="bi bi-arrow-left"></i></button>
        <button type="button" class="btn btn-outline-secondary rot-btn" title="Rotate 90°"><i class="bi bi-arrow-clockwise"></i></button>
        <button type="button" class="btn btn-outline-secondary crop-btn" title="Crop Page"><i class="bi bi-crop"></i></button>
        <button type="button" class="btn btn-outline-danger del-btn" title="Delete Page"><i class="bi bi-trash"></i></button>
        <button type="button" class="btn btn-outline-secondary right-btn" title="Move Later" ${idx === pages.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-right"></i></button>
      </div>
    `;

    card.querySelector('.left-btn').addEventListener('click', () => {
      const [m] = pages.splice(idx, 1);
      pages.splice(idx - 1, 0, m);
      renderScanGrid();
    });
    card.querySelector('.right-btn').addEventListener('click', () => {
      const [m] = pages.splice(idx, 1);
      pages.splice(idx + 1, 0, m);
      renderScanGrid();
    });
    card.querySelector('.rot-btn').addEventListener('click', async () => {
      p.rotation = (p.rotation + 90) % 360;
      await applyEnhancementsToAllPages();
    });
    card.querySelector('.crop-btn').addEventListener('click', async () => {
      const newCrop = await openCropModal({
        imageSrc: p.objectUrl,
        initialCrop: p.crop,
        title: `Crop Scanned Page #${idx + 1}`
      });
      if (newCrop) {
        p.crop = newCrop;
        await applyEnhancementsToAllPages();
        showToast(`Cropped Page #${idx + 1}.`, 'success');
      }
    });
    card.querySelector('.del-btn').addEventListener('click', () => {
      pages.splice(idx, 1);
      renderScanGrid();
    });

    scanGrid.appendChild(card);
  });
}

document.getElementById('generateScanPdfBtn').addEventListener('click', generateScannedPdf);

async function generateScannedPdf() {
  if (pages.length === 0) return;
  clearErrorBanner(errorPanel);

  try {
    updateProgressPanel(progressPanel, { state: 'Processing', percent: 35, label: 'Building scanned PDF...' });
    const pdfDoc = await window.PDFLib.PDFDocument.create();
    const sizeKey = document.getElementById('scanPageSize').value;
    const orientation = document.getElementById('scanOrientation').value;
    const margin = parseInt(document.getElementById('scanPageMargin').value, 10) || 18;

    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const jpgBytes = await p.processedBlob.arrayBuffer();
      const embedded = await pdfDoc.embedJpg(jpgBytes);

      let pageW = p.renderWidth;
      let pageH = p.renderHeight;
      if (sizeKey !== 'Original') {
        const [w, h] = PDF_CONFIG.PAGE_SIZES[sizeKey];
        pageW = orientation === 'landscape' ? h : w;
        pageH = orientation === 'landscape' ? w : h;
      }

      const page = pdfDoc.addPage([pageW, pageH]);
      const availW = Math.max(20, pageW - margin * 2);
      const availH = Math.max(20, pageH - margin * 2);
      const scale = Math.min(availW / embedded.width, availH / embedded.height);
      const drawW = embedded.width * scale;
      const drawH = embedded.height * scale;

      page.drawImage(embedded, {
        x: (pageW - drawW) / 2,
        y: (pageH - drawH) / 2,
        width: drawW,
        height: drawH
      });
    }

    updateProgressPanel(progressPanel, { state: 'Verifying output', percent: 90, label: 'Validating PDF...' });
    const bytes = await pdfDoc.save();
    const verified = await verifyGeneratedPdfBytes(bytes);
    lastPdfBytes = bytes;
    stopCamera();

    const outName = sanitizeFilename(document.getElementById('scanOutputFilename').value || 'scanned-document');
    const dl = downloadPdfBytes(bytes, outName);
    updateProgressPanel(progressPanel, { state: 'Ready' });

    renderResultPanel(resultPanel, {
      title: 'Scanned PDF Created',
      filename: dl.filename,
      size: verified.byteLength,
      pageCount: verified.pageCount,
      onDownload: () => downloadPdfBytes(lastPdfBytes, outName),
      onReset: () => {
        pages = [];
        workspace.classList.add('d-none');
        resultPanel.classList.add('d-none');
      }
    });
  } catch (err) {
    updateProgressPanel(progressPanel, { state: 'Ready' });
    showErrorBanner(errorPanel, normalizeError(err), generateScannedPdf);
  }
}