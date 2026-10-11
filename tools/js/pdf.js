/* ==========================================================================
   PDF STUDIO PRO - NATIVE HIGH-DPI & CLIPBOARD COPY ENGINE
   ========================================================================== */

// Worker Config
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// High-DPI Scale: 4.16x matches 300 DPI true print sharpness relative to 72 pt base
const HIGH_DPI_SCALE = 4.16;
const PREVIEW_DPI_SCALE = 2.08;

const AppState = {
  activeTool: 'organize',
  sourcePdfBytes: null,
  sourcePdfDoc: null,
  pages: [], // [{ id, originalIndex, rotation, isDeleted, isSelected, canvasDataUrl, croppedDataUrl }]
  mergeFiles: [], // [{ id, name, bytes, previewUrl, pageCount }]
  stagedScans: [], // [{ id, dataUrl, rotation }]
  cameraStream: null,
  
  // Cropper Modal state
  activeCropper: null,
  currentCropTarget: null // { type: 'organize'|'scan', index: number }
};

// UI Element Map
const UI = {
  toolBtns: document.querySelectorAll('.tool-btn'),
  workspaceHeading: document.getElementById('workspaceHeading'),
  workspaceSubheading: document.getElementById('workspaceSubheading'),
  dropZone: document.getElementById('dropZone'),
  dropTitle: document.getElementById('dropTitle'),
  dropSubtitle: document.getElementById('dropSubtitle'),
  pdfFileInput: document.getElementById('pdfFileInput'),
  multiPdfInput: document.getElementById('multiPdfInput'),
  scannerSection: document.getElementById('scannerSection'),
  controlsBar: document.getElementById('controlsBar'),
  controlsContent: document.getElementById('controlsContent'),
  loadingStatus: document.getElementById('loadingStatus'),
  loadingText: document.getElementById('loadingText'),
  viewContainer: document.getElementById('viewContainer'),
  resetBtn: document.getElementById('resetBtn'),
  
  // Scanner components
  tabUploadMode: document.getElementById('tabUploadMode'),
  tabCameraMode: document.getElementById('tabCameraMode'),
  imageUploadBox: document.getElementById('imageUploadBox'),
  cameraBox: document.getElementById('cameraBox'),
  imageDropZone: document.getElementById('imageDropZone'),
  imageFileInput: document.getElementById('imageFileInput'),
  cameraVideo: document.getElementById('cameraVideo'),
  cameraCaptureCanvas: document.getElementById('cameraCaptureCanvas'),
  snapBtn: document.getElementById('snapBtn'),
  scannedPagesRow: document.getElementById('scannedPagesRow'),
  scanCount: document.getElementById('scanCount'),
  finishScanBtn: document.getElementById('finishScanBtn'),
  sendScanToOrganizeBtn: document.getElementById('sendScanToOrganizeBtn'),

  // Cropper components
  cropModalEl: document.getElementById('cropModal'),
  cropperTargetImage: document.getElementById('cropperTargetImage'),
  cropperRotateLeft: document.getElementById('cropperRotateLeft'),
  cropperRotateRight: document.getElementById('cropperRotateRight'),
  cropperReset: document.getElementById('cropperReset'),
  cropperApplyBtn: document.getElementById('cropperApplyBtn')
};

let cropModalInstance = null;

/* ==========================================================================
   INITIALIZATION & NAVIGATION
   ========================================================================== */
function init() {
  cropModalInstance = new bootstrap.Modal(UI.cropModalEl);
  bindNavigation();
  bindDropZones();
  bindScanner();
  bindCropperControls();
  setTool('organize');
}

function bindNavigation() {
  UI.toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setTool(btn.getAttribute('data-tool'));
    });
  });

  UI.resetBtn.addEventListener('click', resetCurrentWorkspace);
}

