import { initToolPage } from '../pdf-app.js';
import { PDF_CONFIG } from '../pdf-config.js';
import { inspectImageFile, inspectPdfFile, renderPageThumbnail, formatBytes, sanitizeFilename } from '../pdf-files.js';
import { verifyGeneratedPdfBytes } from '../pdf-validation.js';
import { downloadPdfBytes } from '../pdf-download.js';
import { normalizeError } from '../pdf-errors.js';
import {
  bindDropzone,
  showToast,
  showErrorBanner,
  clearErrorBanner,
  updateProgressPanel,
  renderResultPanel,
  escapeHtml,
  openCropModal,
  copyCanvasOrDataUrlToClipboard
} from '../pdf-ui.js';

initToolPage('image-to-pdf');

let basePdfInfo = null;
let imagesQueue = [];
let sortableInstance = null;
let lastGeneratedBytes = null;

// DOM Elements
const basePdfDropzone = document.getElementById('basePdfDropzone');
const basePdfInput = document.getElementById('basePdfInput');
const pdfLoadedSection = document.getElementById('pdfLoadedSection');
const basePdfThumbsStrip = document.getElementById('basePdfThumbsStrip');
const changeBasePdfBtn = document.getElementById('changeBasePdfBtn');

const imgDropzone = document.getElementById('imgToPdfDropzone');
const imgFileInput = document.getElementById('imgToPdfFileInput');
const workspace = document.getElementById('imgToPdfWorkspace');
const thumbGrid = document.getElementById('imgToPdfGrid');

const addModeSelect = document.getElementById('addModeSelect');
const targetPageNumberWrap = document.getElementById('targetPageNumberWrap');
const targetPageNumber = document.getElementById('targetPageNumber');
const targetPageLabel = document.getElementById('targetPageLabel');

const pageSizeWrap = document.getElementById('pageSizeWrap');
const orientationWrap = document.getElementById('orientationWrap');
const marginWrap = document.getElementById('marginWrap');
const fitModeWrap = document.getElementById('fitModeWrap');
const perPageWrap = document.getElementById('perPageWrap');
const overlayAnchorWrap = document.getElementById('overlayAnchorWrap');
const overlayScaleWrap = document.getElementById('overlayScaleWrap');

const fitModeSelect = document.getElementById('imgFitMode');
const fillCropWarning = document.getElementById('fillCropWarning');
const qualitySelect = document.getElementById('imgCompressionQuality');

const errorPanel = document.getElementById('errorPanel');
const progressPanel = document.getElementById('progressPanel');
const resultPanel = document.getElementById('resultPanel');

// Step 1: Bind Existing PDF Dropzone
bindDropzone(basePdfDropzone, basePdfInput, files => loadBasePdf(files[0]));

// Step 2: Bind Images Dropzone
bindDropzone(imgDropzone, imgFileInput, handleIncomingImages);

changeBasePdfBtn.addEventListener('click', () => basePdfInput.click());
document.getElementById('addMoreImagesBtn').addEventListener('click', () => imgFileInput.click());

document.getElementById('clearImagesBtn').addEventListener('click', () => {
  imagesQueue = [];
  workspace.classList.add('d-none');
  updateSummaryBadges();
});

fitModeSelect.addEventListener('change', () => {
  fillCropWarning.classList.toggle('d-none', fitModeSelect.value !== 'fill');
});

qualitySelect.addEventListener('change', async () => {
  if (imagesQueue.length > 0) await refreshImagePreviews();
});

addModeSelect.addEventListener('change', syncModeSettingsUI);

function syncModeSettingsUI() {
  const mode = addModeSelect.value;
  const isOverlay = mode === 'overlay-page';
  const needsTargetPage = mode === 'insert-after' || isOverlay;

  targetPageNumberWrap.classList.toggle('d-none', !needsTargetPage);
  targetPageLabel.textContent = isOverlay ? 'Stamp Onto Page #' : 'Insert After Page #';

  pageSizeWrap.classList.toggle('d-none', isOverlay);
  orientationWrap.classList.toggle('d-none', isOverlay);
  marginWrap.classList.toggle('d-none', isOverlay);
  fitModeWrap.classList.toggle('d-none', isOverlay);
  perPageWrap.classList.toggle('d-none', isOverlay);

  overlayAnchorWrap.classList.toggle('d-none', !isOverlay);
  overlayScaleWrap.classList.toggle('d-none', !isOverlay);
}

