pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Selectors
const toolButtons = document.querySelectorAll('.tool-btn');
const workspaceHeading = document.getElementById('workspaceHeading');
const workspaceSubheading = document.getElementById('workspaceSubheading');
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
const viewContainer = document.getElementById('viewContainer');

// Scan to PDF Elements
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

// Isolated State Caches
let activeTool = 'organize';
let mediaStream = null;
let mergeFiles = [];
let singlePdfBuffer = null;
let singlePdfName = 'document';
let pagesData = [];
let scanImages = [];

const toolMeta = {
  organize: { title: 'Organize PDF', desc: 'Drag cards or tap buttons to reorder, rotate, and delete.', icon: 'bi-grid-fill' },
  merge: { title: 'Merge PDF', desc: 'Select or drop multiple PDF files to combine into one.', icon: 'bi-arrows-angle-contract' },
  split: { title: 'Split PDF', desc: 'Split a PDF into page ranges or extract each page as its own document.', icon: 'bi-arrows-angle-expand' },
  remove: { title: 'Remove Pages', desc: 'Tap the pages you wish to delete from the document.', icon: 'bi-x-lg' },
  extract: { title: 'Extract Pages', desc: 'Tap specific pages to extract them into a brand-new PDF.', icon: 'bi-box-arrow-up-right' },
  scan: { title: 'Scan to PDF', desc: 'Upload photos or capture with camera to compile a PDF.', icon: 'bi-camera-viewfinder' },
  convert: { title: 'PDF to Image Converter', desc: 'Export all or individual pages as crisp PNG or compressed JPEG.', icon: 'bi-images' }
};

// Router
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
  workspaceHeading.textContent = toolMeta[targetTool].title;
  workspaceSubheading.textContent = toolMeta[targetTool].desc;
  dropIcon.className = `bi ${toolMeta[targetTool].icon}`;

  pdfFileInput.value = '';
  pdfFileInput.multiple = (targetTool === 'merge');

  if (targetTool === 'scan') {
    dropZone.classList.add('d-none');
    scannerSection.classList.remove('d-none');
    switchScanTab('upload'); // Priority 1: Upload is default
  } else {
    scannerSection.classList.add('d-none');
    dropZone.classList.remove('d-none');
  }
}

function teardownActiveTool() {
  stopCamera();
  cleanupBlobUrls();
  pagesData = [];
  mergeFiles = [];
  singlePdfBuffer = null;
  scanImages = [];

  scannedPagesRow.innerHTML = '';
  scanCount.textContent = '0';
  finishScanBtn.disabled = true;

  viewContainer.innerHTML = '';
  controlsBar.classList.add('d-none');
  controlsContent.innerHTML = '';
  resetBtn.classList.add('d-none');
  dropTitle.textContent = 'Tap or Drag PDF here';
  dropSubtitle.textContent = 'In-browser processing • No uploads to external servers';
}

function cleanupBlobUrls() {
  pagesData.forEach(p => {
    if (p.url) URL.revokeObjectURL(p.url);
  });
}

// Global File Drop Handlers
dropZone.addEventListener('click', () => pdfFileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleIncomingFiles(e.dataTransfer.files);
});
pdfFileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleIncomingFiles(e.target.files);
});

function handleIncomingFiles(files) {
  if (activeTool === 'merge') {
    mergeFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (!mergeFiles.length) return alert('Please choose valid PDF files.');
    resetBtn.classList.remove('d-none');
    renderMergeWorkspace();
  } else {
    const file = files[0];
    if (!file || file.type !== 'application/pdf') return alert('Please choose a valid PDF file.');
    singlePdfName = file.name.replace(/\.[^/.]+$/, '');
    resetBtn.classList.remove('d-none');
    loadAndRasterizePdf(file);
  }
}