function setTool(toolName) {
  AppState.activeTool = toolName;
  stopCamera();

  UI.toolBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tool') === toolName);
  });

  UI.viewContainer.innerHTML = '';
  UI.controlsBar.classList.add('d-none');
  UI.controlsContent.innerHTML = '';
  UI.resetBtn.classList.add('d-none');
  UI.scannerSection.classList.add('d-none');
  UI.dropZone.classList.remove('d-none');

  if (toolName === 'organize') {
    UI.workspaceHeading.textContent = 'Organize PDF';
    UI.workspaceSubheading.textContent = '';
    UI.dropTitle.textContent = 'Tap or Drag PDF to Organize';
  } else if (toolName === 'merge') {
    UI.workspaceHeading.textContent = 'Merge PDF Files';
    UI.workspaceSubheading.textContent = ' ';
    UI.dropTitle.textContent = ' Tap or Drag PDFs to Merge';
  } else if (toolName === 'split') {
    UI.workspaceHeading.textContent = 'Split PDF';
    UI.workspaceSubheading.textContent = '';
    UI.dropTitle.textContent = 'Tap or Drag PDF to Split';
  } else if (toolName === 'scan') {
    UI.workspaceHeading.textContent = 'Scan to PDF ';
    UI.workspaceSubheading.textContent = '';
    UI.dropZone.classList.add('d-none');
    UI.scannerSection.classList.remove('d-none');
    renderStagedScans();
  } else if (toolName === 'convert') {
    UI.workspaceHeading.textContent = ' PDF to Image';
    UI.workspaceSubheading.textContent = '';
    UI.dropTitle.textContent = ' Tap or Drag PDF to Convert';
  }
}

function showLoading(msg = 'Processing...') {
  UI.loadingText.textContent = msg;
  UI.loadingStatus.classList.remove('d-none');
}

function hideLoading() {
  UI.loadingStatus.classList.add('d-none');
}

function resetCurrentWorkspace() {
  AppState.sourcePdfBytes = null;
  AppState.sourcePdfDoc = null;
  AppState.pages = [];
  AppState.mergeFiles = [];
  UI.viewContainer.innerHTML = '';
  UI.controlsBar.classList.add('d-none');
  UI.resetBtn.classList.add('d-none');
  UI.dropZone.classList.remove('d-none');
}

/* ==========================================================================
   FILE DROP & LOADING ENGINE
   ========================================================================== */
function bindDropZones() {
  UI.dropZone.addEventListener('click', () => {
    if (AppState.activeTool === 'merge') {
      UI.multiPdfInput.click();
    } else {
      UI.pdfFileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach(name => {
    UI.dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      UI.dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    UI.dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      UI.dropZone.classList.remove('dragover');
    });
  });

  UI.dropZone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (!files.length) return;
    if (AppState.activeTool === 'merge') {
      handleMergeFiles(files);
    } else {
      loadSinglePdf(files[0]);
    }
  });

  UI.pdfFileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) loadSinglePdf(e.target.files[0]);
  });

  UI.multiPdfInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleMergeFiles(Array.from(e.target.files));
  });
}

async function loadSinglePdf(fileOrBytes) {
  showLoading('Rendering high-fidelity document...');
  try {
    let arrayBuffer = (fileOrBytes instanceof File) ? await fileOrBytes.arrayBuffer() : fileOrBytes;
    AppState.sourcePdfBytes = arrayBuffer;
    AppState.sourcePdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;

    UI.dropZone.classList.add('d-none');
    UI.resetBtn.classList.remove('d-none');

    if (AppState.activeTool === 'organize') {
      await loadOrganizeWorkspace();
    } else if (AppState.activeTool === 'split') {
      await loadSplitWorkspace();
    } else if (AppState.activeTool === 'convert') {
      await loadConvertWorkspace();
    }
  } catch (err) {
    alert('Failed to load PDF file: ' + err.message);
  } finally {
    hideLoading();
  }
}

/* ==========================================================================
   FEATURE 1: ORGANIZE PDF (High DPI Previews, Reorder, Crop, Delete, Extract)
   ========================================================================== */
async function loadOrganizeWorkspace() {
  showLoading('Rendering page previews in high resolution...');
  AppState.pages = [];
  const numPages = AppState.sourcePdfDoc.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await AppState.sourcePdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: PREVIEW_DPI_SCALE });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    AppState.pages.push({
      id: 'p_' + i,
      originalIndex: i - 1,
      rotation: 0,
      isDeleted: false,
      isSelected: false,
      canvasDataUrl: canvas.toDataURL('image/jpeg', 0.95),
      croppedDataUrl: null
    });
  }

  renderOrganizeControls();
  renderOrganizeGrid();
  hideLoading();
}