async function loadBasePdf(file) {
  if (!file) return;
  clearErrorBanner(errorPanel);
  resultPanel.classList.add('d-none');

  try {
    updateProgressPanel(progressPanel, { state: 'Loading', percent: 30, label: `Loading existing PDF "${file.name}"...` });
    basePdfInfo = await inspectPdfFile(file);

    document.getElementById('basePdfStatusText').textContent =
      `${basePdfInfo.name} (${basePdfInfo.pageCount} Page${basePdfInfo.pageCount === 1 ? '' : 's'} • ${formatBytes(basePdfInfo.size)})`;
    document.getElementById('basePdfPageBadge').textContent = `Base PDF: ${basePdfInfo.pageCount} Pages`;
    document.getElementById('imgToPdfFilename').value = `${sanitizeFilename(basePdfInfo.name)}-with-images`;

    targetPageNumber.max = basePdfInfo.pageCount;
    targetPageNumber.value = basePdfInfo.pageCount;

    basePdfDropzone.classList.add('d-none');
    pdfLoadedSection.classList.remove('d-none');

    await renderBasePdfThumbStrip();
    updateSummaryBadges();
    updateProgressPanel(progressPanel, { state: 'Ready' });
  } catch (err) {
    updateProgressPanel(progressPanel, { state: 'Ready' });
    showErrorBanner(errorPanel, normalizeError(err, file.name));
  }
}

async function renderBasePdfThumbStrip() {
  basePdfThumbsStrip.innerHTML = '';
  const maxPreview = Math.min(basePdfInfo.pageCount, 30);

  for (let p = 1; p <= maxPreview; p++) {
    const canvas = await renderPageThumbnail(basePdfInfo.pdfDoc, p, 110, 0);
    const item = document.createElement('div');
    item.className = 'border rounded p-1 bg-body text-center flex-shrink-0';
    item.style.width = '90px';
    item.style.cursor = 'pointer';
    item.setAttribute('role', 'listitem');
    item.title = `Click to target Page ${p}`;
    item.innerHTML = `
      <div class="small fw-bold mb-1" style="font-size:0.72rem;">Page ${p}</div>
      <div class="thumb-holder d-flex justify-content-center"></div>
    `;
    canvas.style.maxHeight = '95px';
    canvas.style.width = 'auto';
    item.querySelector('.thumb-holder').appendChild(canvas);

    item.addEventListener('click', () => {
      targetPageNumber.value = p;
      if (addModeSelect.value === 'insert-end' || addModeSelect.value === 'insert-start') {
        addModeSelect.value = 'insert-after';
        syncModeSettingsUI();
      }
      Array.from(basePdfThumbsStrip.children).forEach(el => el.classList.remove('border-primary', 'border-2'));
      item.classList.add('border-primary', 'border-2');
      showToast(`Selected Page #${p} as target.`, 'info');
    });

    basePdfThumbsStrip.appendChild(item);
  }
}

async function handleIncomingImages(files) {
  if (!basePdfInfo) {
    showToast('Please select your existing PDF file in Step 1 first.', 'warning');
    return;
  }
  clearErrorBanner(errorPanel);
  resultPanel.classList.add('d-none');

  for (const file of files) {
    try {
      const inspected = await inspectImageFile(file);
      inspected.crop = { top: 0, right: 0, bottom: 0, left: 0 };
      inspected.displayUrl = inspected.objectUrl;
      inspected.estimatedBytes = inspected.size;
      imagesQueue.push(inspected);
    } catch (err) {
      showErrorBanner(errorPanel, normalizeError(err, file.name));
      return;
    }
  }

  if (imagesQueue.length > 0) {
    workspace.classList.remove('d-none');
    await refreshImagePreviews();
  }
}

async function refreshImagePreviews() {
  for (const img of imagesQueue) {
    const norm = await normalizeImageToJpegBytes(img);
    img.displayUrl = norm.dataUrl;
    img.estimatedBytes = norm.bytes.byteLength;
    img.renderW = norm.width;
    img.renderH = norm.height;
  }
  renderImageQueue();
}

