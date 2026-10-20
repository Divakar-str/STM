import { initToolPage } from '../pdf-app.js';
import { inspectPdfFile, renderPageThumbnail, formatBytes, sanitizeFilename } from '../pdf-files.js';
import { verifyGeneratedPdfBytes } from '../pdf-validation.js';
import { downloadPdfBytes } from '../pdf-download.js';
import { normalizeError } from '../pdf-errors.js';
import { TaskRunner } from '../pdf-worker.js';
import {
  bindDropzone,
  showToast,
  showErrorBanner,
  clearErrorBanner,
  updateProgressPanel,
  renderResultPanel,
  escapeHtml
} from '../pdf-ui.js';

initToolPage('merge');

let fileQueue = [];
let sortableInstance = null;
let lastMergedBytes = null;
const runner = new TaskRunner();

const dropzone = document.getElementById('mergeDropzone');
const fileInput = document.getElementById('mergeFileInput');
const replaceInput = document.getElementById('mergeReplaceInput');
const workspace = document.getElementById('mergeWorkspace');
const queueList = document.getElementById('mergeQueueList');
const errorPanel = document.getElementById('errorPanel');
const progressPanel = document.getElementById('progressPanel');
const resultPanel = document.getElementById('resultPanel');

let replacingIndex = null;

bindDropzone(dropzone, fileInput, handleIncomingFiles);

document.getElementById('addMorePdfsBtn').addEventListener('click', () => fileInput.click());

replaceInput.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file || replacingIndex === null) return;
  try {
    clearErrorBanner(errorPanel);
    const inspected = await inspectPdfFile(file);
    const thumbCanvas = await renderPageThumbnail(inspected.pdfDoc, 1, 90, 0);
    inspected.thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);
    fileQueue[replacingIndex] = inspected;
    replacingIndex = null;
    renderQueue();
    showToast(`Replaced with "${file.name}".`, 'success');
  } catch (err) {
    showErrorBanner(errorPanel, normalizeError(err, file.name));
  }
});

async function handleIncomingFiles(files) {
  clearErrorBanner(errorPanel);
  resultPanel.classList.add('d-none');

  for (const file of files) {
    try {
      if (fileQueue.some(f => f.name === file.name && f.size === file.size)) {
        showToast(`Note: "${file.name}" is already in the merge list (added again).`, 'warning');
      }
      updateProgressPanel(progressPanel, { state: 'Validating', percent: 40, label: `Validating ${file.name}...` });
      const inspected = await inspectPdfFile(file);
      const thumbCanvas = await renderPageThumbnail(inspected.pdfDoc, 1, 90, 0);
      inspected.thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);
      fileQueue.push(inspected);
    } catch (err) {
      updateProgressPanel(progressPanel, { state: 'Ready' });
      showErrorBanner(errorPanel, normalizeError(err, file.name));
      return;
    }
  }

  updateProgressPanel(progressPanel, { state: 'Ready' });
  if (fileQueue.length > 0) {
    workspace.classList.remove('d-none');
    renderQueue();
  }
}