function renderOrganizeControls() {
  UI.controlsBar.classList.remove('d-none');
  UI.controlsContent.innerHTML = `
    <div class="col-12 col-md-6 d-flex align-items-center gap-2">
      <button class="topview-btn topview-btn-secondary btn-sm" id="selectAllPagesBtn">
        <i class="bi bi-check-all me-1"></i> Select All
      </button>
      <button class="topview-btn topview-btn-secondary btn-sm" id="clearSelectionBtn">
        <i class="bi bi-x-circle me-1"></i> Clear
      </button>
      <span class="small text-muted ms-2" id="selectedCountText">0 selected</span>
    </div>
    <div class="col-12 col-md-6 d-flex justify-content-md-end gap-2">
      <button class="topview-btn topview-btn-secondary btn-sm" id="extractSelectedBtn">
        <i class="bi bi-box-arrow-up-right me-1"></i> Extract Selected
      </button>
      <button class="topview-btn topview-btn-primary btn-sm" id="saveOrganizedBtn">
        <i class="bi bi-download me-1"></i> Save Changes
      </button>
    </div>
  `;

  document.getElementById('selectAllPagesBtn').onclick = () => {
    AppState.pages.forEach(p => { if (!p.isDeleted) p.isSelected = true; });
    renderOrganizeGrid();
    updateSelectionCounter();
  };

  document.getElementById('clearSelectionBtn').onclick = () => {
    AppState.pages.forEach(p => p.isSelected = false);
    renderOrganizeGrid();
    updateSelectionCounter();
  };

  document.getElementById('extractSelectedBtn').onclick = extractSelectedPages;
  document.getElementById('saveOrganizedBtn').onclick = saveOrganizedPdf;
}

function updateSelectionCounter() {
  const count = AppState.pages.filter(p => p.isSelected && !p.isDeleted).length;
  const countText = document.getElementById('selectedCountText');
  if (countText) countText.textContent = `${count} selected`;
}

function renderOrganizeGrid() {
  UI.viewContainer.innerHTML = '<div class="page-grid" id="organizeGrid"></div>';
  const grid = document.getElementById('organizeGrid');

  AppState.pages.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = `page-card ${p.isDeleted ? 'deleted' : ''} ${p.isSelected ? 'selected' : ''}`;
    card.draggable = !p.isDeleted;
    card.dataset.index = idx;

    const displaySrc = p.croppedDataUrl || p.canvasDataUrl;

    card.innerHTML = `
      <div class="page-thumb-container">
        <img src="${displaySrc}" class="page-thumb-img" style="transform: rotate(${p.rotation}deg);" alt="Page ${idx + 1}">
      </div>
      <div class="page-card-footer">
        <div class="form-check m-0">
          <input class="form-check-input page-check" type="checkbox" ${p.isSelected ? 'checked' : ''} ${p.isDeleted ? 'disabled' : ''}>
          <label class="form-check-label small fw-bold ms-1">#${idx + 1}</label>
        </div>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-light border-0 p-1 crop-btn" title="Interactive Crop" ${p.isDeleted ? 'disabled' : ''}>
            <i class="bi bi-crop text-primary"></i>
          </button>
          <button class="btn btn-sm btn-light border-0 p-1 rotate-btn" title="Rotate 90°" ${p.isDeleted ? 'disabled' : ''}>
            <i class="bi bi-arrow-clockwise"></i>
          </button>
          <button class="btn btn-sm ${p.isDeleted ? 'btn-warning' : 'btn-light'} border-0 p-1 delete-btn" title="${p.isDeleted ? 'Restore Page' : 'Remove Page'}">
            <i class="bi ${p.isDeleted ? 'bi-arrow-counterclockwise' : 'bi-trash3 text-danger'}"></i>
          </button>
        </div>
      </div>
    `;

    // Crop
    card.querySelector('.crop-btn').onclick = (e) => {
      e.stopPropagation();
      openCropModal('organize', idx, displaySrc);
    };

    // Rotate
    card.querySelector('.rotate-btn').onclick = (e) => {
      e.stopPropagation();
      p.rotation = (p.rotation + 90) % 360;
      renderOrganizeGrid();
    };

    // Delete
    card.querySelector('.delete-btn').onclick = (e) => {
      e.stopPropagation();
      p.isDeleted = !p.isDeleted;
      if (p.isDeleted) p.isSelected = false;
      renderOrganizeGrid();
      updateSelectionCounter();
    };

    // Select Checkbox
    card.querySelector('.page-check').onclick = (e) => {
      e.stopPropagation();
      p.isSelected = e.target.checked;
      card.classList.toggle('selected', p.isSelected);
      updateSelectionCounter();
    };

    // Drag-and-drop Reordering
    card.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', idx));
    card.addEventListener('dragover', (e) => e.preventDefault());
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const originIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (originIdx === idx) return;
      const moved = AppState.pages.splice(originIdx, 1)[0];
      AppState.pages.splice(idx, 0, moved);
      renderOrganizeGrid();
    });

    grid.appendChild(card);
  });
  updateSelectionCounter();
}

