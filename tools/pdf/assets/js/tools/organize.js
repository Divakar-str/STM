import { initToolPage } from '../pdf-app.js';
import { inspectPdfFile, renderPageThumbnail, formatBytes, sanitizeFilename } from '../pdf-files.js';
import { StateHistory } from '../pdf-history.js';
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
  confirmAction,
  copyCanvasOrDataUrlToClipboard,
  openCropModal
} from '../pdf-ui.js';

initToolPage('organize');

let loadedPdf = null;
let history = null;
let selectedIds = new Set();
let thumbCache = new Map();
let lastGeneratedBytes = null;
let zoomSize = 195;
let sortableInstance = null;

const dropzone = document.getElementById('organizeDropzone');
const fileInput = document.getElementById('organizeFileInput');
const workspace = document.getElementById('organizeWorkspace');
const thumbGrid = document.getElementById('organizeThumbGrid');
const errorPanel = document.getElementById('errorPanel');
const progressPanel = document.getElementById('progressPanel');
const resultPanel = document.getElementById('resultPanel');

bindDropzone(dropzone, fileInput, files => loadFile(files[0]));

async function loadFile(file) {
  if (!file) return;
  clearErrorBanner(errorPanel);
  resultPanel.classList.add('d-none');

  try {
    updateProgressPanel(progressPanel, { state: 'Loading', percent: 25, label: `Loading ${file.name}...` });
    loadedPdf = await inspectPdfFile(file);
    thumbCache.clear();
    selectedIds.clear();

    const initialPages = Array.from({ length: loadedPdf.pageCount }, (_, idx) => ({
      uid: `p-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourcePage: idx + 1,
      rotation: 0,
      crop: { top: 0, right: 0, bottom: 0, left: 0 }
    }));

    history = new StateHistory(initialPages, renderGridFromState);
    document.getElementById('fileSummaryText').textContent = `${loadedPdf.name} (${formatBytes(loadedPdf.size)})`;
    document.getElementById('outputFilename').value = `${sanitizeFilename(loadedPdf.name)}-organized`;

    dropzone.classList.add('d-none');
    workspace.classList.remove('d-none');
    await renderGridFromState(history.getState(), { canUndo: false, canRedo: false });
    updateProgressPanel(progressPanel, { state: 'Ready' });
  } catch (err) {
    updateProgressPanel(progressPanel, { state: 'Ready' });
    showErrorBanner(errorPanel, normalizeError(err, file?.name), () => fileInput.click());
  }
}

function getCroppedPreviewDataUrl(baseDataUrl, crop) {
  return new Promise(resolve => {
    if (!crop || (!crop.top && !crop.right && !crop.bottom && !crop.left)) {
      resolve(baseDataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const sx = Math.floor((img.naturalWidth * crop.left) / 100);
      const sy = Math.floor((img.naturalHeight * crop.top) / 100);
      const sw = Math.max(10, Math.floor(img.naturalWidth * (1 - (crop.left + crop.right) / 100)));
      const sh = Math.max(10, Math.floor(img.naturalHeight * (1 - (crop.top + crop.bottom) / 100)));
      const c = document.createElement('canvas');
      c.width = sw;
      c.height = sh;
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(c.toDataURL('image/png'));
    };
    img.src = baseDataUrl;
  });
}

async function renderGridFromState(pages, meta = {}) {
  document.getElementById('totalPagesBadge').textContent = `${pages.length} Page${pages.length === 1 ? '' : 's'}`;
  document.getElementById('undoBtn').disabled = !meta.canUndo;
  document.getElementById('redoBtn').disabled = !meta.canRedo;
  thumbGrid.style.setProperty('--thumb-size', `${zoomSize}px`);
  thumbGrid.innerHTML = '';

  for (let idx = 0; idx < pages.length; idx++) {
    const item = pages[idx];
    const isSelected = selectedIds.has(item.uid);
    const hasCrop = item.crop && (item.crop.top || item.crop.right || item.crop.bottom || item.crop.left);

    const card = document.createElement('div');
    card.className = `ps-thumb-card ${isSelected ? 'selected' : ''}`;
    card.dataset.uid = item.uid;
    card.setAttribute('role', 'listitem');

    card.innerHTML = `
      <span class="ps-badge-page">#${idx + 1} ${hasCrop ? '<i class="bi bi-crop ms-1 text-info" title="Cropped"></i>' : ''}</span>
      <input type="checkbox" class="form-check-input ps-thumb-select-box"
             aria-label="Select page ${idx + 1}" ${isSelected ? 'checked' : ''}>
      <div class="ps-thumb-canvas-wrap"></div>
      <div class="btn-group btn-group-sm w-100 mt-1" role="group" aria-label="Actions for page ${idx + 1}">
        <button type="button" class="btn btn-outline-secondary move-up-btn" title="Move Earlier" ${idx === 0 ? 'disabled' : ''}>
          <i class="bi bi-arrow-left"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary rot-cw-btn" title="Rotate 90°">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary crop-btn" title="Crop Page">
          <i class="bi bi-crop"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary copy-btn" title="Copy Page Image to Clipboard">
          <i class="bi bi-clipboard"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary move-down-btn" title="Move Later" ${idx === pages.length - 1 ? 'disabled' : ''}>
          <i class="bi bi-arrow-right"></i>
        </button>
      </div>
    `;

    const wrap = card.querySelector('.ps-thumb-canvas-wrap');
    if (!thumbCache.has(item.sourcePage)) {
      const c = await renderPageThumbnail(loadedPdf.pdfDoc, item.sourcePage, 280, 0);
      thumbCache.set(item.sourcePage, c.toDataURL('image/png'));
    }
    const baseDataUrl = thumbCache.get(item.sourcePage);
    const displayUrl = await getCroppedPreviewDataUrl(baseDataUrl, item.crop);

    const img = document.createElement('img');
    img.src = displayUrl;
    img.alt = `Page ${idx + 1}`;
    img.style.transform = `rotate(${item.rotation}deg)`;
    wrap.appendChild(img);

    card.querySelector('.ps-thumb-select-box').addEventListener('change', e => {
      if (e.target.checked) selectedIds.add(item.uid);
      else selectedIds.delete(item.uid);
      card.classList.toggle('selected', e.target.checked);
      updateSelectionButtons();
    });

    card.querySelector('.move-up-btn').addEventListener('click', () => movePage(idx, idx - 1));
    card.querySelector('.move-down-btn').addEventListener('click', () => movePage(idx, idx + 1));
    card.querySelector('.rot-cw-btn').addEventListener('click', () => rotateSingle(item.uid, 90));

    card.querySelector('.crop-btn').addEventListener('click', async () => {
      const newCrop = await openCropModal({
        imageSrc: baseDataUrl,
        initialCrop: item.crop,
        title: `Crop Page #${idx + 1}`
      });
      if (newCrop) {
        const nextPages = history.getState().map(p => p.uid === item.uid ? { ...p, crop: newCrop } : p);
        history.pushState(nextPages, 'Crop page');
        showToast(`Applied crop to Page #${idx + 1}.`, 'success');
      }
    });

    card.querySelector('.copy-btn').addEventListener('click', async () => {
      await copyPageToClipboard(item, idx + 1);
    });

    thumbGrid.appendChild(card);
  }

  if (sortableInstance) sortableInstance.destroy();
  sortableInstance = new window.Sortable(thumbGrid, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: evt => {
      if (evt.oldIndex !== evt.newIndex) movePage(evt.oldIndex, evt.newIndex);
    }
  });

  updateSelectionButtons();
}

