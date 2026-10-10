pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Clean up any stale no-op service workers causing navigation overhead
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      if (registration.active && registration.active.scriptURL.includes('sw.js')) {
        // Optional: unregister if not strictly caching assets
      }
    }
  }).catch(() => {});
}

// DOM Selectors
const toolButtons = document.querySelectorAll('.tool-btn');
const workspaceHeading = document.getElementById('workspaceHeading');
const workspaceSubheading = document.getElementById('workspaceSubheading');
const docMetaBadge = document.getElementById('docMetaBadge');
const resetBtn = document.getElementById('resetBtn');

const dropZone = document.getElementById('dropZone');
const dropTitle = document.getElementById('dropTitle');
const dropSubtitle = document.getElementById('dropSubtitle');
const dropIcon = document.getElementById('dropIcon');
const pdfFileInput = document.getElementById('pdfFileInput');

const controlsBar = document.getElementById('controlsBar');
const controlsContent = document.getElementById('controlsContent');
const loadingStatus = document.getElementById('loadingStatus');
const loadingText = document.getElementById('loadingText');
const loadingPercent = document.getElementById('loadingPercent');
const loadingProgressBar = document.getElementById('loadingProgressBar');
const viewContainer = document.getElementById('viewContainer');

// Scan Selectors
const scannerSection = document.getElementById('scannerSection');
const tabUploadMode = document.getElementById('tabUploadMode');
const tabCameraMode = document.getElementById('tabCameraMode');
const cameraBox = document.getElementById('cameraBox');
const imageUploadBox = document.getElementById('imageUploadBox');
const imageDropZone = document.getElementById('imageDropZone');
const imageFileInput = document.getElementById('imageFileInput');
const cameraVideo = document.getElementById('cameraVideo');
const cameraCaptureCanvas = document.getElementById('cameraCaptureCanvas');
const snapBtn = document.getElementById('snapBtn');
const finishScanBtn = document.getElementById('finishScanBtn');
const scannedPagesRow = document.getElementById('scannedPagesRow');
const scanCount = document.getElementById('scanCount');

// Application State
let activeTool = 'organize';
let mediaStream = null;
let mergeFiles = [];
let singlePdfBuffer = null;
let singlePdfName = 'document';
let pagesData = [];
let scanImages = [];

// History Stack (Undo / Redo)
let historyStack = [];
let historyIndex = -1;
let lastSelectedIdx = null;

const toolMeta = {
  organize: { title: 'Organize PDF', desc: 'Reorder, rotate, duplicate, watermark, and extract pages.', icon: 'bi-grid-fill' },
  merge: { title: 'Merge PDF', desc: 'Select or drop multiple PDF files to combine into one.', icon: 'bi-intersect' },
  split: { title: 'Split PDF', desc: 'Extract custom page ranges or separate all pages.', icon: 'bi-arrows-angle-expand' },
  remove: { title: 'Remove Pages', desc: 'Select pages to delete permanently from your PDF.', icon: 'bi-trash3-fill' },
  extract: { title: 'Extract Pages', desc: 'Select specific pages to build a clean new PDF document.', icon: 'bi-box-arrow-up-right' },
  scan: { title: 'Scan to PDF', desc: 'Capture or upload camera images directly into an A4 document.', icon: 'bi-camera-viewfinder' },
  convert: { title: 'PDF to Image Converter', desc: 'Export pages as individual lossless PNGs or compressed JPGs.', icon: 'bi-file-earmark-image-fill' }
};

/* =======================================================
   TOAST NOTIFICATION ENGINE
   ======================================================= */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toastEl = document.createElement('div');
  const bg = type === 'danger' ? 'bg-danger text-white' : (type === 'success' ? 'bg-success text-white' : 'bg-white text-dark border shadow-sm');
  
  toastEl.className = `toast align-items-center ${bg} border-0 show shadow-lg mb-2`;
  toastEl.setAttribute('role', 'alert');
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body small fw-semibold">${message}</div>
      <button type="button" class="btn-close ${type === 'info' ? '' : 'btn-close-white'} me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  container.appendChild(toastEl);
  setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => toastEl.remove(), 250);
  }, 3200);
}

/* =======================================================
   ROUTER & TOOL CONTROLLER
   ======================================================= */
toolButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tool = btn.dataset.tool;
    if (!tool || tool === activeTool) return;
    switchTool(tool);
  });
});

function switchTool(targetTool) {
  teardownActiveTool();
  activeTool = targetTool;

  toolButtons.forEach(b => b.classList.toggle('active', b.dataset.tool === targetTool));
  if (workspaceHeading) workspaceHeading.textContent = toolMeta[targetTool].title;
  if (workspaceSubheading) workspaceSubheading.textContent = toolMeta[targetTool].desc;
  if (dropIcon) dropIcon.className = `bi ${toolMeta[targetTool].icon}`;

  if (pdfFileInput) {
    pdfFileInput.value = '';
    pdfFileInput.multiple = (targetTool === 'merge');
  }

  if (targetTool === 'scan') {
    dropZone?.classList.add('d-none');
    scannerSection?.classList.remove('d-none');
    switchScanTab('upload');
  } else {
    scannerSection?.classList.add('d-none');
    dropZone?.classList.remove('d-none');
  }
}

// Defensive reset with optional chaining to prevent uncaught null errors
function teardownActiveTool() {
  stopCamera();
  cleanupBlobUrls();
  pagesData = [];
  mergeFiles = [];
  singlePdfBuffer = null;
  scanImages = [];
  historyStack = [];
  historyIndex = -1;
  lastSelectedIdx = null;

  docMetaBadge?.classList.add('d-none');
  if (scannedPagesRow) scannedPagesRow.innerHTML = '';
  if (scanCount) scanCount.textContent = '0';
  if (finishScanBtn) finishScanBtn.disabled = true;

  if (viewContainer) viewContainer.innerHTML = '';
  controlsBar?.classList.add('d-none');
  if (controlsContent) controlsContent.innerHTML = '';
  resetBtn?.classList.add('d-none');
  if (dropTitle) dropTitle.textContent = 'Tap or Drag PDF files here';
  if (dropSubtitle) dropSubtitle.textContent = 'In-browser local processing • Zero uploads to external servers';
}

