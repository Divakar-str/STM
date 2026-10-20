import { initToolPage } from '../pdf-app.js';
import { inspectPdfFile, renderPageThumbnail, formatBytes, sanitizeFilename } from '../pdf-files.js';
import { parseAndValidatePageRanges, verifyGeneratedPdfBytes } from '../pdf-validation.js';
import { downloadPdfBytes, createAndDownloadZip } from '../pdf-download.js';
import { normalizeError } from '../pdf-errors.js';
import {
  bindDropzone,
  showErrorBanner,
  clearErrorBanner,
  updateProgressPanel,
  renderResultPanel,
  escapeHtml
} from '../pdf-ui.js';

initToolPage('split');

let loadedPdf = null;
let pageThumbUrls = new Map();
let lastGeneratedOutputs = [];

const dropzone = document.getElementById('splitDropzone');
const fileInput = document.getElementById('splitFileInput');
const workspace = document.getElementById('splitWorkspace');
const splitModeSelect = document.getElementById('splitModeSelect');
const rangeInputWrap = document.getElementById('rangeInputWrap');
const groupSizeWrap = document.getElementById('groupSizeWrap');
const splitRangeInput = document.getElementById('splitRangeInput');
const splitGroupSizeInput = document.getElementById('splitGroupSizeInput');
const allowOverlapCheck = document.getElementById('allowOverlapCheck');
const previewGroupsContainer = document.getElementById('splitGroupsPreview');
const allPagesGrid = document.getElementById('splitAllPagesGrid');
const errorPanel = document.getElementById('errorPanel');
const progressPanel = document.getElementById('progressPanel');
const resultPanel = document.getElementById('resultPanel');

bindDropzone(dropzone, fileInput, files => loadFile(files[0]));

async function loadFile(file) {
  if (!file) return;
  clearErrorBanner(errorPanel);
  resultPanel.classList.add('d-none');

  try {
    updateProgressPanel(progressPanel, { state: 'Loading', percent: 25, label: `Loading ${file.name} and rendering previews...` });
    loadedPdf = await inspectPdfFile(file);
    pageThumbUrls.clear();
    allPagesGrid.innerHTML = '';

    for (let p = 1; p <= loadedPdf.pageCount; p++) {
      const c = await renderPageThumbnail(loadedPdf.pdfDoc, p, 160, 0);
      const dataUrl = c.toDataURL('image/jpeg', 0.8);
      pageThumbUrls.set(p, dataUrl);

      const card = document.createElement('div');
      card.className = 'ps-thumb-card';
      card.style.cursor = 'pointer';
      card.title = `Click to add Page ${p} to range`;
      card.innerHTML = `
        <span class="ps-badge-page">Page ${p}</span>
        <div class="ps-thumb-canvas-wrap">
          <img src="${dataUrl}" alt="Page ${p}">
        </div>
      `;
      card.addEventListener('click', () => {
        if (splitModeSelect.value === 'every' || splitModeSelect.value === 'fixed') {
          splitModeSelect.value = 'ranges';
        }
        const cur = splitRangeInput.value.trim();
        splitRangeInput.value = cur ? `${cur}, ${p}` : `${p}`;
        updateSplitPreview();
      });
      allPagesGrid.appendChild(card);
    }

    document.getElementById('splitFileSummary').textContent = `${loadedPdf.name} • ${loadedPdf.pageCount} Pages (${formatBytes(loadedPdf.size)})`;
    splitRangeInput.value = `1-${Math.min(2, loadedPdf.pageCount)}`;
    workspace.classList.remove('d-none');
    dropzone.classList.add('d-none');
    updateSplitPreview();
    updateProgressPanel(progressPanel, { state: 'Ready' });
  } catch (err) {
    updateProgressPanel(progressPanel, { state: 'Ready' });
    showErrorBanner(errorPanel, normalizeError(err, file.name));
  }
}

[splitModeSelect, splitRangeInput, splitGroupSizeInput, allowOverlapCheck].forEach(el => {
  el.addEventListener('input', updateSplitPreview);
  el.addEventListener('change', updateSplitPreview);
});

function computeSplitGroups() {
  if (!loadedPdf) return [];
  const mode = splitModeSelect.value;
  const max = loadedPdf.pageCount;

  rangeInputWrap.classList.toggle('d-none', mode === 'every' || mode === 'fixed');
  groupSizeWrap.classList.toggle('d-none', mode !== 'fixed');

  if (mode === 'every') {
    return Array.from({ length: max }, (_, i) => ({
      label: `Page ${i + 1}`,
      suffix: `page-${i + 1}`,
      pages: [i + 1]
    }));
  }

  if (mode === 'fixed') {
    const size = parseInt(splitGroupSizeInput.value, 10);
    if (isNaN(size) || size < 1 || size > max) {
      throw new Error(`Fixed group size must be between 1 and ${max}.`);
    }
    const groups = [];
    for (let start = 1; start <= max; start += size) {
      const end = Math.min(max, start + size - 1);
      const pages = [];
      for (let p = start; p <= end; p++) pages.push(p);
      groups.push({
        label: `Pages ${start}-${end}`,
        suffix: `pages-${start}-${end}`,
        pages
      });
    }
    return groups;
  }

  const parsed = parseAndValidatePageRanges(splitRangeInput.value, max, allowOverlapCheck.checked);

  if (mode === 'single-merged') {
    return [{
      label: `Selected Pages (${parsed.flatPages.join(', ')})`,
      suffix: 'selected-pages',
      pages: parsed.flatPages
    }];
  }

  return parsed.groups.map((g, idx) => ({
    label: g.label,
    suffix: `part-${idx + 1}-${g.label.toLowerCase().replace(/\s+/g, '-')}`,
    pages: g.pages
  }));
}