async function saveOrganizedPdf() {
  const activePages = AppState.pages.filter(p => !p.isDeleted);
  if (!activePages.length) return alert('At least one page must remain active.');

  showLoading('Saving organized PDF in full quality...');
  try {
    const srcDoc = await PDFLib.PDFDocument.load(AppState.sourcePdfBytes);
    const destDoc = await PDFLib.PDFDocument.create();

    for (let i = 0; i < activePages.length; i++) {
      const p = activePages[i];
      if (p.croppedDataUrl) {
        const img = await destDoc.embedJpg(p.croppedDataUrl);
        const { width, height } = img.scale(1);
        const page = destDoc.addPage([width, height]);
        page.drawImage(img, { x: 0, y: 0, width, height });
        if (p.rotation) page.setRotation(PDFLib.degrees(p.rotation));
      } else {
        const [copiedPage] = await destDoc.copyPages(srcDoc, [p.originalIndex]);
        const currentRot = copiedPage.getRotation().angle;
        copiedPage.setRotation(PDFLib.degrees((currentRot + p.rotation) % 360));
        destDoc.addPage(copiedPage);
      }
    }

    const pdfBytes = await destDoc.save();
    downloadBlob(pdfBytes, 'organized.pdf', 'application/pdf');
  } catch (err) {
    alert('Save error: ' + err.message);
  } finally {
    hideLoading();
  }
}

async function extractSelectedPages() {
  const selected = AppState.pages.filter(p => p.isSelected && !p.isDeleted);
  if (!selected.length) return alert('Please check at least one page to extract.');

  showLoading('Extracting pages...');
  try {
    const srcDoc = await PDFLib.PDFDocument.load(AppState.sourcePdfBytes);
    const destDoc = await PDFLib.PDFDocument.create();

    for (let i = 0; i < selected.length; i++) {
      const p = selected[i];
      if (p.croppedDataUrl) {
        const img = await destDoc.embedJpg(p.croppedDataUrl);
        const { width, height } = img.scale(1);
        const page = destDoc.addPage([width, height]);
        page.drawImage(img, { x: 0, y: 0, width, height });
        if (p.rotation) page.setRotation(PDFLib.degrees(p.rotation));
      } else {
        const [copiedPage] = await destDoc.copyPages(srcDoc, [p.originalIndex]);
        const currentRot = copiedPage.getRotation().angle;
        copiedPage.setRotation(PDFLib.degrees((currentRot + p.rotation) % 360));
        destDoc.addPage(copiedPage);
      }
    }

    const pdfBytes = await destDoc.save();
    downloadBlob(pdfBytes, 'extracted.pdf', 'application/pdf');
  } catch (err) {
    alert('Extraction failed: ' + err.message);
  } finally {
    hideLoading();
  }
}

/* ==========================================================================
   FEATURE 2: MERGE PDF (Previews & Reorder Controls)
   ========================================================================== */
async function handleMergeFiles(files) {
  showLoading('Rendering merge previews in high fidelity...');
  try {
    for (const f of files) {
      const arrayBuffer = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.8 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      AppState.mergeFiles.push({
        id: 'mf_' + Date.now() + Math.random(),
        name: f.name,
        bytes: arrayBuffer,
        pageCount: pdf.numPages,
        previewUrl: canvas.toDataURL('image/jpeg', 0.92)
      });
    }
    renderMergeWorkspace();
  } catch (err) {
    alert('Merge upload error: ' + err.message);
  } finally {
    hideLoading();
  }
}