function cleanupBlobUrls() {
  pagesData.forEach(p => {
    if (p.url) URL.revokeObjectURL(p.url);
  });
}

// Global File Handlers
dropZone?.addEventListener('click', () => pdfFileInput?.click());
dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone?.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleIncomingFiles(e.dataTransfer.files);
});
pdfFileInput?.addEventListener('change', (e) => {
  if (e.target.files.length) handleIncomingFiles(e.target.files);
});

function handleIncomingFiles(files) {
  if (activeTool === 'merge') {
    mergeFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (!mergeFiles.length) return showToast('Please select valid PDF files.', 'danger');
    resetBtn?.classList.remove('d-none');
    renderMergeWorkspace();
  } else {
    const file = files[0];
    if (!file || file.type !== 'application/pdf') return showToast('Please select a valid PDF file.', 'danger');
    singlePdfName = file.name.replace(/\.[^/.]+$/, '');
    resetBtn?.classList.remove('d-none');
    loadAndRasterizePdf(file);
  }
}

/* =======================================================
   NON-BLOCKING ASYNC PDF RENDERER (LIGHTWEIGHT)
   ======================================================= */
async function loadAndRasterizePdf(file) {
  setProgress(true, 'Initializing document...', 5);
  if (viewContainer) viewContainer.innerHTML = '';
  cleanupBlobUrls();
  pagesData = [];

  try {
    singlePdfBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(singlePdfBuffer.slice(0)) }).promise;
    const totalPages = pdfDoc.numPages;

    if (docMetaBadge) {
      docMetaBadge.textContent = `${totalPages} Pages`;
      docMetaBadge.classList.remove('d-none');
    }

    // Keep memory low by standardizing thumbnails to ~220px wide
    for (let i = 1; i <= totalPages; i++) {
      const percent = Math.round((i / totalPages) * 100);
      setProgress(true, `Rendering page ${i} of ${totalPages}...`, percent);

      const page = await pdfDoc.getPage(i);
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const targetScale = 220 / unscaledViewport.width;
      const viewport = page.getViewport({ scale: targetScale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
      const url = URL.createObjectURL(blob);

      pagesData.push({
        id: `p-${i}-${Date.now()}`,
        originalIndex: i - 1,
        isCustomBlank: false,
        rotation: 0,
        canvas: canvas,
        blob: blob,
        url: url,
        selected: false
      });

      // Yield frame tick to keep UI responsive
      await new Promise(resolve => requestAnimationFrame(resolve));
    }

    historyStack = [];
    historyIndex = -1;
    pushHistory();

    renderActiveTool();
  } catch (err) {
    showToast('Failed to load PDF: ' + err.message, 'danger');
  } finally {
    setProgress(false);
  }
}

function renderActiveTool() {
  controlsBar?.classList.remove('d-none');
  if (controlsContent) controlsContent.innerHTML = '';

  if (activeTool === 'organize') renderOrganize();
  else if (activeTool === 'remove') renderRemove();
  else if (activeTool === 'extract') renderExtract();
  else if (activeTool === 'split') renderSplit();
  else if (activeTool === 'convert') renderConvert();
}

/* =======================================================
   1. ORGANIZE PDF
   ======================================================= */
function pushHistory() {
  if (historyIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIndex + 1);
  }
  const snapshot = pagesData.map(p => ({
    id: p.id,
    originalIndex: p.originalIndex,
    isCustomBlank: p.isCustomBlank || false,
    rotation: p.rotation,
    canvas: p.canvas,
    blob: p.blob,
    url: p.url,
    selected: p.selected
  }));
  historyStack.push(snapshot);
  historyIndex++;
}

window.undo = function() {
  if (historyIndex > 0) {
    historyIndex--;
    pagesData = historyStack[historyIndex].map(p => ({ ...p }));
    renderOrganize();
  }
};

window.redo = function() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    pagesData = historyStack[historyIndex].map(p => ({ ...p }));
    renderOrganize();
  }
};

window.addEventListener('keydown', (e) => {
  if (activeTool !== 'organize') return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) window.redo();
    else window.undo();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    window.redo();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    window.selectPages('all');
  } else if (e.key === 'Delete') {
    const selected = pagesData.filter(p => p.selected);
    if (selected.length > 0) window.deleteSelectedPages();
  }
});