// Mobile-Optimized Vector Renderer
async function loadAndRasterizePdf(file) {
  setLoading(true, 'Rendering document pages...');
  viewContainer.innerHTML = '';
  cleanupBlobUrls();
  pagesData = [];

  try {
    singlePdfBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(singlePdfBuffer.slice(0)) }).promise;

    // Use responsive vector scale: 1.5x on mobile to save memory; 2.0x on desktop
    const dynamicScale = window.innerWidth < 768 ? 1.5 : 2.0;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      setLoading(true, `Rendering page ${i}/${pdfDoc.numPages}...`);
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: dynamicScale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      const url = URL.createObjectURL(blob);

      pagesData.push({
        id: `page-${i}-${Date.now()}`,
        originalIndex: i - 1,
        rotation: 0,
        canvas: canvas,
        blob: blob,
        url: url,
        selected: false
      });
    }

    renderActiveTool();
  } catch (err) {
    alert('Failed to read PDF: ' + err.message);
  } finally {
    setLoading(false);
  }
}

function renderActiveTool() {
  controlsBar.classList.remove('d-none');
  controlsContent.innerHTML = '';

  if (activeTool === 'organize') renderOrganize();
  else if (activeTool === 'remove') renderRemove();
  else if (activeTool === 'extract') renderExtract();
  else if (activeTool === 'split') renderSplit();
  else if (activeTool === 'convert') renderConvert();
}

/* =======================================================
   1. MERGE PDF (MOBILE ENHANCED)
======================================================= */
function renderMergeWorkspace() {
  controlsBar.classList.remove('d-none');
  controlsContent.innerHTML = `
    <div class="col-12 col-md-7 d-flex justify-content-between align-items-center">
      <span class="small fw-semibold">Files: <strong>${mergeFiles.length}</strong></span>
    </div>
    <div class="col-12 col-md-5 text-end">
      <button class="btn btn-danger btn-sm rounded-pill w-100 w-md-auto px-4 fw-semibold" id="executeMergeBtn">
        <i class="bi bi-file-earmark-plus me-1"></i> Merge All Files
      </button>
    </div>
  `;

  document.getElementById('executeMergeBtn').onclick = executeMerge;

  const list = document.createElement('div');
  list.className = 'merge-list';

  mergeFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'merge-item';

    item.innerHTML = `
      <div class="d-flex align-items-center gap-2 text-truncate me-2">
        <span class="badge bg-secondary rounded-pill">${index + 1}</span>
        <div class="text-truncate">
          <div class="text-dark small fw-semibold text-truncate">${file.name}</div>
          <div class="text-muted" style="font-size:0.75rem">${(file.size / (1024 * 1024)).toFixed(2)} MB</div>
        </div>
      </div>
      <div class="d-flex align-items-center gap-1 flex-shrink-0">
        <button class="btn btn-sm btn-light py-1 px-2 border" onclick="moveMergeFile(${index}, -1)" ${index === 0 ? 'disabled' : ''}><i class="bi bi-chevron-up"></i></button>
        <button class="btn btn-sm btn-light py-1 px-2 border" onclick="moveMergeFile(${index}, 1)" ${index === mergeFiles.length - 1 ? 'disabled' : ''}><i class="bi bi-chevron-down"></i></button>
        <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="removeMergeFile(${index})"><i class="bi bi-trash"></i></button>
      </div>
    `;

    list.appendChild(item);
  });

  viewContainer.innerHTML = '';
  viewContainer.appendChild(list);
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
    viewContainer.innerHTML = '';
    controlsBar.classList.add('d-none');
    return;
  }
  renderMergeWorkspace();
};

async function executeMerge() {
  if (mergeFiles.length < 2) return alert('Please select at least 2 files to merge.');
  setLoading(true, 'Merging PDF files...');

  try {
    const mergedDoc = await PDFLib.PDFDocument.create();
    for (const file of mergeFiles) {
      const buffer = await file.arrayBuffer();
      const srcDoc = await PDFLib.PDFDocument.load(buffer);
      const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach(p => mergedDoc.addPage(p));
    }
    const mergedBytes = await mergedDoc.save();
    downloadBlob(new Blob([mergedBytes], { type: 'application/pdf' }), 'merged_document.pdf');
  } catch (err) {
    alert('Merge error: ' + err.message);
  } finally {
    setLoading(false);
  }
}