function renderMergeWorkspace() {
  UI.dropZone.classList.add('d-none');
  UI.controlsBar.classList.remove('d-none');
  UI.controlsContent.innerHTML = `
    <div class="col-6 small text-muted"><strong>${AppState.mergeFiles.length}</strong> documents ready</div>
    <div class="col-6 text-end">
      <button class="topview-btn topview-btn-primary btn-sm" id="compileMergeBtn">
        <i class="bi bi-arrows-angle-contract me-1"></i> Merge &amp; Save
      </button>
    </div>
  `;

  UI.viewContainer.innerHTML = '<div class="d-flex flex-column gap-2" id="mergeList"></div>';
  const list = document.getElementById('mergeList');

  AppState.mergeFiles.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'merge-card';
    card.innerHTML = `
      <div class="merge-thumb-wrap">
        <img src="${item.previewUrl}" alt="Cover">
      </div>
      <div class="flex-grow-1 overflow-hidden">
        <div class="fw-bold text-truncate">${item.name}</div>
        <small class="text-muted">${item.pageCount} Pages • High Resolution</small>
      </div>
      <div class="d-flex align-items-center gap-1">
        <button class="btn btn-sm btn-light border p-1 move-up-btn" title="Move Up" ${idx === 0 ? 'disabled' : ''}>
          <i class="bi bi-arrow-up"></i>
        </button>
        <button class="btn btn-sm btn-light border p-1 move-down-btn" title="Move Down" ${idx === AppState.mergeFiles.length - 1 ? 'disabled' : ''}>
          <i class="bi bi-arrow-down"></i>
        </button>
        <button class="btn btn-sm btn-light border p-1 text-danger ms-1 remove-merge-btn" title="Remove">
          <i class="bi bi-trash3"></i>
        </button>
      </div>
    `;

    card.querySelector('.move-up-btn').onclick = () => {
      if (idx > 0) {
        const moved = AppState.mergeFiles.splice(idx, 1)[0];
        AppState.mergeFiles.splice(idx - 1, 0, moved);
        renderMergeWorkspace();
      }
    };

    card.querySelector('.move-down-btn').onclick = () => {
      if (idx < AppState.mergeFiles.length - 1) {
        const moved = AppState.mergeFiles.splice(idx, 1)[0];
        AppState.mergeFiles.splice(idx + 1, 0, moved);
        renderMergeWorkspace();
      }
    };

    card.querySelector('.remove-merge-btn').onclick = () => {
      AppState.mergeFiles.splice(idx, 1);
      renderMergeWorkspace();
    };

    list.appendChild(card);
  });

  document.getElementById('compileMergeBtn').onclick = async () => {
    if (AppState.mergeFiles.length < 2) return alert('Please add at least 2 PDF documents to merge.');
    showLoading('Merging documents in lossless quality...');
    try {
      const merged = await PDFLib.PDFDocument.create();
      for (const file of AppState.mergeFiles) {
        const doc = await PDFLib.PDFDocument.load(file.bytes);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      const bytes = await merged.save();
      downloadBlob(bytes, 'merged.pdf', 'application/pdf');
    } catch (err) {
      alert('Merge failed: ' + err.message);
    } finally {
      hideLoading();
    }
  };
}

/* ==========================================================================
   FEATURE 3: SPLIT PDF (Visual Page Grid Preview)
   ========================================================================== */
async function loadSplitWorkspace() {
  showLoading('Generating visual split page previews...');
  const numPages = AppState.sourcePdfDoc.numPages;
  const splitThumbnails = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await AppState.sourcePdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 0.6 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    splitThumbnails.push({ pageNum: i, thumb: canvas.toDataURL('image/jpeg', 0.92), selected: false });
  }

  UI.controlsBar.classList.remove('d-none');
  UI.controlsContent.innerHTML = `
    <div class="col-12 col-md-7 d-flex align-items-center gap-2">
      <label class="small fw-semibold text-muted text-nowrap">Page Range:</label>
      <input type="text" id="splitRangeInput" class="form-control form-control-sm topview-pill" placeholder="e.g. 1-2, 4">
    </div>
    <div class="col-12 col-md-5 text-md-end">
      <button class="topview-btn topview-btn-primary btn-sm" id="executeSplitBtn">
        <i class="bi bi-arrows-angle-expand me-1"></i> Extract &amp; Save Split PDF
      </button>
    </div>
  `;

  UI.viewContainer.innerHTML = '<div class="page-grid" id="splitGrid"></div>';
  const grid = document.getElementById('splitGrid');
  const rangeInput = document.getElementById('splitRangeInput');

  function syncSplitInputFromSelection() {
    const selNums = splitThumbnails.filter(t => t.selected).map(t => t.pageNum);
    rangeInput.value = selNums.join(', ');
  }

  splitThumbnails.forEach(item => {
    const card = document.createElement('div');
    card.className = 'page-card cursor-pointer';
    card.innerHTML = `
      <div class="page-thumb-container">
        <img src="${item.thumb}" class="page-thumb-img" alt="Page ${item.pageNum}">
      </div>
      <div class="page-card-footer text-center justify-content-center">
        <span class="small fw-bold">Page #${item.pageNum}</span>
      </div>
    `;

    card.onclick = () => {
      item.selected = !item.selected;
      card.classList.toggle('selected', item.selected);
      syncSplitInputFromSelection();
    };

    grid.appendChild(card);
  });

  document.getElementById('executeSplitBtn').onclick = async () => {
    const rangeVal = rangeInput.value.trim();
    if (!rangeVal) return alert('Select pages by clicking or specify ranges (e.g. 1-3, 5).');

    showLoading('Splitting PDF pages...');
    try {
      const srcDoc = await PDFLib.PDFDocument.load(AppState.sourcePdfBytes);
      const destDoc = await PDFLib.PDFDocument.create();
      const indices = parseRange(rangeVal, AppState.sourcePdfDoc.numPages);
      if (!indices.length) return alert('No valid pages in the specified range.');

      const copied = await destDoc.copyPages(srcDoc, indices);
      copied.forEach(p => destDoc.addPage(p));
      const bytes = await destDoc.save();
      downloadBlob(bytes, 'split.pdf', 'application/pdf');
    } catch (err) {
      alert('Split failed: ' + err.message);
    } finally {
      hideLoading();
    }
  };

  hideLoading();
}