function renderOrganize() {
  if (!controlsContent) return;
  const selectedCount = pagesData.filter(p => p.selected).length;

  controlsContent.innerHTML = `
    <div class="col-12 d-flex flex-wrap gap-2 justify-content-between align-items-center">
      <!-- Multi-Select & History Actions -->
      <div class="d-flex align-items-center gap-1 flex-wrap">
        <div class="dropdown">
          <button class="btn btn-outline-secondary btn-sm dropdown-toggle rounded-pill" type="button" data-bs-toggle="dropdown">
            <i class="bi bi-check2-square me-1"></i> Select (${selectedCount}/${pagesData.length})
          </button>
          <ul class="dropdown-menu shadow-sm">
            <li><a class="dropdown-item small" href="javascript:void(0)" onclick="selectPages('all')">Select All (Ctrl+A)</a></li>
            <li><a class="dropdown-item small" href="javascript:void(0)" onclick="selectPages('even')">Select Even Pages</a></li>
            <li><a class="dropdown-item small" href="javascript:void(0)" onclick="selectPages('odd')">Select Odd Pages</a></li>
            <li><a class="dropdown-item small" href="javascript:void(0)" onclick="selectPages('invert')">Invert Selection</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item small text-danger" href="javascript:void(0)" onclick="selectPages('none')">Deselect All</a></li>
          </ul>
        </div>

        <button class="btn btn-outline-secondary btn-sm rounded-pill" title="Undo (Ctrl+Z)" onclick="undo()" ${historyIndex <= 0 ? 'disabled' : ''}>
          <i class="bi bi-arrow-counterclockwise"></i>
        </button>
        <button class="btn btn-outline-secondary btn-sm rounded-pill" title="Redo (Ctrl+Y)" onclick="redo()" ${historyIndex >= historyStack.length - 1 ? 'disabled' : ''}>
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      </div>

      <!-- Batch Selected Operations -->
      <div class="d-flex align-items-center gap-1 flex-wrap">
        <button class="btn btn-sm btn-light border rounded-pill" title="Rotate Left" onclick="rotateSelected(-90)" ${selectedCount === 0 ? 'disabled' : ''}>
          <i class="bi bi-arrow-counterclockwise"></i> -90°
        </button>
        <button class="btn btn-sm btn-light border rounded-pill" title="Rotate Right" onclick="rotateSelected(90)" ${selectedCount === 0 ? 'disabled' : ''}>
          <i class="bi bi-arrow-clockwise"></i> +90°
        </button>
        <button class="btn btn-sm btn-outline-danger rounded-pill" title="Delete Selected" onclick="deleteSelectedPages()" ${selectedCount === 0 ? 'disabled' : ''}>
          <i class="bi bi-trash"></i> Remove (${selectedCount})
        </button>
        <button class="btn btn-sm btn-outline-primary rounded-pill" title="Extract Selected" onclick="extractSelectedPages()" ${selectedCount === 0 ? 'disabled' : ''}>
          <i class="bi bi-box-arrow-up-right"></i> Extract (${selectedCount})
        </button>
      </div>

      <!-- Compilation Actions -->
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-outline-secondary btn-sm rounded-pill" onclick="insertBlankPage()">
          <i class="bi bi-file-earmark-plus me-1"></i> Add Blank
        </button>
        <button class="btn btn-danger btn-sm rounded-pill px-3 fw-semibold shadow-sm" onclick="openStampSettingsModal()">
          <i class="bi bi-download me-1"></i> Save PDF
        </button>
      </div>
    </div>

    <!-- Zoom Slider Strip -->
    <div class="col-12 d-flex justify-content-end align-items-center gap-2 pt-2 mt-1 border-top">
      <small class="text-secondary"><i class="bi bi-zoom-out"></i></small>
      <input type="range" class="form-range" id="gridZoomSlider" min="120" max="280" value="160" style="width: 110px;" oninput="adjustZoom(this.value)">
      <small class="text-secondary"><i class="bi bi-zoom-in"></i></small>
    </div>
  `;

  const grid = document.createElement('div');
  grid.className = 'pages-grid';

  pagesData.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = `page-card ${item.selected ? 'is-selected' : ''}`;
    card.draggable = true;

    card.innerHTML = `
      <div class="card-topbar">
        <div class="form-check m-0">
          <input class="form-check-input page-checkbox" type="checkbox" ${item.selected ? 'checked' : ''} onclick="handleCheckboxClick(event, ${index})">
          <label class="form-check-label small fw-bold font-monospace ms-1 text-dark" style="font-size:0.75rem">${index + 1}</label>
        </div>
        <div class="action-btn-group d-flex gap-1">
          <button class="icon-action-btn" title="Inspect Fullscreen" onclick="previewPage(${index})"><i class="bi bi-arrows-fullscreen"></i></button>
          <button class="icon-action-btn" title="Rotate 90°" onclick="rotateSinglePage(${index}, 90)"><i class="bi bi-arrow-clockwise"></i></button>
          <button class="icon-action-btn" title="Duplicate Page" onclick="duplicatePage(${index})"><i class="bi bi-copy"></i></button>
          <button class="icon-action-btn text-danger" title="Delete Page" onclick="deleteSinglePage(${index})"><i class="bi bi-trash"></i></button>
        </div>
      </div>

      <div class="page-thumb-wrapper" onclick="toggleSelectByCard(event, ${index})">
        <img src="${item.url}" alt="Page ${index + 1}" style="transform: rotate(${item.rotation}deg); transition: transform 0.2s ease;">
      </div>

      <div class="d-flex justify-content-between align-items-center mt-2 pt-1 border-top">
        <button class="btn btn-sm btn-light border py-0 px-2" style="font-size:0.7rem" onclick="movePage(${index}, -1)" ${index === 0 ? 'disabled' : ''}><i class="bi bi-arrow-left"></i></button>
        <span class="badge bg-light text-secondary border" style="font-size:0.65rem">${item.isCustomBlank ? 'Blank' : `P${item.originalIndex + 1}`}</span>
        <button class="btn btn-sm btn-light border py-0 px-2" style="font-size:0.7rem" onclick="movePage(${index}, 1)" ${index === pagesData.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-right"></i></button>
      </div>
    `;

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', index);
      card.style.opacity = '0.4';
    });
    card.addEventListener('dragend', () => card.style.opacity = '1');
    card.addEventListener('dragover', (e) => e.preventDefault());
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const originIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (originIdx === index) return;
      const moved = pagesData.splice(originIdx, 1)[0];
      pagesData.splice(index, 0, moved);
      pushHistory();
      renderOrganize();
    });

    grid.appendChild(card);
  });

  if (viewContainer) {
    viewContainer.innerHTML = '';
    viewContainer.appendChild(grid);
  }
}

// Selection Handlers
window.toggleSelectByCard = function(event, index) {
  pagesData[index].selected = !pagesData[index].selected;
  lastSelectedIdx = index;
  renderOrganize();
};

window.handleCheckboxClick = function(event, index) {
  event.stopPropagation();
  if (event.shiftKey && lastSelectedIdx !== null) {
    const start = Math.min(lastSelectedIdx, index);
    const end = Math.max(lastSelectedIdx, index);
    const targetState = event.target.checked;
    for (let i = start; i <= end; i++) {
      pagesData[i].selected = targetState;
    }
  } else {
    pagesData[index].selected = event.target.checked;
    lastSelectedIdx = index;
  }
  renderOrganize();
};