function updateSummaryBadges() {
  const imgBytes = imagesQueue.reduce((s, i) => s + (i.estimatedBytes || i.size), 0);
  const totalEst = (basePdfInfo ? basePdfInfo.size : 0) + imgBytes;
  document.getElementById('imgToPdfSummary').textContent =
    `${imagesQueue.length} Image(s) • Est. Output PDF: ${formatBytes(totalEst)}`;
}

function renderImageQueue() {
  updateSummaryBadges();
  thumbGrid.innerHTML = '';

  imagesQueue.forEach((img, idx) => {
    const card = document.createElement('div');
    card.className = 'ps-thumb-card';
    card.dataset.id = img.id;
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      <span class="ps-badge-page">Img #${idx + 1}</span>
      <div class="ps-thumb-canvas-wrap">
        <img src="${img.displayUrl}" alt="${escapeHtml(img.name)}">
        <span class="ps-badge-size">${formatBytes(img.estimatedBytes)} &bull; ${img.renderW}×${img.renderH}</span>
      </div>
      <div class="small text-truncate w-100 text-center fw-semibold mb-1">${escapeHtml(img.name)}</div>
      <div class="btn-group btn-group-sm w-100" role="group" aria-label="Controls for ${escapeHtml(img.name)}">
        <button type="button" class="btn btn-outline-secondary prev-btn" title="Move Earlier" ${idx === 0 ? 'disabled' : ''}><i class="bi bi-arrow-left"></i></button>
        <button type="button" class="btn btn-outline-secondary rot-btn" title="Rotate 90°"><i class="bi bi-arrow-clockwise"></i></button>
        <button type="button" class="btn btn-outline-secondary crop-btn" title="Crop Image"><i class="bi bi-crop"></i></button>
        <button type="button" class="btn btn-outline-secondary copy-btn" title="Copy Image to Clipboard"><i class="bi bi-clipboard"></i></button>
        <button type="button" class="btn btn-outline-danger del-btn" title="Remove Image"><i class="bi bi-trash"></i></button>
        <button type="button" class="btn btn-outline-secondary next-btn" title="Move Later" ${idx === imagesQueue.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-right"></i></button>
      </div>
    `;

    card.querySelector('.prev-btn').addEventListener('click', () => moveImg(idx, idx - 1));
    card.querySelector('.next-btn').addEventListener('click', () => moveImg(idx, idx + 1));
    card.querySelector('.rot-btn').addEventListener('click', async () => {
      img.rotation = (img.rotation + 90) % 360;
      await refreshImagePreviews();
    });
    card.querySelector('.crop-btn').addEventListener('click', async () => {
      const c = await openCropModal({
        imageSrc: img.objectUrl,
        initialCrop: img.crop,
        title: `Crop ${img.name}`
      });
      if (c) {
        img.crop = c;
        await refreshImagePreviews();
        showToast(`Cropped "${img.name}".`, 'success');
      }
    });
    card.querySelector('.copy-btn').addEventListener('click', async () => {
      try {
        await copyCanvasOrDataUrlToClipboard(img.displayUrl);
        showToast(`Copied "${img.name}" to clipboard!`, 'success');
      } catch (e) {
        showToast(e.message, 'danger');
      }
    });
    card.querySelector('.del-btn').addEventListener('click', () => {
      imagesQueue.splice(idx, 1);
      if (imagesQueue.length === 0) workspace.classList.add('d-none');
      renderImageQueue();
    });

    thumbGrid.appendChild(card);
  });

  if (sortableInstance) sortableInstance.destroy();
  sortableInstance = new window.Sortable(thumbGrid, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: evt => {
      if (evt.oldIndex !== evt.newIndex) moveImg(evt.oldIndex, evt.newIndex);
    }
  });
}

function moveImg(from, to) {
  const [m] = imagesQueue.splice(from, 1);
  imagesQueue.splice(to, 0, m);
  renderImageQueue();
}

async function normalizeImageToJpegBytes(imgItem) {
  const imageEl = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = imgItem.objectUrl;
  });

  const c = imgItem.crop || { top: 0, right: 0, bottom: 0, left: 0 };
  const sx = Math.floor((imageEl.naturalWidth * c.left) / 100);
  const sy = Math.floor((imageEl.naturalHeight * c.top) / 100);
  const sw = Math.max(20, Math.floor(imageEl.naturalWidth * (1 - (c.left + c.right) / 100)));
  const sh = Math.max(20, Math.floor(imageEl.naturalHeight * (1 - (c.top + c.bottom) / 100)));

  const rot = (imgItem.rotation % 360 + 360) % 360;
  const canvas = document.createElement('canvas');
  if (rot === 90 || rot === 270) {
    canvas.width = sh;
    canvas.height = sw;
  } else {
    canvas.width = sw;
    canvas.height = sh;
  }

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(imageEl, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();

  const quality = parseFloat(qualitySelect.value) || 0.92;
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
  return {
    bytes: await blob.arrayBuffer(),
    dataUrl,
    width: canvas.width,
    height: canvas.height
  };
}

document.getElementById('convertImgToPdfBtn').addEventListener('click', addImagesToExistingPdf);

async function addImagesToExistingPdf() {
  if (!basePdfInfo) {
    showToast('Please upload an existing PDF file first.', 'warning');
    return;
  }
  if (imagesQueue.length === 0) {
    showToast('Please select at least one image to add to the PDF.', 'warning');
    return;
  }
  clearErrorBanner(errorPanel);

  try {
    updateProgressPanel(progressPanel, { state: 'Processing', percent: 25, label: 'Loading existing PDF document...' });
    const finalDoc = await window.PDFLib.PDFDocument.load(basePdfInfo.arrayBuffer);
    const mode = addModeSelect.value;

    // Reference dimensions from the existing PDF's first page
    const firstExistingPage = finalDoc.getPage(0);
    const baseSize = firstExistingPage.getSize();

    if (mode === 'overlay-page') {
      const targetIdx = Math.max(0, Math.min(finalDoc.getPageCount() - 1, (parseInt(targetPageNumber.value, 10) || 1) - 1));
      const targetPage = finalDoc.getPage(targetIdx);
      const { width: pageW, height: pageH } = targetPage.getSize();
      const anchor = document.getElementById('overlayAnchor').value;
      const scalePct = Math.max(5, Math.min(100, parseInt(document.getElementById('overlayScalePct').value, 10) || 40));
      const pad = 24;

      for (let i = 0; i < imagesQueue.length; i++) {
        updateProgressPanel(progressPanel, {
          state: 'Processing',
          percent: Math.round(((i + 1) / imagesQueue.length) * 85),
          label: `Stamping image ${i + 1} onto Page #${targetIdx + 1}...`
        });

        const norm = await normalizeImageToJpegBytes(imagesQueue[i]);
        const embedded = await finalDoc.embedJpg(norm.bytes);
        const drawW = (pageW * scalePct) / 100;
        const drawH = (embedded.height / embedded.width) * drawW;

        let x = (pageW - drawW) / 2;
        let y = (pageH - drawH) / 2;
        if (anchor === 'bottom-right') { x = pageW - drawW - pad; y = pad; }
        else if (anchor === 'bottom-left') { x = pad; y = pad; }
        else if (anchor === 'top-right') { x = pageW - drawW - pad; y = pageH - drawH - pad; }
        else if (anchor === 'top-left') { x = pad; y = pageH - drawH - pad; }

        targetPage.drawImage(embedded, { x, y, width: drawW, height: drawH });
      }
    } else {
      // Build new PDF pages from imagesQueue and insert them into finalDoc
      const tempImgDoc = await window.PDFLib.PDFDocument.create();
      const pageSizeKey = document.getElementById('imgPageSize').value;
      const orientation = document.getElementById('imgOrientation').value;
      const margin = parseInt(document.getElementById('imgMargin').value, 10) || 0;
      const fitMode = fitModeSelect.value;
      const perPage = parseInt(document.getElementById('imgPerPage').value, 10) || 1;

      for (let i = 0; i < imagesQueue.length; i += perPage) {
        const batch = imagesQueue.slice(i, i + perPage);
        updateProgressPanel(progressPanel, {
          state: 'Processing',
          percent: Math.round(((i + 1) / imagesQueue.length) * 80),
          label: `Creating image page (${i + 1} of ${imagesQueue.length})...`
        });

        const firstNorm = await normalizeImageToJpegBytes(batch[0]);
        let pageW = baseSize.width;
        let pageH = baseSize.height;

        if (pageSizeKey === 'Original') {
          pageW = firstNorm.width;
          pageH = firstNorm.height;
        } else if (pageSizeKey !== 'MatchBase') {
          const [w, h] = PDF_CONFIG.PAGE_SIZES[pageSizeKey];
          pageW = w;
          pageH = h;
        }

        if (orientation === 'landscape' && pageW < pageH) {
          [pageW, pageH] = [pageH, pageW];
        } else if (orientation === 'portrait' && pageW > pageH) {
          [pageW, pageH] = [pageH, pageW];
        }

        const page = tempImgDoc.addPage([pageW, pageH]);
        const cols = perPage === 4 ? 2 : 1;
        const rows = perPage === 1 ? 1 : 2;
        const cellW = (pageW - margin * (cols + 1)) / cols;
        const cellH = (pageH - margin * (rows + 1)) / rows;

        for (let b = 0; b < batch.length; b++) {
          const norm = b === 0 ? firstNorm : await normalizeImageToJpegBytes(batch[b]);
          const embedded = await tempImgDoc.embedJpg(norm.bytes);

          const col = b % cols;
          const row = Math.floor(b / cols);
          const cellX = margin + col * (cellW + margin);
          const cellY = pageH - margin - (row + 1) * cellH - row * margin;

          let drawW = cellW;
          let drawH = cellH;

          if (fitMode === 'contain' || fitMode === 'fit') {
            const scale = Math.min(cellW / embedded.width, cellH / embedded.height);
            drawW = embedded.width * scale;
            drawH = embedded.height * scale;
          } else if (fitMode === 'fill') {
            const scale = Math.max(cellW / embedded.width, cellH / embedded.height);
            drawW = embedded.width * scale;
            drawH = embedded.height * scale;
          }

          page.drawImage(embedded, {
            x: cellX + (cellW - drawW) / 2,
            y: cellY + (cellH - drawH) / 2,
            width: drawW,
            height: drawH
          });
        }
      }

      const copiedImgPages = await finalDoc.copyPages(tempImgDoc, tempImgDoc.getPageIndices());
      if (mode === 'insert-start') {
        copiedImgPages.forEach((p, idx) => finalDoc.insertPage(idx, p));
      } else if (mode === 'insert-after') {
        const afterPage = Math.max(0, Math.min(finalDoc.getPageCount(), parseInt(targetPageNumber.value, 10) || finalDoc.getPageCount()));
        copiedImgPages.forEach((p, idx) => finalDoc.insertPage(afterPage + idx, p));
      } else {
        copiedImgPages.forEach(p => finalDoc.addPage(p));
      }
    }

    updateProgressPanel(progressPanel, { state: 'Verifying output', percent: 94, label: 'Validating updated PDF...' });
    const bytes = await finalDoc.save();
    const verified = await verifyGeneratedPdfBytes(bytes);
    lastGeneratedBytes = bytes;

    const outName = sanitizeFilename(document.getElementById('imgToPdfFilename').value || 'updated-document');
    const dl = downloadPdfBytes(bytes, outName);
    updateProgressPanel(progressPanel, { state: 'Ready' });

    renderResultPanel(resultPanel, {
      title: 'Images Added to PDF Successfully',
      filename: dl.filename,
      size: verified.byteLength,
      pageCount: verified.pageCount,
      onDownload: () => downloadPdfBytes(lastGeneratedBytes, outName),
      onReset: () => {
        imagesQueue = [];
        workspace.classList.add('d-none');
        resultPanel.classList.add('d-none');
        updateSummaryBadges();
      }
    });
  } catch (err) {
    updateProgressPanel(progressPanel, { state: 'Ready' });
    showErrorBanner(errorPanel, normalizeError(err, basePdfInfo?.name), addImagesToExistingPdf);
  }
}