/* =======================================================
   2. ORGANIZE PDF (TOUCH CONTROLS + FALLBACK BUTTONS)
======================================================= */
function renderOrganize() {
  controlsContent.innerHTML = `
    <div class="col-7 col-md-8">
      <span class="small fw-semibold">Pages: <strong>${pagesData.length}</strong></span>
    </div>
    <div class="col-5 col-md-4 text-end">
      <button class="btn btn-danger btn-sm rounded-pill px-3 px-md-4 fw-semibold w-100 w-md-auto" id="saveOrganizedBtn">
        <i class="bi bi-save me-1"></i> Save PDF
      </button>
    </div>
  `;
  document.getElementById('saveOrganizedBtn').onclick = saveOrganizedPdf;

  const grid = document.createElement('div');
  grid.className = 'pages-grid';

  pagesData.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'page-card';
    card.draggable = true;

    card.innerHTML = `
      <div class="card-topbar">
        <span class="badge bg-dark rounded-pill px-2 py-1" style="font-size:0.7rem">P${index + 1}</span>
        <div class="action-btn-group">
          <button class="icon-action-btn" title="Rotate" onclick="rotatePage(${index}, 90)"><i class="bi bi-arrow-clockwise"></i></button>
          <button class="icon-action-btn text-danger" title="Delete" onclick="deletePage(${index})"><i class="bi bi-trash"></i></button>
        </div>
      </div>
      <div class="page-thumb-wrapper">
        <img src="${item.url}" alt="Page ${index + 1}">
      </div>
      <!-- Touch-friendly position buttons -->
      <div class="mobile-reorder-bar">
        <button class="mobile-reorder-btn" onclick="movePage(${index}, -1)" ${index === 0 ? 'disabled' : ''}><i class="bi bi-arrow-left"></i> Move</button>
        <button class="mobile-reorder-btn" onclick="movePage(${index}, 1)" ${index === pagesData.length - 1 ? 'disabled' : ''}>Move <i class="bi bi-arrow-right"></i></button>
      </div>
    `;

    // Desktop Drag handling
    card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', index); });
    card.addEventListener('dragover', (e) => { e.preventDefault(); });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const originIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const moved = pagesData.splice(originIdx, 1)[0];
      pagesData.splice(index, 0, moved);
      renderOrganize();
    });

    grid.appendChild(card);
  });

  viewContainer.innerHTML = '';
  viewContainer.appendChild(grid);
}

window.movePage = function(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= pagesData.length) return;
  const temp = pagesData[index];
  pagesData[index] = pagesData[target];
  pagesData[target] = temp;
  renderOrganize();
};

window.rotatePage = async function(index, degrees) {
  const item = pagesData[index];
  const rotated = document.createElement('canvas');
  const angleRad = (degrees * Math.PI) / 180;

  if (Math.abs(degrees) === 90 || Math.abs(degrees) === 270) {
    rotated.width = item.canvas.height;
    rotated.height = item.canvas.width;
  } else {
    rotated.width = item.canvas.width;
    rotated.height = item.canvas.height;
  }

  const ctx = rotated.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, rotated.width, rotated.height);
  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate(angleRad);
  ctx.drawImage(item.canvas, -item.canvas.width / 2, -item.canvas.height / 2);

  item.canvas = rotated;
  item.rotation = (item.rotation + degrees) % 360;

  const blob = await new Promise(r => rotated.toBlob(r, 'image/png'));
  URL.revokeObjectURL(item.url);
  item.blob = blob;
  item.url = URL.createObjectURL(blob);

  renderOrganize();
};

window.deletePage = function(index) {
  if (pagesData.length <= 1) return alert('The document must have at least one page.');
  URL.revokeObjectURL(pagesData[index].url);
  pagesData.splice(index, 1);
  renderOrganize();
};