window.selectPages = function(type) {
  pagesData.forEach((p, idx) => {
    if (type === 'all') p.selected = true;
    else if (type === 'none') p.selected = false;
    else if (type === 'even') p.selected = (idx + 1) % 2 === 0;
    else if (type === 'odd') p.selected = (idx + 1) % 2 !== 0;
    else if (type === 'invert') p.selected = !p.selected;
  });
  renderOrganize();
};

// Organize Mutators
window.rotateSinglePage = function(index, deg) {
  pagesData[index].rotation = (pagesData[index].rotation + deg) % 360;
  pushHistory();
  renderOrganize();
};

window.rotateSelected = function(deg) {
  pagesData.forEach(p => {
    if (p.selected) p.rotation = (p.rotation + deg) % 360;
  });
  pushHistory();
  renderOrganize();
};

window.duplicatePage = function(index) {
  const original = pagesData[index];
  const clone = {
    ...original,
    id: `copy-${Date.now()}-${Math.random()}`,
    selected: false
  };
  pagesData.splice(index + 1, 0, clone);
  pushHistory();
  renderOrganize();
  showToast(`Page ${index + 1} duplicated.`, 'info');
};

window.insertBlankPage = function() {
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 311;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    pagesData.push({
      id: `blank-${Date.now()}`,
      originalIndex: null,
      isCustomBlank: true,
      rotation: 0,
      canvas: canvas,
      blob: blob,
      url: url,
      selected: false
    });
    pushHistory();
    renderOrganize();
    showToast('Blank page inserted.', 'info');
  }, 'image/jpeg', 0.85);
};

window.deleteSinglePage = function(index) {
  if (pagesData.length <= 1) return showToast('The document must retain at least one page.', 'danger');
  pagesData.splice(index, 1);
  pushHistory();
  renderOrganize();
};

window.deleteSelectedPages = function() {
  const remaining = pagesData.filter(p => !p.selected);
  if (!remaining.length) return showToast('Cannot delete every page.', 'danger');
  const count = pagesData.length - remaining.length;
  pagesData = remaining;
  pushHistory();
  renderOrganize();
  showToast(`Removed ${count} pages.`, 'info');
};

window.movePage = function(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= pagesData.length) return;
  const temp = pagesData[index];
  pagesData[index] = pagesData[target];
  pagesData[target] = temp;
  pushHistory();
  renderOrganize();
};

window.adjustZoom = function(pxValue) {
  document.documentElement.style.setProperty('--card-min-width', `${pxValue}px`);
};

window.previewPage = async function(index) {
  const item = pagesData[index];
  const modalImg = document.getElementById('modalPreviewImg');
  const modalTitle = document.getElementById('previewModalTitle');
  const modalBadge = document.getElementById('previewModalBadge');

  if (modalBadge) modalBadge.textContent = `Page ${index + 1}`;
  if (modalTitle) modalTitle.textContent = item.isCustomBlank ? 'Blank Page' : `Original Page #${item.originalIndex + 1}`;

  if (item.originalIndex !== null) {
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(singlePdfBuffer.slice(0)) }).promise;
    const page = await pdfDoc.getPage(item.originalIndex + 1);
    const viewport = page.getViewport({ scale: 2.0 });
    const hiresCanvas = document.createElement('canvas');
    hiresCanvas.width = viewport.width;
    hiresCanvas.height = viewport.height;
    await page.render({ canvasContext: hiresCanvas.getContext('2d'), viewport }).promise;
    if (modalImg) modalImg.src = hiresCanvas.toDataURL('image/jpeg', 0.95);
  } else if (modalImg) {
    modalImg.src = item.url;
  }

  if (modalImg) modalImg.style.transform = `rotate(${item.rotation}deg)`;
  const modalEl = document.getElementById('previewModal');
  if (modalEl) new bootstrap.Modal(modalEl).show();
};

/* =======================================================
   CUSTOM WATERMARK & EXPORT
   ======================================================= */
window.openStampSettingsModal = function() {
  if (!pagesData.length) return showToast('No pages to compile.', 'danger');
  const modalEl = document.getElementById('stampSettingsModal');
  if (modalEl) new bootstrap.Modal(modalEl).show();
};

document.getElementById('stampWatermarkSwitch')?.addEventListener('change', (e) => {
  document.getElementById('watermarkInputBox')?.classList.toggle('d-none', !e.target.checked);
});