function parseRange(str, max) {
  const set = new Set();
  str.split(',').forEach(part => {
    part = part.trim();
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) if (i >= 1 && i <= max) set.add(i - 1);
    } else {
      const n = Number(part);
      if (n >= 1 && n <= max) set.add(n - 1);
    }
  });
  return Array.from(set);
}

/* ==========================================================================
   FEATURE 4: SCAN TO PDF (High Resolution, Reorder, Crop)
   ========================================================================== */
function bindScanner() {
  UI.tabUploadMode.onclick = () => {
    UI.tabUploadMode.classList.add('active');
    UI.tabCameraMode.classList.remove('active');
    UI.imageUploadBox.classList.remove('d-none');
    UI.cameraBox.classList.add('d-none');
    stopCamera();
  };

  UI.tabCameraMode.onclick = () => {
    UI.tabCameraMode.classList.add('active');
    UI.tabUploadMode.classList.remove('active');
    UI.imageUploadBox.classList.add('d-none');
    UI.cameraBox.classList.remove('d-none');
    startCamera();
  };

  UI.imageDropZone.onclick = () => UI.imageFileInput.click();
  UI.imageFileInput.onchange = (e) => {
    if (e.target.files.length) handleImageFiles(Array.from(e.target.files));
  };

  UI.snapBtn.onclick = captureCameraSnapshot;
  UI.finishScanBtn.onclick = () => compileScannedToPdf(false);
  UI.sendScanToOrganizeBtn.onclick = () => compileScannedToPdf(true);
}

async function startCamera() {
  try {
    AppState.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 3840, min: 1920 },
        height: { ideal: 2160, min: 1080 }
      },
      audio: false
    });
    UI.cameraVideo.srcObject = AppState.cameraStream;
  } catch (err) {
    alert('Camera access failed: ' + err.message);
    UI.tabUploadMode.click();
  }
}

function stopCamera() {
  if (AppState.cameraStream) {
    AppState.cameraStream.getTracks().forEach(t => t.stop());
    AppState.cameraStream = null;
  }
}

function captureCameraSnapshot() {
  const video = UI.cameraVideo;
  if (!video.videoWidth) return;
  const canvas = UI.cameraCaptureCanvas;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
  AppState.stagedScans.push({
    id: 'scan_' + Date.now(),
    dataUrl,
    rotation: 0
  });
  renderStagedScans();
}