async function copyPageToClipboard(item, pageNumberLabel) {
  try {
    const hiResCanvas = await renderPageThumbnail(loadedPdf.pdfDoc, item.sourcePage, 900, item.rotation);
    const crop = item.crop || { top: 0, right: 0, bottom: 0, left: 0 };
    let targetCanvas = hiResCanvas;

    if (crop.top || crop.right || crop.bottom || crop.left) {
      const sx = Math.floor((hiResCanvas.width * crop.left) / 100);
      const sy = Math.floor((hiResCanvas.height * crop.top) / 100);
      const sw = Math.max(20, Math.floor(hiResCanvas.width * (1 - (crop.left + crop.right) / 100)));
      const sh = Math.max(20, Math.floor(hiResCanvas.height * (1 - (crop.top + crop.bottom) / 100)));
      targetCanvas = document.createElement('canvas');
      targetCanvas.width = sw;
      targetCanvas.height = sh;
      targetCanvas.getContext('2d').drawImage(hiResCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    }

    await copyCanvasOrDataUrlToClipboard(targetCanvas);
    showToast(`Copied Page #${pageNumberLabel} to clipboard!`, 'success');
  } catch (err) {
    showToast(err.message || 'Clipboard copy failed.', 'danger');
  }
}

function updateSelectionButtons() {
  const count = selectedIds.size;
  document.getElementById('selectionCountBadge').textContent = `${count} selected`;
  document.getElementById('deleteSelectedBtn').disabled = count === 0;
  document.getElementById('duplicateSelectedBtn').disabled = count === 0;
  document.getElementById('extractSelectedBtn').disabled = count === 0;
  document.getElementById('copySelectedBtn').disabled = count === 0;
}

function movePage(fromIdx, toIdx) {
  const pages = history.getState();
  if (toIdx < 0 || toIdx >= pages.length) return;
  const [moved] = pages.splice(fromIdx, 1);
  pages.splice(toIdx, 0, moved);
  history.pushState(pages, 'Reorder page');
}

function rotateSingle(uid, delta) {
  const pages = history.getState().map(p => p.uid === uid ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p);
  history.pushState(pages, 'Rotate page');
}

document.getElementById('copySelectedBtn').addEventListener('click', async () => {
  const pages = history.getState();
  const firstSelectedIdx = pages.findIndex(p => selectedIds.has(p.uid));
  if (firstSelectedIdx !== -1) {
    await copyPageToClipboard(pages[firstSelectedIdx], firstSelectedIdx + 1);
  }
});

document.getElementById('selectAllBtn').addEventListener('click', () => {
  history.getState().forEach(p => selectedIds.add(p.uid));
  renderGridFromState(history.getState(), { canUndo: history.canUndo(), canRedo: history.canRedo() });
});

document.getElementById('deselectAllBtn').addEventListener('click', () => {
  selectedIds.clear();
  renderGridFromState(history.getState(), { canUndo: history.canUndo(), canRedo: history.canRedo() });
});

document.getElementById('undoBtn').addEventListener('click', () => history?.undo());
document.getElementById('redoBtn').addEventListener('click', () => history?.redo());

document.getElementById('resetArrangementBtn').addEventListener('click', async () => {
  if (!history?.isDirty()) return;
  const ok = await confirmAction({
    title: 'Reset All Changes',
    message: 'Revert all page order, rotations, crops, and deletions back to the original PDF?',
    confirmText: 'Reset',
    variant: 'warning'
  });
  if (ok && loadedPdf) {
    selectedIds.clear();
    const initialPages = Array.from({ length: loadedPdf.pageCount }, (_, idx) => ({
      uid: `p-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourcePage: idx + 1,
      rotation: 0,
      crop: { top: 0, right: 0, bottom: 0, left: 0 }
    }));
    history.reset(initialPages);
  }
});

document.getElementById('deleteSelectedBtn').addEventListener('click', async () => {
  const pages = history.getState();
  if (selectedIds.size >= pages.length) {
    showToast('Cannot delete all pages.', 'danger');
    return;
  }
  const remaining = pages.filter(p => !selectedIds.has(p.uid));
  selectedIds.clear();
  history.pushState(remaining, 'Delete pages');
});

document.getElementById('duplicateSelectedBtn').addEventListener('click', () => {
  const pages = history.getState();
  const next = [];
  for (const p of pages) {
    next.push(p);
    if (selectedIds.has(p.uid)) {
      next.push({
        uid: `p-${p.sourcePage}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sourcePage: p.sourcePage,
        rotation: p.rotation,
        crop: { ...(p.crop || { top: 0, right: 0, bottom: 0, left: 0 }) }
      });
    }
  }
  history.pushState(next, 'Duplicate selected pages');
});

document.getElementById('zoomInBtn').addEventListener('click', () => {
  zoomSize = Math.min(320, zoomSize + 35);
  thumbGrid.style.setProperty('--thumb-size', `${zoomSize}px`);
});

document.getElementById('zoomOutBtn').addEventListener('click', () => {
  zoomSize = Math.max(130, zoomSize - 35);
  thumbGrid.style.setProperty('--thumb-size', `${zoomSize}px`);
});

document.getElementById('extractSelectedBtn').addEventListener('click', () => {
  const pages = history.getState().filter(p => selectedIds.has(p.uid));
  buildAndDownloadPdf(pages, `${document.getElementById('outputFilename').value || 'extracted'}-selected`);
});

document.getElementById('saveOrganizedBtn').addEventListener('click', () => {
  buildAndDownloadPdf(history.getState(), document.getElementById('outputFilename').value || 'organized');
});

async function buildAndDownloadPdf(pagesSpec, customName) {
  if (!pagesSpec || pagesSpec.length === 0) return;
  clearErrorBanner(errorPanel);
  try {
    updateProgressPanel(progressPanel, { state: 'Processing', percent: 35, label: 'Building PDF...' });
    const srcDoc = await window.PDFLib.PDFDocument.load(loadedPdf.arrayBuffer);
    const outDoc = await window.PDFLib.PDFDocument.create();

    const indices = pagesSpec.map(p => p.sourcePage - 1);
    const copiedPages = await outDoc.copyPages(srcDoc, indices);

    copiedPages.forEach((page, i) => {
      const spec = pagesSpec[i];
      const extraRot = spec.rotation || 0;
      if (extraRot !== 0) {
        const currentAngle = page.getRotation().angle;
        page.setRotation(window.PDFLib.degrees((currentAngle + extraRot) % 360));
      }
      const crop = spec.crop;
      if (crop && (crop.top || crop.right || crop.bottom || crop.left)) {
        const { x, y, width, height } = page.getMediaBox();
        const newX = x + (width * crop.left) / 100;
        const newY = y + (height * crop.bottom) / 100;
        const newW = Math.max(20, width * (1 - (crop.left + crop.right) / 100));
        const newH = Math.max(20, height * (1 - (crop.top + crop.bottom) / 100));
        page.setCropBox(newX, newY, newW, newH);
        page.setMediaBox(newX, newY, newW, newH);
      }
      outDoc.addPage(page);
    });

    updateProgressPanel(progressPanel, { state: 'Verifying output', percent: 85, label: 'Validating PDF...' });
    const pdfBytes = await outDoc.save();
    const verified = await verifyGeneratedPdfBytes(pdfBytes);
    lastGeneratedBytes = pdfBytes;

    const dl = downloadPdfBytes(pdfBytes, customName);
    updateProgressPanel(progressPanel, { state: 'Ready' });

    renderResultPanel(resultPanel, {
      title: 'PDF Saved',
      filename: dl.filename,
      size: verified.byteLength,
      pageCount: verified.pageCount,
      onDownload: () => downloadPdfBytes(lastGeneratedBytes, customName),
      onReset: () => {
        workspace.classList.add('d-none');
        resultPanel.classList.add('d-none');
        dropzone.classList.remove('d-none');
        loadedPdf = null;
        history = null;
      }
    });
  } catch (err) {
    updateProgressPanel(progressPanel, { state: 'Ready' });
    showErrorBanner(errorPanel, normalizeError(err, loadedPdf?.name));
  }
}