window.executeOrganizedSave = async function() {
  setProgress(true, 'Compiling master PDF...', 20);

  const stampPages = document.getElementById('stampPageNumbers')?.checked || false;
  const stampWatermark = document.getElementById('stampWatermarkSwitch')?.checked || false;
  const watermarkText = document.getElementById('watermarkText')?.value.trim() || 'CONFIDENTIAL';
  const watermarkOpacity = parseFloat(document.getElementById('watermarkOpacity')?.value) || 0.15;

  try {
    const srcDoc = await PDFLib.PDFDocument.load(singlePdfBuffer);
    const newDoc = await PDFLib.PDFDocument.create();
    const helveticaFont = await newDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const totalPages = pagesData.length;

    for (let i = 0; i < totalPages; i++) {
      const item = pagesData[i];
      let page;

      if (item.isCustomBlank) {
        page = newDoc.addPage([595.28, 841.89]);
      } else {
        const [copied] = await newDoc.copyPages(srcDoc, [item.originalIndex]);
        const origRot = copied.getRotation().angle;
        copied.setRotation(PDFLib.degrees((origRot + item.rotation) % 360));
        page = newDoc.addPage(copied);
      }

      const { width, height } = page.getSize();

      if (stampPages) {
        const label = `Page ${i + 1} of ${totalPages}`;
        const fontSize = 10;
        const textWidth = helveticaFont.widthOfTextAtSize(label, fontSize);
        page.drawText(label, {
          x: width - textWidth - 25,
          y: 20,
          size: fontSize,
          font: helveticaFont,
          color: PDFLib.rgb(0.4, 0.4, 0.4)
        });
      }

      if (stampWatermark) {
        const fontSize = 42;
        const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
        page.drawText(watermarkText, {
          x: (width - textWidth) / 2,
          y: height / 2,
          size: fontSize,
          font: helveticaFont,
          color: PDFLib.rgb(0.85, 0.1, 0.2),
          opacity: watermarkOpacity,
          rotate: PDFLib.degrees(45)
        });
      }

      setProgress(true, `Stamping page ${i + 1} of ${totalPages}...`, Math.round(((i + 1) / totalPages) * 100));
    }

    const bytes = await newDoc.save();
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${singlePdfName}_organized.pdf`);
    showToast('Document exported successfully!', 'success');
  } catch (err) {
    showToast('Compilation error: ' + err.message, 'danger');
  } finally {
    setProgress(false);
  }
};

window.extractSelectedPages = async function() {
  const targeted = pagesData.filter(p => p.selected);
  if (!targeted.length) return showToast('Select at least one page to extract.', 'danger');

  setProgress(true, 'Extracting selected pages...', 50);
  try {
    const srcDoc = await PDFLib.PDFDocument.load(singlePdfBuffer);
    const newDoc = await PDFLib.PDFDocument.create();

    for (const item of targeted) {
      if (item.isCustomBlank) {
        newDoc.addPage([595.28, 841.89]);
      } else {
        const [copied] = await newDoc.copyPages(srcDoc, [item.originalIndex]);
        const origRot = copied.getRotation().angle;
        copied.setRotation(PDFLib.degrees((origRot + item.rotation) % 360));
        newDoc.addPage(copied);
      }
    }

    const bytes = await newDoc.save();
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${singlePdfName}_extracted.pdf`);
    showToast(`Extracted ${targeted.length} pages.`, 'success');
  } catch (err) {
    showToast('Extraction error: ' + err.message, 'danger');
  } finally {
    setProgress(false);
  }
};

/* =======================================================
   2. MERGE PDF
   ======================================================= */
function renderMergeWorkspace() {
  controlsBar?.classList.remove('d-none');
  if (controlsContent) {
    controlsContent.innerHTML = `
      <div class="col-12 col-md-7 d-flex justify-content-between align-items-center">
        <span class="small fw-semibold text-dark">Staged Documents: <strong>${mergeFiles.length}</strong></span>
      </div>
      <div class="col-12 col-md-5 text-end">
        <button class="btn btn-danger btn-sm rounded-pill w-100 w-md-auto px-4 fw-semibold shadow-sm" id="executeMergeBtn">
          <i class="bi bi-intersect me-1"></i> Combine All
        </button>
      </div>
    `;
  }

  const mergeBtn = document.getElementById('executeMergeBtn');
  if (mergeBtn) mergeBtn.onclick = executeMerge;

  const list = document.createElement('div');
  list.className = 'merge-list';

  mergeFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'merge-item';
    item.innerHTML = `
      <div class="d-flex align-items-center gap-2 text-truncate me-2">
        <span class="badge bg-secondary rounded-pill">${index + 1}</span>
        <div class="text-truncate">
          <div class="small fw-semibold text-truncate text-dark">${file.name}</div>
          <div class="text-secondary font-monospace" style="font-size:0.75rem">${(file.size / (1024 * 1024)).toFixed(2)} MB</div>
        </div>
      </div>
      <div class="d-flex align-items-center gap-1 flex-shrink-0">
        <button class="btn btn-sm btn-light border py-1 px-2" onclick="moveMergeFile(${index}, -1)" ${index === 0 ? 'disabled' : ''}><i class="bi bi-chevron-up"></i></button>
        <button class="btn btn-sm btn-light border py-1 px-2" onclick="moveMergeFile(${index}, 1)" ${index === mergeFiles.length - 1 ? 'disabled' : ''}><i class="bi bi-chevron-down"></i></button>
        <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="removeMergeFile(${index})"><i class="bi bi-trash"></i></button>
      </div>
    `;
    list.appendChild(item);
  });

  if (viewContainer) {
    viewContainer.innerHTML = '';
    viewContainer.appendChild(list);
  }
}

window.moveMergeFile = function(index, dir) {
  const target = index + dir;
  if (target < 0 || target >= mergeFiles.length) return;
  const temp = mergeFiles[index];
  mergeFiles[index] = mergeFiles[target];
  mergeFiles[target] = temp;
  renderMergeWorkspace();
};

window.removeMergeFile = function(index) {
  mergeFiles.splice(index, 1);
  if (!mergeFiles.length) {
    if (viewContainer) viewContainer.innerHTML = '';
    controlsBar?.classList.add('d-none');
    return;
  }
  renderMergeWorkspace();
};

async function executeMerge() {
  if (mergeFiles.length < 2) return showToast('Please select at least 2 files to merge.', 'danger');
  setProgress(true, 'Merging PDF documents...', 20);

  try {
    const mergedDoc = await PDFLib.PDFDocument.create();
    for (let i = 0; i < mergeFiles.length; i++) {
      const file = mergeFiles[i];
      const buffer = await file.arrayBuffer();
      const srcDoc = await PDFLib.PDFDocument.load(buffer);
      const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach(p => mergedDoc.addPage(p));
      setProgress(true, `Merging ${file.name}...`, Math.round(((i + 1) / mergeFiles.length) * 100));
    }
    const mergedBytes = await mergedDoc.save();
    downloadBlob(new Blob([mergedBytes], { type: 'application/pdf' }), 'merged_document.pdf');
    showToast('Documents merged successfully!', 'success');
  } catch (err) {
    showToast('Merge error: ' + err.message, 'danger');
  } finally {
    setProgress(false);
  }
}

/* =======================================================
   3. DEDICATED REMOVE & EXTRACT VIEWS
   ======================================================= */