function renderQueue() {
  const totalPages = fileQueue.reduce((sum, f) => sum + f.pageCount, 0);
  const totalSize = fileQueue.reduce((sum, f) => sum + f.size, 0);
  document.getElementById('mergeSummaryBadge').textContent = `${fileQueue.length} File(s) • ${totalPages} Total Pages (${formatBytes(totalSize)})`;
  document.getElementById('mergeActionBtn').disabled = fileQueue.length < 2;

  queueList.innerHTML = '';
  fileQueue.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'ps-file-queue-item';
    row.dataset.id = item.id;
    row.setAttribute('role', 'listitem');
    row.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <span class="badge bg-secondary">${idx + 1}</span>
        <img src="${item.thumbDataUrl}" alt="First page of ${escapeHtml(item.name)}" class="rounded border" style="width:44px;height:58px;object-fit:contain;background:#f8fafc;">
        <div>
          <div class="fw-semibold text-break">${escapeHtml(item.name)}</div>
          <div class="small text-secondary">${formatBytes(item.size)} &bull; ${item.pageCount} page${item.pageCount === 1 ? '' : 's'}</div>
        </div>
      </div>
      <div class="btn-group btn-group-sm" role="group" aria-label="Controls for ${escapeHtml(item.name)}">
        <button type="button" class="btn btn-outline-secondary up-btn" aria-label="Move ${escapeHtml(item.name)} up" ${idx === 0 ? 'disabled' : ''}><i class="bi bi-arrow-up"></i></button>
        <button type="button" class="btn btn-outline-secondary down-btn" aria-label="Move ${escapeHtml(item.name)} down" ${idx === fileQueue.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-down"></i></button>
        <button type="button" class="btn btn-outline-primary replace-btn" aria-label="Replace ${escapeHtml(item.name)}">Replace</button>
        <button type="button" class="btn btn-outline-danger remove-btn" aria-label="Remove ${escapeHtml(item.name)}"><i class="bi bi-trash"></i></button>
      </div>
    `;

    row.querySelector('.up-btn').addEventListener('click', () => moveItem(idx, idx - 1));
    row.querySelector('.down-btn').addEventListener('click', () => moveItem(idx, idx + 1));
    row.querySelector('.replace-btn').addEventListener('click', () => {
      replacingIndex = idx;
      replaceInput.click();
    });
    row.querySelector('.remove-btn').addEventListener('click', () => {
      fileQueue.splice(idx, 1);
      renderQueue();
    });

    queueList.appendChild(row);
  });

  if (sortableInstance) sortableInstance.destroy();
  sortableInstance = new window.Sortable(queueList, {
    animation: 150,
    onEnd: evt => {
      if (evt.oldIndex !== evt.newIndex) moveItem(evt.oldIndex, evt.newIndex);
    }
  });
}

function moveItem(from, to) {
  const [moved] = fileQueue.splice(from, 1);
  fileQueue.splice(to, 0, moved);
  renderQueue();
}

document.getElementById('clearMergeQueueBtn').addEventListener('click', () => {
  fileQueue = [];
  workspace.classList.add('d-none');
  resultPanel.classList.add('d-none');
});

document.getElementById('mergeActionBtn').addEventListener('click', executeMerge);

async function executeMerge() {
  if (fileQueue.length < 2) {
    showToast('Please select at least 2 PDF files to merge.', 'warning');
    return;
  }
  clearErrorBanner(errorPanel);
  const { taskId } = runner.start();

  try {
    const mergedPdf = await window.PDFLib.PDFDocument.create();
    for (let i = 0; i < fileQueue.length; i++) {
      runner.checkActive(taskId);
      const item = fileQueue[i];
      const pct = Math.round(((i + 0.5) / fileQueue.length) * 80);
      updateProgressPanel(progressPanel, {
        state: 'Processing',
        percent: pct,
        label: `Merging "${item.name}" (${i + 1} of ${fileQueue.length})...`,
        onCancel: () => runner.cancel()
      });

      let srcDoc;
      try {
        srcDoc = await window.PDFLib.PDFDocument.load(item.arrayBuffer);
      } catch (loadErr) {
        throw normalizeError(loadErr, item.name);
      }

      const pages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
      pages.forEach(p => mergedPdf.addPage(p));
    }

    runner.checkActive(taskId);
    updateProgressPanel(progressPanel, { state: 'Verifying output', percent: 90, label: 'Validating combined PDF...' });
    const bytes = await mergedPdf.save();
    const verified = await verifyGeneratedPdfBytes(bytes);
    lastMergedBytes = bytes;

    const outName = document.getElementById('mergeOutputFilename').value || 'merged-document';
    const dl = downloadPdfBytes(bytes, outName);
    updateProgressPanel(progressPanel, { state: 'Ready' });

    renderResultPanel(resultPanel, {
      title: 'PDFs Merged Successfully',
      filename: dl.filename,
      size: verified.byteLength,
      pageCount: verified.pageCount,
      onDownload: () => downloadPdfBytes(lastMergedBytes, document.getElementById('mergeOutputFilename').value || 'merged-document'),
      onReset: () => {
        fileQueue = [];
        workspace.classList.add('d-none');
        resultPanel.classList.add('d-none');
      }
    });
  } catch (err) {
    updateProgressPanel(progressPanel, { state: 'Ready' });
    if (err.code === 'CANCELLED') {
      showToast('Merge cancelled. Input files preserved.', 'info');
      return;
    }
    showErrorBanner(errorPanel, normalizeError(err), executeMerge);
  }
}