import { initToolPage } from '../pdf-app.js';
import { inspectPdfFile, formatBytes, sanitizeFilename } from '../pdf-files.js';
import { parseAndValidatePageRanges } from '../pdf-validation.js';
import { downloadBlob, createAndDownloadZip } from '../pdf-download.js';
import { normalizeError } from '../pdf-errors.js';
import { TaskRunner } from '../pdf-worker.js';
import {
  bindDropzone,
  showToast,
  showErrorBanner,
  clearErrorBanner,
  updateProgressPanel,
  renderResultPanel,
  copyCanvasOrDataUrlToClipboard
} from '../pdf-ui.js';

initToolPage('pdf-to-image');

let loadedPdf = null;
let pageBlobsMap = new Map();
let exportedImages = [];
const runner = new TaskRunner();

const dropzone = document.getElementById('pdfToImgDropzone');
const fileInput = document.getElementById('pdfToImgFileInput');
const workspace = document.getElementById('pdfToImgWorkspace');
const thumbGrid = document.getElementById('pdfToImgGrid');
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
    document.getElementById('pdfToImgSummary').textContent = `${loadedPdf.name} • ${loadedPdf.pageCount} Pages (${formatBytes(loadedPdf.size)})`;
    document.getElementById('imgPageRange').value = `1-${loadedPdf.pageCount}`;
    document.getElementById('imgFilenamePattern').value = `${sanitizeFilename(loadedPdf.name)}-page-{page}`;

    dropzone.classList.add('d-none');
    workspace.classList.remove('d-none');

    await renderLivePageCards();
    updateProgressPanel(progressPanel, { state: 'Ready' });
  } catch (err) {
    updateProgressPanel(progressPanel, { state: 'Ready' });
    showErrorBanner(errorPanel, normalizeError(err, file.name));
  }
}

['imgFormatSelect', 'imgDpiSelect', 'imgJpegQuality'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', async () => {
    document.getElementById('jpegQualityWrap').classList.toggle('d-none', document.getElementById('imgFormatSelect').value !== 'jpeg');
    if (loadedPdf) await renderLivePageCards();
  });
});

async function renderSinglePageAtCurrentSettings(pageNum) {
  const format = document.getElementById('imgFormatSelect').value;
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const dpi = parseInt(document.getElementById('imgDpiSelect').value, 10) || 150;
  const quality = (parseInt(document.getElementById('imgJpegQuality').value, 10) || 90) / 100;
  const scale = dpi / 72;

  const page = await loadedPdf.pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d', { alpha: false });
  await page.render({ canvasContext: ctx, viewport }).promise;

  const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, quality));
  const ext = format === 'png' ? 'png' : 'jpg';
  const pattern = document.getElementById('imgFilenamePattern').value || 'page-{page}';
  const filename = `${pattern.replace('{page}', String(pageNum).padStart(3, '0'))}.${ext}`;

  return {
    pageNum,
    blob,
    size: blob.size,
    width: canvas.width,
    height: canvas.height,
    filename,
    previewUrl: URL.createObjectURL(blob)
  };
}

async function renderLivePageCards() {
  thumbGrid.innerHTML = '';
  pageBlobsMap.clear();
  let totalBytes = 0;

  for (let p = 1; p <= loadedPdf.pageCount; p++) {
    const info = await renderSinglePageAtCurrentSettings(p);
    pageBlobsMap.set(p, info);
    totalBytes += info.size;

    const card = document.createElement('div');
    card.className = 'ps-thumb-card';
    card.innerHTML = `
      <span class="ps-badge-page">Page ${p}</span>
      <div class="ps-thumb-canvas-wrap">
        <img src="${info.previewUrl}" alt="Page ${p}">
        <span class="ps-badge-size">${formatBytes(info.size)} &bull; ${info.width}×${info.height}</span>
      </div>
      <div class="d-flex gap-1 w-100 mt-1">
        <button type="button" class="btn btn-sm btn-outline-secondary flex-fill copy-page-btn" title="Copy Image to Clipboard">
          <i class="bi bi-clipboard me-1"></i>Copy
        </button>
        <button type="button" class="btn btn-sm btn-primary flex-fill dl-page-btn" title="Download This Page">
          <i class="bi bi-download me-1"></i>Download
        </button>
      </div>
    `;

    card.querySelector('.copy-page-btn').addEventListener('click', async () => {
      try {
        await copyCanvasOrDataUrlToClipboard(info.blob);
        showToast(`Page ${p} image copied to clipboard!`, 'success');
      } catch (err) {
        showToast(err.message || 'Clipboard copy failed.', 'danger');
      }
    });

    card.querySelector('.dl-page-btn').addEventListener('click', () => {
      const pattern = document.getElementById('imgFilenamePattern').value || 'page-{page}';
      const ext = document.getElementById('imgFormatSelect').value === 'png' ? 'png' : 'jpg';
      const fname = `${pattern.replace('{page}', String(p).padStart(3, '0'))}.${ext}`;
      downloadBlob(info.blob, fname);
      showToast(`Downloaded ${fname} (${formatBytes(info.size)})`, 'success');
    });

    thumbGrid.appendChild(card);
  }

  document.getElementById('pdfToImgTotalSizeBadge').textContent = `Total Live Size: ${formatBytes(totalBytes)}`;
}

document.getElementById('exportImagesBtn').addEventListener('click', executeImageExport);

async function executeImageExport() {
  if (!loadedPdf) return;
  clearErrorBanner(errorPanel);
  const { taskId } = runner.start();

  try {
    const rangeResult = parseAndValidatePageRanges(document.getElementById('imgPageRange').value, loadedPdf.pageCount, false);
    const pagesToRender = rangeResult.flatPages;
    exportedImages = [];

    for (let i = 0; i < pagesToRender.length; i++) {
      runner.checkActive(taskId);
      const pageNum = pagesToRender[i];
      updateProgressPanel(progressPanel, {
        state: 'Processing',
        percent: Math.round(((i + 1) / pagesToRender.length) * 90),
        label: `Preparing Page ${pageNum} (${i + 1}/${pagesToRender.length})...`,
        onCancel: () => runner.cancel()
      });

      const cached = pageBlobsMap.get(pageNum) || await renderSinglePageAtCurrentSettings(pageNum);
      exportedImages.push({
        pageNum,
        filename: cached.filename,
        data: cached.blob,
        width: cached.width,
        height: cached.height,
        size: cached.size
      });
    }

    updateProgressPanel(progressPanel, { state: 'Ready' });

    if (exportedImages.length === 1) {
      const single = exportedImages[0];
      downloadBlob(single.data, single.filename);
      renderResultPanel(resultPanel, {
        title: `Exported Page (${single.width}×${single.height} px)`,
        filename: single.filename,
        size: single.size,
        pageCount: 1,
        onDownload: () => downloadBlob(single.data, single.filename),
        onReset: () => location.reload()
      });
    } else {
      const zipRes = await createAndDownloadZip(exportedImages, `${sanitizeFilename(loadedPdf.name)}-images.zip`);
      renderResultPanel(resultPanel, {
        title: `Exported ${exportedImages.length} Images as ZIP`,
        filename: zipRes.filename,
        size: zipRes.size,
        pageCount: exportedImages.length,
        onDownload: () => createAndDownloadZip(exportedImages, `${sanitizeFilename(loadedPdf.name)}-images.zip`),
        onReset: () => location.reload()
      });
    }
  } catch (err) {
    updateProgressPanel(progressPanel, { state: 'Ready' });
    showErrorBanner(errorPanel, normalizeError(err, loadedPdf?.name), executeImageExport);
  }
}