function renderRemove() {
  if (!controlsContent) return;
  controlsContent.innerHTML = `
    <div class="col-7 col-md-8"><span class="small fw-semibold text-dark">Tap pages to mark for permanent removal</span></div>
    <div class="col-5 col-md-4 text-end">
      <button class="btn btn-danger btn-sm rounded-pill px-3 fw-semibold w-100 w-md-auto" id="doRemoveBtn">
        <i class="bi bi-trash3-fill me-1"></i> Delete Marked
      </button>
    </div>
  `;
  const removeBtn = document.getElementById('doRemoveBtn');
  if (removeBtn) removeBtn.onclick = executeRemove;
  renderInteractiveGrid('remove');
}

function renderExtract() {
  if (!controlsContent) return;
  controlsContent.innerHTML = `
    <div class="col-7 col-md-8"><span class="small fw-semibold text-dark">Tap pages to bundle into new PDF</span></div>
    <div class="col-5 col-md-4 text-end">
      <button class="btn btn-primary btn-sm rounded-pill px-3 fw-semibold w-100 w-md-auto" id="doExtractBtn">
        <i class="bi bi-box-arrow-up-right me-1"></i> Extract Pages
      </button>
    </div>
  `;
  const extractBtn = document.getElementById('doExtractBtn');
  if (extractBtn) extractBtn.onclick = executeExtract;
  renderInteractiveGrid('extract');
}

function renderInteractiveGrid(mode) {
  const grid = document.createElement('div');
  grid.className = 'pages-grid';

  pagesData.forEach((item, index) => {
    const card = document.createElement('div');
    const selectedClass = item.selected ? (mode === 'remove' ? 'selected-remove' : 'selected-extract') : '';
    card.className = `page-card interactive ${selectedClass}`;

    card.innerHTML = `
      <div class="card-topbar">
        <span class="badge bg-secondary rounded-pill px-2 py-1 font-monospace" style="font-size:0.7rem">Page ${index + 1}</span>
      </div>
      <div class="page-thumb-wrapper">
        <img src="${item.url}" alt="Page ${index + 1}">
      </div>
    `;

    card.onclick = () => {
      item.selected = !item.selected;
      renderInteractiveGrid(mode);
    };

    grid.appendChild(card);
  });

  if (viewContainer) {
    viewContainer.innerHTML = '';
    viewContainer.appendChild(grid);
  }
}

async function executeRemove() {
  const kept = pagesData.filter(p => !p.selected);
  if (!kept.length) return showToast('Cannot delete every page.', 'danger');
  setProgress(true, 'Trimming pages...', 50);

  try {
    const srcDoc = await PDFLib.PDFDocument.load(singlePdfBuffer);
    const newDoc = await PDFLib.PDFDocument.create();
    const copied = await newDoc.copyPages(srcDoc, kept.map(p => p.originalIndex));
    copied.forEach(p => newDoc.addPage(p));
    const bytes = await newDoc.save();
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${singlePdfName}_trimmed.pdf`);
    showToast('Unselected pages deleted.', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'danger');
  } finally {
    setProgress(false);
  }
}

async function executeExtract() {
  const targeted = pagesData.filter(p => p.selected);
  if (!targeted.length) return showToast('Please select at least one page.', 'danger');
  setProgress(true, 'Extracting pages...', 50);

  try {
    const srcDoc = await PDFLib.PDFDocument.load(singlePdfBuffer);
    const newDoc = await PDFLib.PDFDocument.create();
    const copied = await newDoc.copyPages(srcDoc, targeted.map(p => p.originalIndex));
    copied.forEach(p => newDoc.addPage(p));
    const bytes = await newDoc.save();
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${singlePdfName}_extracted.pdf`);
    showToast('Pages extracted into document.', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'danger');
  } finally {
    setProgress(false);
  }
}

/* =======================================================
   4. SPLIT PDF
   ======================================================= */
function renderSplit() {
  if (!controlsContent) return;
  controlsContent.innerHTML = `
    <div class="col-12 col-md-6 mb-2 mb-md-0">
      <input type="text" class="form-control form-control-sm" id="splitInput" placeholder="Range e.g. 1-3, 5, 8-10">
    </div>
    <div class="col-12 col-md-6 d-flex gap-2 justify-content-end">
      <button class="btn btn-outline-danger btn-sm rounded-pill flex-fill" id="splitAllBtn">Split All to ZIP</button>
      <button class="btn btn-danger btn-sm rounded-pill flex-fill" id="splitRangeBtn">Extract Range</button>
    </div>
  `;

  document.getElementById('splitRangeBtn').onclick = executeSplitRange;
  document.getElementById('splitAllBtn').onclick = executeSplitAll;

  const grid = document.createElement('div');
  grid.className = 'pages-grid';

  pagesData.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'page-card';
    card.innerHTML = `
      <div class="card-topbar">
        <span class="badge bg-secondary rounded-pill px-2 py-1 font-monospace" style="font-size:0.7rem">Page ${index + 1}</span>
      </div>
      <div class="page-thumb-wrapper">
        <img src="${item.url}" alt="Page ${index + 1}">
      </div>
    `;
    grid.appendChild(card);
  });

  if (viewContainer) {
    viewContainer.innerHTML = '';
    viewContainer.appendChild(grid);
  }
}