function handleImageFiles(files) {
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        AppState.stagedScans.push({
          id: 'scan_' + Date.now() + Math.random(),
          dataUrl: canvas.toDataURL('image/jpeg', 0.98),
          rotation: 0
        });
        renderStagedScans();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderStagedScans() {
  const row = UI.scannedPagesRow;
  row.innerHTML = '';
  UI.scanCount.textContent = AppState.stagedScans.length;

  const hasItems = AppState.stagedScans.length > 0;
  UI.finishScanBtn.disabled = !hasItems;
  UI.sendScanToOrganizeBtn.disabled = !hasItems;

  AppState.stagedScans.forEach((scan, idx) => {
    const card = document.createElement('div');
    card.className = 'staged-item-card';
    card.innerHTML = `
      <img src="${scan.dataUrl}" style="transform: rotate(${scan.rotation}deg);" alt="Scan">
      <div class="d-flex justify-content-center gap-1 mt-1">
        <button class="btn btn-sm btn-light p-1 border-0 move-left-btn" title="Move Left" ${idx === 0 ? 'disabled' : ''}>
          <i class="bi bi-arrow-left"></i>
        </button>
        <button class="btn btn-sm btn-light p-1 border-0 crop-scan-btn" title="Interactive Crop">
          <i class="bi bi-crop text-primary"></i>
        </button>
        <button class="btn btn-sm btn-light p-1 border-0 rotate-scan-btn" title="Rotate">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button class="btn btn-sm btn-light p-1 border-0 move-right-btn" title="Move Right" ${idx === AppState.stagedScans.length - 1 ? 'disabled' : ''}>
          <i class="bi bi-arrow-right"></i>
        </button>
        <button class="btn btn-sm btn-light p-1 border-0 text-danger remove-scan-btn" title="Remove">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;

    card.querySelector('.move-left-btn').onclick = () => {
      if (idx > 0) {
        const moved = AppState.stagedScans.splice(idx, 1)[0];
        AppState.stagedScans.splice(idx - 1, 0, moved);
        renderStagedScans();
      }
    };

    card.querySelector('.move-right-btn').onclick = () => {
      if (idx < AppState.stagedScans.length - 1) {
        const moved = AppState.stagedScans.splice(idx, 1)[0];
        AppState.stagedScans.splice(idx + 1, 0, moved);
        renderStagedScans();
      }
    };

    card.querySelector('.crop-scan-btn').onclick = () => {
      openCropModal('scan', idx, scan.dataUrl);
    };

    card.querySelector('.rotate-scan-btn').onclick = () => {
      scan.rotation = (scan.rotation + 90) % 360;
      renderStagedScans();
    };

    card.querySelector('.remove-scan-btn').onclick = () => {
      AppState.stagedScans.splice(idx, 1);
      renderStagedScans();
    };

    row.appendChild(card);
  });
}

async function compileScannedToPdf(sendToOrganize = false) {
  if (!AppState.stagedScans.length) return;
  showLoading('Compiling high-resolution document...');
  try {
    const pdfDoc = await PDFLib.PDFDocument.create();

    for (const scan of AppState.stagedScans) {
      const image = await pdfDoc.embedJpg(scan.dataUrl);
      const { width, height } = image.scale(1);
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });
      if (scan.rotation) page.setRotation(PDFLib.degrees(scan.rotation));
    }

    const pdfBytes = await pdfDoc.save();

    if (sendToOrganize) {
      setTool('organize');
      await loadSinglePdf(pdfBytes);
    } else {
      downloadBlob(pdfBytes, 'scanned.pdf', 'application/pdf');
    }
  } catch (err) {
    alert('Compile failed: ' + err.message);
  } finally {
    hideLoading();
  }
}

/* ==========================================================================
   FEATURE 5: PDF TO IMAGE (Native High DPI, Clipboard Copy & JPEG Download)
   ========================================================================== */
async function loadConvertWorkspace() {
  showLoading('Rendering high-DPI image previews...');
  const numPages = AppState.sourcePdfDoc.numPages;
  const imagePreviews = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await AppState.sourcePdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: PREVIEW_DPI_SCALE });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    imagePreviews.push({
      pageNumber: i,
      previewUrl: canvas.toDataURL('image/jpeg', 0.94)
    });
  }

  UI.controlsBar.classList.remove('d-none');
  UI.controlsContent.innerHTML = `
    <div class="col-12 col-md-6 d-flex align-items-center gap-2">
      <span class="badge bg-primary-subtle text-primary border rounded-pill px-3 py-2 fw-semibold">
        <i class="bi bi-shield-check me-1"></i> Native Vector Quality Preserved
      </span>
    </div>
    <div class="col-12 col-md-6 text-md-end">
      <button class="topview-btn topview-btn-primary btn-sm" id="exportAllJpegZipBtn">
        <i class="bi bi-file-earmark-zip me-1"></i> Download All as ZIP (High DPI)
      </button>
    </div>
  `;

  UI.viewContainer.innerHTML = '<div class="page-grid" id="convertGrid"></div>';
  const grid = document.getElementById('convertGrid');

  imagePreviews.forEach(item => {
    const card = document.createElement('div');
    card.className = 'page-card';
    card.innerHTML = `
      <div class="page-thumb-container">
        <img src="${item.previewUrl}" class="page-thumb-img" alt="Page ${item.pageNumber}">
      </div>
      <div class="page-card-footer d-flex justify-content-between align-items-center flex-wrap gap-1">
        <span class="small fw-bold">#${item.pageNumber}</span>
        <div class="d-flex gap-1">
          <!-- Copy to Clipboard Button -->
          <button class="btn btn-sm btn-outline-secondary border-0 p-1 px-2 copy-img-btn" title="Copy High-DPI Image to Clipboard">
            <i class="bi bi-clipboard me-1"></i> Copy
          </button>
          <!-- Download JPEG Button -->
          <button class="btn btn-sm btn-outline-primary border-0 p-1 px-2 single-dl-btn" title="Download High-Res JPEG">
            <i class="bi bi-download me-1"></i> JPEG
          </button>
        </div>
      </div>
    `;

    // 1. Copy High-DPI to Clipboard
    const copyBtn = card.querySelector('.copy-img-btn');
    copyBtn.onclick = async () => {
      const originalHTML = copyBtn.innerHTML;
      copyBtn.disabled = true;
      copyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Copying...';

      try {
        const page = await AppState.sourcePdfDoc.getPage(item.pageNumber);
        const viewport = page.getViewport({ scale: HIGH_DPI_SCALE });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise;

        // ClipboardItem standard uses PNG for lossless system clipboard pasting
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);

        copyBtn.className = 'btn btn-sm btn-success border-0 p-1 px-2 copy-img-btn';
        copyBtn.innerHTML = '<i class="bi bi-check2 me-1"></i> Copied!';

        setTimeout(() => {
          copyBtn.className = 'btn btn-sm btn-outline-secondary border-0 p-1 px-2 copy-img-btn';
          copyBtn.innerHTML = originalHTML;
          copyBtn.disabled = false;
        }, 2200);
      } catch (err) {
        alert('Clipboard copy error (ensure clipboard permissions are enabled): ' + err.message);
        copyBtn.innerHTML = originalHTML;
        copyBtn.disabled = false;
      }
    };

    // 2. Download High-DPI JPEG
    card.querySelector('.single-dl-btn').onclick = async () => {
      showLoading(`Exporting Page ${item.pageNumber} in native resolution...`);
      try {
        const page = await AppState.sourcePdfDoc.getPage(item.pageNumber);
        const viewport = page.getViewport({ scale: HIGH_DPI_SCALE });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise;
        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.98));
        downloadBlob(blob, `page-${item.pageNumber}.jpg`, 'image/jpeg');
      } finally {
        hideLoading();
      }
    };

    grid.appendChild(card);
  });

  document.getElementById('exportAllJpegZipBtn').onclick = exportAllUltraDpiJpegs;
  hideLoading();
}

async function exportAllUltraDpiJpegs() {
  const numPages = AppState.sourcePdfDoc.numPages;
  const zip = new JSZip();

  try {
    for (let i = 1; i <= numPages; i++) {
      showLoading(`Exporting Page ${i} of ${numPages} in native resolution...`);
      const page = await AppState.sourcePdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: HIGH_DPI_SCALE });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise;
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.98));
      zip.file(`page-${i}.jpg`, blob);
    }

    showLoading('Packing images into ZIP archive...');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, 'document-images.zip', 'application/zip');
  } catch (err) {
    alert('Conversion error: ' + err.message);
  } finally {
    hideLoading();
  }
}

/* ==========================================================================
   INTERACTIVE CROPPER ENGINE
   ========================================================================== */
function openCropModal(type, index, imageSrc) {
  AppState.currentCropTarget = { type, index };
  UI.cropperTargetImage.src = imageSrc;

  cropModalInstance.show();

  UI.cropModalEl.addEventListener('shown.bs.modal', function onModalShown() {
    UI.cropModalEl.removeEventListener('shown.bs.modal', onModalShown);
    if (AppState.activeCropper) AppState.activeCropper.destroy();

    AppState.activeCropper = new Cropper(UI.cropperTargetImage, {
      viewMode: 1,
      autoCropArea: 0.9,
      responsive: true,
      background: false
    });
  });
}

function bindCropperControls() {
  UI.cropperRotateLeft.onclick = () => {
    if (AppState.activeCropper) AppState.activeCropper.rotate(-90);
  };
  UI.cropperRotateRight.onclick = () => {
    if (AppState.activeCropper) AppState.activeCropper.rotate(90);
  };
  UI.cropperReset.onclick = () => {
    if (AppState.activeCropper) AppState.activeCropper.reset();
  };

  UI.cropperApplyBtn.onclick = () => {
    if (!AppState.activeCropper) return;

    const croppedCanvas = AppState.activeCropper.getCroppedCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    });

    const croppedDataUrl = croppedCanvas.toDataURL('image/jpeg', 0.98);
    const target = AppState.currentCropTarget;

    if (target.type === 'organize') {
      AppState.pages[target.index].croppedDataUrl = croppedDataUrl;
      AppState.pages[target.index].rotation = 0;
      renderOrganizeGrid();
    } else if (target.type === 'scan') {
      AppState.stagedScans[target.index].dataUrl = croppedDataUrl;
      AppState.stagedScans[target.index].rotation = 0;
      renderStagedScans();
    }

    cropModalInstance.hide();
    AppState.activeCropper.destroy();
    AppState.activeCropper = null;
  };
}

/* ==========================================================================
   GENERAL UTILITIES & DOWNLOAD
   ========================================================================== */
function downloadBlob(data, filename, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.addEventListener('DOMContentLoaded', init);