async function saveOrganizedPdf() {
  setLoading(true, 'Compiling organized PDF...');
  try {
    const srcDoc = await PDFLib.PDFDocument.load(singlePdfBuffer);
    const newDoc = await PDFLib.PDFDocument.create();

    const copiedPages = await newDoc.copyPages(srcDoc, pagesData.map(p => p.originalIndex));
    copiedPages.forEach((page, i) => {
      const origRot = page.getRotation().angle;
      page.setRotation(PDFLib.degrees((origRot + pagesData[i].rotation) % 360));
      newDoc.addPage(page);
    });

    const bytes = await newDoc.save();
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${singlePdfName}_organized.pdf`);
  } catch (err) {
    alert('Error saving PDF: ' + err.message);
  } finally {
    setLoading(false);
  }
}

/* =======================================================
   3. REMOVE & EXTRACT
======================================================= */
function renderRemove() {
  controlsContent.innerHTML = `
    <div class="col-7 col-md-8"><span class="small fw-semibold">Tap pages to remove</span></div>
    <div class="col-5 col-md-4 text-end">
      <button class="btn btn-danger btn-sm rounded-pill px-3 fw-semibold w-100 w-md-auto" id="doRemoveBtn">
        <i class="bi bi-trash me-1"></i> Remove
      </button>
    </div>
  `;
  document.getElementById('doRemoveBtn').onclick = executeRemove;
  renderInteractiveGrid('remove');
}

function renderExtract() {
  controlsContent.innerHTML = `
    <div class="col-7 col-md-8"><span class="small fw-semibold">Tap pages to extract</span></div>
    <div class="col-5 col-md-4 text-end">
      <button class="btn btn-danger btn-sm rounded-pill px-3 fw-semibold w-100 w-md-auto" id="doExtractBtn">
        <i class="bi bi-box-arrow-up-right me-1"></i> Extract
      </button>
    </div>
  `;
  document.getElementById('doExtractBtn').onclick = executeExtract;
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
        <span class="badge bg-dark rounded-pill px-2 py-1" style="font-size:0.7rem">Page ${index + 1}</span>
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

  viewContainer.innerHTML = '';
  viewContainer.appendChild(grid);
}

async function executeRemove() {
  const kept = pagesData.filter(p => !p.selected);
  if (!kept.length) return alert('You cannot delete every page.');
  setLoading(true, 'Trimming pages...');

  try {
    const srcDoc = await PDFLib.PDFDocument.load(singlePdfBuffer);
    const newDoc = await PDFLib.PDFDocument.create();
    const copied = await newDoc.copyPages(srcDoc, kept.map(p => p.originalIndex));
    copied.forEach(p => newDoc.addPage(p));
    const bytes = await newDoc.save();
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${singlePdfName}_trimmed.pdf`);
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    setLoading(false);
  }
}

async function executeExtract() {
  const targeted = pagesData.filter(p => p.selected);
  if (!targeted.length) return alert('Select at least one page.');
  setLoading(true, 'Extracting pages...');

  try {
    const srcDoc = await PDFLib.PDFDocument.load(singlePdfBuffer);
    const newDoc = await PDFLib.PDFDocument.create();
    const copied = await newDoc.copyPages(srcDoc, targeted.map(p => p.originalIndex));
    copied.forEach(p => newDoc.addPage(p));
    const bytes = await newDoc.save();
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${singlePdfName}_extracted.pdf`);
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    setLoading(false);
  }
}

/* =======================================================
   4. SPLIT PDF
======================================================= */
function renderSplit() {
  controlsContent.innerHTML = `
    <div class="col-12 col-md-6 mb-2 mb-md-0">
      <input type="text" class="form-control form-control-sm" id="splitInput" placeholder="Range e.g. 1-2, 4">
    </div>
    <div class="col-12 col-md-6 d-flex gap-2 justify-content-end">
      <button class="btn btn-outline-danger btn-sm rounded-pill flex-fill" id="splitAllBtn">Split All</button>
      <button class="btn btn-danger btn-sm rounded-pill flex-fill" id="splitRangeBtn">Extract</button>
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
        <span class="badge bg-dark rounded-pill px-2 py-1" style="font-size:0.7rem">Page ${index + 1}</span>
      </div>
      <div class="page-thumb-wrapper">
        <img src="${item.url}" alt="Page ${index + 1}">
      </div>
    `;
    grid.appendChild(card);
  });

  viewContainer.innerHTML = '';
  viewContainer.appendChild(grid);
}

async function executeSplitRange() {
  const rangeStr = document.getElementById('splitInput').value.trim();
  if (!rangeStr) return alert('Enter a page range.');

  const pageNumbers = parsePageRange(rangeStr, pagesData.length);
  if (!pageNumbers.length) return alert('Invalid range.');

  setLoading(true, 'Extracting range...');
  try {
    const srcDoc = await PDFLib.PDFDocument.load(singlePdfBuffer);
    const newDoc = await PDFLib.PDFDocument.create();
    const copied = await newDoc.copyPages(srcDoc, pageNumbers.map(n => n - 1));
    copied.forEach(p => newDoc.addPage(p));
    const bytes = await newDoc.save();
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${singlePdfName}_range.pdf`);
  } catch (err) {
    alert('Split error: ' + err.message);
  } finally {
    setLoading(false);
  }
}