async function executeSplitRange() {
  const rangeStr = document.getElementById('splitInput')?.value.trim();
  if (!rangeStr) return showToast('Enter a page range.', 'danger');

  const pageNumbers = parsePageRange(rangeStr, pagesData.length);
  if (!pageNumbers.length) return showToast('Invalid range specified.', 'danger');

  setProgress(true, 'Extracting range...', 50);
  try {
    const srcDoc = await PDFLib.PDFDocument.load(singlePdfBuffer);
    const newDoc = await PDFLib.PDFDocument.create();
    const copied = await newDoc.copyPages(srcDoc, pageNumbers.map(n => n - 1));
    copied.forEach(p => newDoc.addPage(p));
    const bytes = await newDoc.save();
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${singlePdfName}_range.pdf`);
    showToast('Range extracted.', 'success');
  } catch (err) {
    showToast('Split error: ' + err.message, 'danger');
  } finally {
    setProgress(false);
  }
}

async function executeSplitAll() {
  setProgress(true, 'Archiving all individual pages...', 10);
  try {
    const srcDoc = await PDFLib.PDFDocument.load(singlePdfBuffer);
    const zip = new JSZip();
    const total = srcDoc.getPageCount();

    for (let i = 0; i < total; i++) {
      const singleDoc = await PDFLib.PDFDocument.create();
      const [copied] = await singleDoc.copyPages(srcDoc, [i]);
      singleDoc.addPage(copied);
      const bytes = await singleDoc.save();
      zip.file(`${singlePdfName}_page_${i + 1}.pdf`, bytes);
      setProgress(true, `Splitting page ${i + 1} of ${total}...`, Math.round(((i + 1) / total) * 100));
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `${singlePdfName}_split_pages.zip`);
    showToast('All pages split into ZIP!', 'success');
  } catch (err) {
    showToast('Split error: ' + err.message, 'danger');
  } finally {
    setProgress(false);
  }
}

function parsePageRange(str, maxPages) {
  const pages = new Set();
  const parts = str.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number);
      if (start && end) {
        for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) pages.add(i);
      }
    } else {
      const n = Number(trimmed);
      if (n >= 1 && n <= maxPages) pages.add(n);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

/* =======================================================
   5. SCAN TO PDF
   ======================================================= */
tabUploadMode?.addEventListener('click', () => switchScanTab('upload'));
tabCameraMode?.addEventListener('click', () => switchScanTab('camera'));

function switchScanTab(tab) {
  if (tab === 'upload') {
    tabUploadMode?.classList.add('active');
    tabCameraMode?.classList.remove('active');
    imageUploadBox?.classList.remove('d-none');
    cameraBox?.classList.add('d-none');
    stopCamera();
  } else {
    tabCameraMode?.classList.add('active');
    tabUploadMode?.classList.remove('active');
    cameraBox?.classList.remove('d-none');
    imageUploadBox?.classList.add('d-none');
    startCamera();
  }
}

async function startCamera() {
  if (mediaStream) return;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    if (cameraVideo) cameraVideo.srcObject = mediaStream;
  } catch (err) {
    showToast('Camera permission denied or unsupported: ' + err.message, 'danger');
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
}

snapBtn?.addEventListener('click', () => {
  if (!mediaStream) return;
  cameraCaptureCanvas.width = cameraVideo.videoWidth || 640;
  cameraCaptureCanvas.height = cameraVideo.videoHeight || 480;
  const ctx = cameraCaptureCanvas.getContext('2d');
  ctx.drawImage(cameraVideo, 0, 0);

  const dataUrl = cameraCaptureCanvas.toDataURL('image/jpeg', 0.92);
  addScannedPage(dataUrl);
});

imageDropZone?.addEventListener('click', () => imageFileInput?.click());
imageFileInput?.addEventListener('change', (e) => {
  if (e.target.files.length) {
    Array.from(e.target.files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => addScannedPage(ev.target.result);
      reader.readAsDataURL(file);
    });
  }
});

function addScannedPage(dataUrl) {
  scanImages.push(dataUrl);
  rebuildScannedStrip();
}

window.removeScannedPage = function(index) {
  scanImages.splice(index, 1);
  rebuildScannedStrip();
};

function rebuildScannedStrip() {
  if (!scannedPagesRow) return;
  scannedPagesRow.innerHTML = '';
  scanImages.forEach((dataUrl, idx) => {
    const itemWrapper = document.createElement('div');
    itemWrapper.className = 'scanned-item';
    itemWrapper.innerHTML = `
      <img src="${dataUrl}" class="scanned-thumb" alt="Page ${idx + 1}">
      <button class="scanned-remove-btn" onclick="removeScannedPage(${idx})">✕</button>
    `;
    scannedPagesRow.appendChild(itemWrapper);
  });

  if (scanCount) scanCount.textContent = scanImages.length;
  if (finishScanBtn) finishScanBtn.disabled = (scanImages.length === 0);
}

finishScanBtn?.addEventListener('click', async () => {
  if (!scanImages.length) return;
  setProgress(true, 'Compiling scanned pages into A4 document...', 10);

  try {
    const pdfDoc = await PDFLib.PDFDocument.create();
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;

    for (let i = 0; i < scanImages.length; i++) {
      const dataUrl = scanImages[i];
      const imgBytes = await fetch(dataUrl).then(r => r.arrayBuffer());
      const embeddedImg = dataUrl.startsWith('data:image/png')
        ? await pdfDoc.embedPng(imgBytes)
        : await pdfDoc.embedJpg(imgBytes);

      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      const imgRatio = embeddedImg.width / embeddedImg.height;
      const pageRatio = A4_WIDTH / A4_HEIGHT;
      let renderWidth, renderHeight;

      if (imgRatio > pageRatio) {
        renderWidth = A4_WIDTH - 40;
        renderHeight = renderWidth / imgRatio;
      } else {
        renderHeight = A4_HEIGHT - 40;
        renderWidth = renderHeight * imgRatio;
      }

      const xOffset = (A4_WIDTH - renderWidth) / 2;
      const yOffset = (A4_HEIGHT - renderHeight) / 2;

      page.drawImage(embeddedImg, {
        x: xOffset,
        y: yOffset,
        width: renderWidth,
        height: renderHeight
      });

      setProgress(true, `Processing page ${i + 1} of ${scanImages.length}...`, Math.round(((i + 1) / scanImages.length) * 100));
    }

    const pdfBytes = await pdfDoc.save();
    downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), 'scanned_document.pdf');
    scanImages = [];
    rebuildScannedStrip();
    showToast('Scanned pages compiled successfully!', 'success');
  } catch (err) {
    showToast('Compilation error: ' + err.message, 'danger');
  } finally {
    setProgress(false);
  }
});

/* =======================================================
   6. PDF TO IMAGE CONVERTER
   ======================================================= */
function renderConvert() {
  if (!controlsContent) return;
  controlsContent.innerHTML = `
    <div class="col-12 col-md-5 mb-2 mb-md-0">
      <div class="form-check form-switch mb-1">
        <input class="form-check-input" type="checkbox" id="compressSwitch">
        <label class="form-check-label small fw-semibold text-dark" for="compressSwitch">Compress JPG Mode</label>
      </div>
      <small class="text-secondary d-block" id="convertModeDesc" style="font-size:0.75rem">100% Lossless PNG</small>
    </div>
    <div class="col-7 col-md-4">
      <div id="sliderWrap" class="d-none">
        <input type="range" class="form-range" id="convertQuality" min="0.1" max="0.95" step="0.05" value="0.85">
      </div>
    </div>
    <div class="col-5 col-md-3 text-end">
      <button class="btn btn-danger btn-sm rounded-pill px-3 fw-semibold w-100 shadow-sm" id="downloadZipBtn">
        <i class="bi bi-file-earmark-zip me-1"></i> Download ZIP
      </button>
    </div>
  `;

  const compressSwitch = document.getElementById('compressSwitch');
  const sliderWrap = document.getElementById('sliderWrap');
  const convertModeDesc = document.getElementById('convertModeDesc');
  const convertQuality = document.getElementById('convertQuality');
  const downloadZipBtn = document.getElementById('downloadZipBtn');

  if (compressSwitch) {
    compressSwitch.onchange = () => {
      sliderWrap?.classList.toggle('d-none', !compressSwitch.checked);
      if (convertModeDesc) convertModeDesc.textContent = compressSwitch.checked ? 'Active: Compressed JPEG' : '100% Lossless PNG';
      renderConvertCards();
    };
  }

  if (convertQuality) {
    convertQuality.oninput = () => {
      renderConvertCards();
    };
  }

  if (downloadZipBtn) {
    downloadZipBtn.onclick = async () => {
      setProgress(true, 'Packaging ZIP archive...', 10);
      const zip = new JSZip();
      const isComp = compressSwitch?.checked || false;
      const mime = isComp ? 'image/jpeg' : 'image/png';
      const ext = isComp ? 'jpg' : 'png';
      const q = isComp ? parseFloat(convertQuality.value) : 1.0;

      for (let i = 0; i < pagesData.length; i++) {
        const blob = await new Promise(r => pagesData[i].canvas.toBlob(r, mime, q));
        zip.file(`${singlePdfName}_p${i + 1}.${ext}`, blob);
        setProgress(true, `Packaging page ${i + 1} of ${pagesData.length}...`, Math.round(((i + 1) / pagesData.length) * 100));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `${singlePdfName}_images.zip`);
      setProgress(false);
      showToast('Images archived into ZIP!', 'success');
    };
  }

  renderConvertCards();
}

function renderConvertCards() {
  const isComp = document.getElementById('compressSwitch')?.checked;
  const mime = isComp ? 'image/jpeg' : 'image/png';
  const ext = isComp ? 'jpg' : 'png';
  const q = isComp ? parseFloat(document.getElementById('convertQuality')?.value || 0.85) : 1.0;

  const grid = document.createElement('div');
  grid.className = 'pages-grid';

  pagesData.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'page-card';

    card.innerHTML = `
      <div class="card-topbar">
        <span class="badge bg-secondary rounded-pill px-2 py-1 font-monospace" style="font-size:0.7rem">P${index + 1}</span>
        <span class="badge bg-light text-secondary border" id="size-${item.id}" style="font-size:0.65rem">...</span>
      </div>
      <div class="page-thumb-wrapper">
        <img id="img-${item.id}" src="${item.url}" alt="Page ${index + 1}">
      </div>
      <div class="d-flex justify-content-between align-items-center mt-2 gap-1">
        <button class="btn btn-light border btn-sm py-1 px-2 flex-fill" style="font-size:0.7rem" onclick="copyImage(${index}, this)">
          <i class="bi bi-clipboard"></i> Copy
        </button>
        <a id="dl-${item.id}" class="btn btn-outline-danger btn-sm py-1 px-2 flex-fill text-center" style="font-size:0.7rem" download="${singlePdfName}_p${index + 1}.${ext}">
          <i class="bi bi-download"></i> Save
        </a>
      </div>
    `;

    item.canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const img = card.querySelector(`#img-${item.id}`);
      const dl = card.querySelector(`#dl-${item.id}`);
      const sz = card.querySelector(`#size-${item.id}`);

      if (img) img.src = url;
      if (dl) dl.href = url;
      if (sz) sz.textContent = `${(blob.size / 1024).toFixed(0)} KB`;
    }, mime, q);

    grid.appendChild(card);
  });

  if (viewContainer) {
    viewContainer.innerHTML = '';
    viewContainer.appendChild(grid);
  }
}

window.copyImage = async function(index, btn) {
  try {
    const blob = await new Promise(r => pagesData[index].canvas.toBlob(r, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    const old = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check2"></i> Copied';
    btn.className = 'btn btn-success btn-sm py-1 px-2 flex-fill';
    setTimeout(() => {
      btn.innerHTML = old;
      btn.className = 'btn btn-light border btn-sm py-1 px-2 flex-fill';
    }, 1500);
  } catch {
    showToast('Clipboard access requires HTTPS or localhost.', 'danger');
  }
};

/* =======================================================
   SHARED UTILITIES
   ======================================================= */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function setProgress(visible, text = '', percent = 0) {
  loadingStatus?.classList.toggle('d-none', !visible);
  if (loadingText) loadingText.textContent = text;
  if (loadingPercent) loadingPercent.textContent = `${percent}%`;
  if (loadingProgressBar) loadingProgressBar.style.width = `${percent}%`;
}

resetBtn?.addEventListener('click', teardownActiveTool);