function updateSplitPreview() {
  clearErrorBanner(errorPanel);
  try {
    const groups = computeSplitGroups();
    document.getElementById('expectedOutputCountBadge').textContent = `${groups.length} Output PDF(s)`;
    previewGroupsContainer.innerHTML = groups.map((g, idx) => {
      const firstThumb = pageThumbUrls.get(g.pages[0]) || '';
      const lastThumb = g.pages.length > 1 ? pageThumbUrls.get(g.pages[g.pages.length - 1]) : null;
      return `
        <div class="col-12 col-sm-6 col-md-4 col-xl-3">
          <div class="p-3 border rounded-3 bg-body-tertiary h-100 d-flex flex-column justify-content-between">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="fw-bold small">File #${idx + 1}: ${escapeHtml(g.label)}</span>
              <span class="badge bg-primary">${g.pages.length} pg</span>
            </div>
            <div class="d-flex align-items-center justify-content-center gap-2 bg-body p-2 rounded border">
              <div class="text-center">
                <img src="${firstThumb}" alt="Start page ${g.pages[0]}" style="height:75px;object-fit:contain;" class="rounded border">
                <div class="small text-secondary" style="font-size:0.7rem;">P.${g.pages[0]}</div>
              </div>
              ${lastThumb ? `
                <i class="bi bi-arrow-right text-secondary"></i>
                <div class="text-center">
                  <img src="${lastThumb}" alt="End page ${g.pages[g.pages.length - 1]}" style="height:75px;object-fit:contain;" class="rounded border">
                  <div class="small text-secondary" style="font-size:0.7rem;">P.${g.pages[g.pages.length - 1]}</div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
    document.getElementById('executeSplitBtn').disabled = false;
  } catch (err) {
    document.getElementById('expectedOutputCountBadge').textContent = 'Invalid Range';
    previewGroupsContainer.innerHTML = '';
    document.getElementById('executeSplitBtn').disabled = true;
    showErrorBanner(errorPanel, normalizeError(err));
  }
}

document.getElementById('executeSplitBtn').addEventListener('click', executeSplit);

async function executeSplit() {
  clearErrorBanner(errorPanel);
  try {
    const groups = computeSplitGroups();
    const baseName = sanitizeFilename(loadedPdf.name);
    const srcDoc = await window.PDFLib.PDFDocument.load(loadedPdf.arrayBuffer);
    lastGeneratedOutputs = [];

    for (let i = 0; i < groups.length; i++) {
      const grp = groups[i];
      updateProgressPanel(progressPanel, {
        state: 'Processing',
        percent: Math.round(((i + 1) / groups.length) * 85),
        label: `Creating ${grp.label} (${i + 1} of ${groups.length})...`
      });

      const outDoc = await window.PDFLib.PDFDocument.create();
      const copied = await outDoc.copyPages(srcDoc, grp.pages.map(p => p - 1));
      copied.forEach(p => outDoc.addPage(p));

      const bytes = await outDoc.save();
      await verifyGeneratedPdfBytes(bytes);
      lastGeneratedOutputs.push({
        filename: `${baseName}-${grp.suffix}.pdf`,
        data: bytes,
        pageCount: grp.pages.length
      });
    }

    updateProgressPanel(progressPanel, { state: 'Ready' });

    if (lastGeneratedOutputs.length === 1) {
      const item = lastGeneratedOutputs[0];
      downloadPdfBytes(item.data, item.filename);
      renderResultPanel(resultPanel, {
        title: 'PDF Split Completed',
        filename: item.filename,
        size: item.data.byteLength,
        pageCount: item.pageCount,
        onDownload: () => downloadPdfBytes(item.data, item.filename),
        onReset: resetSplitTool
      });
    } else {
      const zipInfo = await createAndDownloadZip(lastGeneratedOutputs, `${baseName}-split-files.zip`);
      renderResultPanel(resultPanel, {
        title: `Generated ${lastGeneratedOutputs.length} Split PDF Files`,
        filename: zipInfo.filename,
        size: zipInfo.size,
        pageCount: lastGeneratedOutputs.length,
        onDownload: () => createAndDownloadZip(lastGeneratedOutputs, `${baseName}-split-files.zip`),
        onReset: resetSplitTool
      });
      renderIndividualSplitLinks();
    }
  } catch (err) {
    updateProgressPanel(progressPanel, { state: 'Ready' });
    showErrorBanner(errorPanel, normalizeError(err, loadedPdf?.name), executeSplit);
  }
}

function renderIndividualSplitLinks() {
  const listDiv = document.createElement('div');
  listDiv.className = 'mt-3 pt-3 border-top';
  listDiv.innerHTML = `<div class="small fw-bold mb-2">Download individual split PDFs:</div><div class="d-flex flex-wrap gap-2" id="indivSplitBtns"></div>`;
  resultPanel.querySelector('.alert')?.appendChild(listDiv);
  const btnWrap = listDiv.querySelector('#indivSplitBtns');
  lastGeneratedOutputs.forEach(item => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-outline-success';
    btn.textContent = `${item.filename} (${formatBytes(item.data.byteLength)}, ${item.pageCount}p)`;
    btn.addEventListener('click', () => downloadPdfBytes(item.data, item.filename));
    btnWrap.appendChild(btn);
  });
}

function resetSplitTool() {
  loadedPdf = null;
  lastGeneratedOutputs = [];
  workspace.classList.add('d-none');
  resultPanel.classList.add('d-none');
  dropzone.classList.remove('d-none');
}