async function executeSplitAll() {
  setLoading(true, 'Packaging every page...');
  try {
    const srcDoc = await PDFLib.PDFDocument.load(singlePdfBuffer);
    const zip = new JSZip();

    for (let i = 0; i < srcDoc.getPageCount(); i++) {
      const singleDoc = await PDFLib.PDFDocument.create();
      const [copied] = await singleDoc.copyPages(srcDoc, [i]);
      singleDoc.addPage(copied);
      const bytes = await singleDoc.save();
      zip.file(`${singlePdfName}_page_${i + 1}.pdf`, bytes);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `${singlePdfName}_split_pages.zip`);
  } catch (err) {
    alert('Split error: ' + err.message);
  } finally {
    setLoading(false);
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
   5. SCAN TO PDF (UPLOAD FIRST PRIORITY + CAMERA)
======================================================= */
tabUploadMode.addEventListener('click', () => switchScanTab('upload'));
tabCameraMode.addEventListener('click', () => switchScanTab('camera'));

function switchScanTab(tab) {
  if (tab === 'upload') {
    tabUploadMode.classList.add('active');
    tabCameraMode.classList.remove('active');
    imageUploadBox.classList.remove('d-none');
    cameraBox.classList.add('d-none');
    stopCamera(); // Keep camera hardware completely off
  } else {
    tabCameraMode.classList.add('active');
    tabUploadMode.classList.remove('active');
    cameraBox.classList.remove('d-none');
    imageUploadBox.classList.add('d-none');
    startCamera(); // Only turn on camera when user requests it
  }
}

async function startCamera() {
  if (mediaStream) return;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    cameraVideo.srcObject = mediaStream;
  } catch (err) {
    alert('Camera permission denied or not supported on this browser: ' + err.message);
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
}

snapBtn.addEventListener('click', () => {
  if (!mediaStream) return;
  cameraCaptureCanvas.width = cameraVideo.videoWidth || 640;
  cameraCaptureCanvas.height = cameraVideo.videoHeight || 480;
  const ctx = cameraCaptureCanvas.getContext('2d');
  ctx.drawImage(cameraVideo, 0, 0);

  const dataUrl = cameraCaptureCanvas.toDataURL('image/jpeg', 0.92);
  addScannedPage(dataUrl);
});

imageDropZone.addEventListener('click', () => imageFileInput.click());
imageFileInput.addEventListener('change', (e) => {
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

  scanCount.textContent = scanImages.length;
  finishScanBtn.disabled = (scanImages.length === 0);
}

finishScanBtn.addEventListener('click', async () => {
  if (!scanImages.length) return;
  setLoading(true, 'Compiling to PDF...');

  try {
    const pdfDoc = await PDFLib.PDFDocument.create();

    // Standard A4 dimensions (595.28 x 841.89 points)
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;

    for (const dataUrl of scanImages) {
      const imgBytes = await fetch(dataUrl).then(r => r.arrayBuffer());
      const embeddedImg = dataUrl.startsWith('data:image/png')
        ? await pdfDoc.embedPng(imgBytes)
        : await pdfDoc.embedJpg(imgBytes);

      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      
      // Compute aspect ratio fit into A4 page bounds
      const imgRatio = embeddedImg.width / embeddedImg.height;
      const pageRatio = A4_WIDTH / A4_HEIGHT;
      let renderWidth, renderHeight;

      if (imgRatio > pageRatio) {
        renderWidth = A4_WIDTH - 40; // 20pt padding
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
    }

    const pdfBytes = await pdfDoc.save();
    downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), 'scanned_document.pdf');

    scanImages = [];
    rebuildScannedStrip();
  } catch (err) {
    alert('Error compiling scanned pages: ' + err.message);
  } finally {
    setLoading(false);
  }
});

/* =======================================================
   6. PDF TO IMAGE CONVERTER
======================================================= */
function renderConvert() {
  controlsContent.innerHTML = `
    <div class="col-12 col-md-5 mb-2 mb-md-0">
      <div class="form-check form-switch mb-1">
        <input class="form-check-input" type="checkbox" id="compressSwitch">
        <label class="form-check-label small fw-semibold" for="compressSwitch">Compress JPEG</label>
      </div>
      <small class="text-muted d-block" id="convertModeDesc" style="font-size:0.75rem">100% Lossless PNG</small>
    </div>
    <div class="col-7 col-md-4">
      <div id="sliderWrap" class="d-none">
        <input type="range" class="form-range" id="convertQuality" min="0.1" max="0.95" step="0.05" value="0.85">
      </div>
    </div>
    <div class="col-5 col-md-3 text-end">
      <button class="btn btn-danger btn-sm rounded-pill px-3 fw-semibold w-100" id="downloadZipBtn">
        <i class="bi bi-file-earmark-zip me-1"></i> ZIP
      </button>
    </div>
  `;

  const compressSwitch = document.getElementById('compressSwitch');
  const sliderWrap = document.getElementById('sliderWrap');
  const convertModeDesc = document.getElementById('convertModeDesc');
  const convertQuality = document.getElementById('convertQuality');
  const downloadZipBtn = document.getElementById('downloadZipBtn');

  compressSwitch.onchange = () => {
    sliderWrap.classList.toggle('d-none', !compressSwitch.checked);
    convertModeDesc.textContent = compressSwitch.checked ? 'Active: Compressed JPEG' : '100% Lossless PNG';
    renderConvertCards();
  };

  convertQuality.oninput = () => {
    renderConvertCards();
  };

  downloadZipBtn.onclick = async () => {
    setLoading(true, 'Packaging ZIP archive...');
    const zip = new JSZip();
    const isComp = compressSwitch.checked;
    const mime = isComp ? 'image/jpeg' : 'image/png';
    const ext = isComp ? 'jpg' : 'png';
    const q = isComp ? parseFloat(convertQuality.value) : 1.0;

    for (let i = 0; i < pagesData.length; i++) {
      const blob = await new Promise(r => pagesData[i].canvas.toBlob(r, mime, q));
      zip.file(`${singlePdfName}_p${i + 1}.${ext}`, blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `${singlePdfName}_images.zip`);
    setLoading(false);
  };

  renderConvertCards();
}

function renderConvertCards() {
  const isComp = document.getElementById('compressSwitch')?.checked;
  const mime = isComp ? 'image/jpeg' : 'image/png';
  const ext = isComp ? 'jpg' : 'png';
  const q = isComp ? parseFloat(document.getElementById('convertQuality').value) : 1.0;

  const grid = document.createElement('div');
  grid.className = 'pages-grid';

  pagesData.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'page-card';

    card.innerHTML = `
      <div class="card-topbar">
        <span class="badge bg-dark rounded-pill px-2 py-1" style="font-size:0.7rem">P${index + 1}</span>
        <span class="badge bg-light text-dark border" id="size-${item.id}" style="font-size:0.65rem">...</span>
      </div>
      <div class="page-thumb-wrapper">
        <img id="img-${item.id}" src="${item.url}" alt="Page ${index + 1}">
      </div>
      <div class="d-flex justify-content-between align-items-center mt-2 gap-1">
        <button class="btn btn-outline-secondary btn-sm py-1 px-2 flex-fill" style="font-size:0.7rem" onclick="copyImage(${index}, this)">
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

      img.src = url;
      dl.href = url;
      sz.textContent = `${(blob.size / 1024).toFixed(0)} KB`;
    }, mime, q);

    grid.appendChild(card);
  });

  viewContainer.innerHTML = '';
  viewContainer.appendChild(grid);
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
      btn.className = 'btn btn-outline-secondary btn-sm py-1 px-2 flex-fill';
    }, 1500);
  } catch {
    alert('Copy requires HTTPS connection.');
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

function setLoading(visible, text = '') {
  loadingStatus.classList.toggle('d-none', !visible);
  loadingText.textContent = text;
}

resetBtn.addEventListener('click', teardownActiveTool);