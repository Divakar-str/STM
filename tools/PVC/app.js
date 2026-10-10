/**
 * ID CARD COPY TOOL — JAVASCRIPT ENGINE
 * Features:
 * 1. DPI quality selection (300 DPI, 400 DPI, 600 DPI)
 * 2. Real file names with individual remove button
 * 3. Batch Select (Front, Back, All) & Batch Crop/Flip/Rotate/Reset
 * 4. Whole-image zoom lightbox (no small lens)
 * 5. 1-click clipboard copy to PhotoScape
 */

// PDF.js fallback for file:// protocol
if (window.location.protocol === 'file:') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
} else {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// App State
const AppState = {
  docs: [], // [{ docId, fileName, dpi, front: { id, type, originalCanvas, currentCanvas, selected }, back: ... }]
  activeDpi: 400,
  // Zoom Modal State
  activeZoomCard: null,
  zoomScale: 1.0,
  panX: 0,
  panY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0
};

// UI Selectors
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const filesList = document.getElementById('filesList');
const emptyState = document.getElementById('emptyState');
const fileCounter = document.getElementById('fileCounter');
const selectedCountBadge = document.getElementById('selectedCountBadge');
const zoomModal = document.getElementById('zoomModal');
const zoomCanvas = document.getElementById('zoomCanvas');
const zoomCanvasWrapper = document.getElementById('zoomCanvasWrapper');
const modalBody = document.getElementById('modalBody');

/* ================= UPLOAD HANDLING ================= */
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  handleUploadedFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', (e) => handleUploadedFiles(e.target.files));

function changeDpi(val) {
  AppState.activeDpi = parseInt(val, 10) || 400;
  showToast(`DPI set to ${AppState.activeDpi}. Uploaded files will render at this quality.`);
}

async function handleUploadedFiles(fileList) {
  const incoming = Array.from(fileList).filter((f) => f.type === 'application/pdf');
  if (incoming.length === 0) {
    showToast('Please select valid PDF files.');
    return;
  }

  const freeSlots = 5 - AppState.docs.length;
  if (freeSlots <= 0) {
    showToast('Max 5 files reached. Remove a file first.');
    return;
  }

  const toProcess = incoming.slice(0, freeSlots);
  for (const file of toProcess) {
    await processPdfDocument(file);
  }

  updateWorkspaceUI();
  fileInput.value = '';
}

/* ================= HIGH-DPI PDF RENDERER ================= */
async function processPdfDocument(file) {
  try {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

    // PDF point standard: 72 points per inch
    // Scale = DPI / 72 (e.g., 400 DPI => scale = 400/72 ≈ 5.55)
    const renderScale = AppState.activeDpi / 72;

    const docEntry = {
      docId: docId,
      fileName: file.name,
      dpi: AppState.activeDpi,
      front: null,
      back: null
    };

    // Render Front Side (Page 1)
    if (pdf.numPages >= 1) {
      const page1 = await pdf.getPage(1);
      const vp1 = page1.getViewport({ scale: renderScale });
      const c1 = document.createElement('canvas');
      c1.width = vp1.width; c1.height = vp1.height;
      await page1.render({ canvasContext: c1.getContext('2d', { willReadFrequently: true }), viewport: vp1 }).promise;

      docEntry.front = {
        id: `${docId}_front`,
        type: 'Front',
        dpi: AppState.activeDpi,
        docName: file.name,
        originalCanvas: cloneCanvas(c1),
        currentCanvas: c1,
        selected: false // Not selected at first
      };
    }

    // Render Back Side (Page 2)
    if (pdf.numPages >= 2) {
      const page2 = await pdf.getPage(2);
      const vp2 = page2.getViewport({ scale: renderScale });
      const c2 = document.createElement('canvas');
      c2.width = vp2.width; c2.height = vp2.height;
      await page2.render({ canvasContext: c2.getContext('2d', { willReadFrequently: true }), viewport: vp2 }).promise;

      docEntry.back = {
        id: `${docId}_back`,
        type: 'Back',
        dpi: AppState.activeDpi,
        docName: file.name,
        originalCanvas: cloneCanvas(c2),
        currentCanvas: c2,
        selected: false // Not selected at first
      };
    }

    AppState.docs.push(docEntry);
  } catch (err) {
    console.error(err);
    showToast(`Could not read "${file.name}"`);
  }
}

/* ================= RENDER WORKSPACE ================= */
function updateWorkspaceUI() {
  filesList.innerHTML = '';
  const total = AppState.docs.length;

  fileCounter.innerText = `${total} / 5 Files`;
  emptyState.style.display = total === 0 ? 'block' : 'none';

  AppState.docs.forEach((doc, idx) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'file-row';
    rowEl.id = `row_${doc.docId}`;

    rowEl.innerHTML = `
      <div class="file-row-header">
        <div class="file-name-title">
          <span class="file-num-badge">File 0${idx + 1}</span>
          <span>${escapeHtml(doc.fileName)}</span>
        </div>
        <button class="btn-remove-file" onclick="removeSingleDoc('${doc.docId}')" title="Remove this file">
          ✕ Remove File
        </button>
      </div>
      <div class="file-sides-split" id="split_${doc.docId}"></div>
    `;

    filesList.appendChild(rowEl);
    const split = rowEl.querySelector(`#split_${doc.docId}`);

    if (doc.front) split.appendChild(buildCardUnit(doc.front));
    if (doc.back) split.appendChild(buildCardUnit(doc.back));
  });

  updateSelectedCount();
}

function buildCardUnit(card) {
  const isFront = card.type === 'Front';
  const unit = document.createElement('div');
  unit.className = `card-unit ${isFront ? 'front' : 'back'} ${card.selected ? 'selected' : ''}`;
  unit.id = `unit_${card.id}`;

  unit.innerHTML = `
    <div class="card-header-bar">
      <label class="card-select-label" onclick="toggleCardSelect('${card.id}', event)">
        <input type="checkbox" class="card-checkbox" ${card.selected ? 'checked' : ''} />
        <span class="side-label ${isFront ? 'front' : 'back'}">${card.type} Side</span>
      </label>
      <span class="status-badge ${card.selected ? 'selected' : 'unselected'}" id="badge_${card.id}">
        ${card.selected ? '✓ SELECTED' : 'NOT SELECTED'}
      </span>
    </div>

    <div class="card-body-row">
      <!-- Click whole canvas to open whole image zoom -->
      <div class="canvas-viewport" id="viewport_${card.id}" onclick="openZoomModal('${card.id}')" title="Click to view whole image zoomed">
        <span class="zoom-hint-tag">🔍 Click to Zoom</span>
      </div>

      <!-- Vertical Action Buttons on the Side -->
      <div class="side-buttons">
        <button class="btn btn-card-copy" id="btn_copy_${card.id}" onclick="copySingleCard('${card.id}')" title="Copy to PhotoScape">
          📋 Copy
        </button>
        <button class="btn btn-outline" onclick="openZoomModal('${card.id}')" title="Zoom Whole Image">
          🔍 Zoom
        </button>
        <button class="btn btn-outline" onclick="autoCropCard('${card.id}')" title="Cut White Border">
          ✂️ Crop
        </button>
        <button class="btn btn-outline" onclick="flipCard('${card.id}', 'H')" title="Flip Left-Right">
          ↔️ Flip
        </button>
        <button class="btn btn-outline" onclick="rotateCard('${card.id}', 90)" title="Turn 90 degrees">
          🔄 Turn
        </button>
        <button class="btn btn-outline" onclick="resetCard('${card.id}')" title="Reset to original">
          ↩️ Reset
        </button>
      </div>
    </div>

    <div class="card-meta-bar">
      <span id="dim_${card.id}">${card.currentCanvas.width} × ${card.currentCanvas.height} px</span>
      <span>${card.dpi} DPI</span>
    </div>
  `;

  const vp = unit.querySelector(`#viewport_${card.id}`);
  vp.appendChild(card.currentCanvas);

  return unit;
}

/* ================= SELECTION LOGIC ================= */
function toggleCardSelect(cardId, e) {
  if (e.target.tagName !== 'INPUT') e.preventDefault();

  const card = findCard(cardId);
  if (!card) return;

  card.selected = !card.selected;
  refreshCardSelectVisual(card);
  updateSelectedCount();
}

function selectByType(type, selectVal) {
  getAllCards().forEach((card) => {
    if (card.type === type) {
      card.selected = selectVal;
      refreshCardSelectVisual(card);
    }
  });
  updateSelectedCount();
}

function selectAll(selectVal) {
  getAllCards().forEach((card) => {
    card.selected = selectVal;
    refreshCardSelectVisual(card);
  });
  updateSelectedCount();
}

function refreshCardSelectVisual(card) {
  const unit = document.getElementById(`unit_${card.id}`);
  if (!unit) return;

  const checkbox = unit.querySelector('.card-checkbox');
  const badge = document.getElementById(`badge_${card.id}`);

  if (card.selected) {
    unit.classList.add('selected');
    checkbox.checked = true;
    badge.className = 'status-badge selected';
    badge.innerText = '✓ SELECTED';
  } else {
    unit.classList.remove('selected');
    checkbox.checked = false;
    badge.className = 'status-badge unselected';
    badge.innerText = 'NOT SELECTED';
  }
}

function updateSelectedCount() {
  const count = getAllCards().filter((c) => c.selected).length;
  selectedCountBadge.innerText = `${count} Selected`;
}

/* ================= 1-CLICK CLIPBOARD COPY (PHOTOSCAPE) ================= */
async function copySingleCard(cardId) {
  const card = findCard(cardId);
  if (!card) return;

  const btn = document.getElementById(`btn_copy_${cardId}`);
  await writeCanvasToClipboard(card.currentCanvas, btn, 'Copied! Press Ctrl + V in PhotoScape.');
}

async function writeCanvasToClipboard(canvas, triggerBtn, successMsg) {
  try {
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);

        if (triggerBtn) {
          const oldText = triggerBtn.innerHTML;
          triggerBtn.classList.add('copied');
          triggerBtn.innerHTML = '✓ Copied!';
          setTimeout(() => {
            triggerBtn.classList.remove('copied');
            triggerBtn.innerHTML = oldText;
          }, 1800);
        }

        showToast(successMsg);
      } catch (err) {
        // Fallback save to download if clipboard blocked
        const a = document.createElement('a');
        a.download = 'dl_card.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
        showToast('Saved image to downloads.');
      }
    }, 'image/png', 1.0);
  } catch (err) {
    console.error(err);
    showToast('Clipboard error occurred.');
  }
}

/* ================= WHOLE IMAGE ZOOM MODAL (NO LENS) ================= */
function openZoomModal(cardId) {
  const card = findCard(cardId);
  if (!card) return;

  AppState.activeZoomCard = card;
  AppState.zoomScale = 1.0;
  AppState.panX = 0;
  AppState.panY = 0;

  document.getElementById('modalCardTitle').innerText = `${card.docName} — ${card.type} Side`;
  document.getElementById('modalDpiBadge').innerText = `${card.dpi} DPI • ${card.currentCanvas.width} × ${card.currentCanvas.height} px`;

  // Draw onto modal canvas
  zoomCanvas.width = card.currentCanvas.width;
  zoomCanvas.height = card.currentCanvas.height;
  const ctx = zoomCanvas.getContext('2d');
  ctx.drawImage(card.currentCanvas, 0, 0);

  // Fit initially
  resetZoomScale();

  zoomModal.classList.remove('hidden');
}

function closeZoomModal() {
  zoomModal.classList.add('hidden');
  AppState.activeZoomCard = null;
}

function zoomImageChange(delta) {
  AppState.zoomScale = Math.max(0.2, Math.min(4.0, AppState.zoomScale + delta));
  applyZoomTransform();
}

function resetZoomScale() {
  if (!AppState.activeZoomCard) return;

  const bodyRect = modalBody.getBoundingClientRect();
  const cardW = AppState.activeZoomCard.currentCanvas.width;
  const cardH = AppState.activeZoomCard.currentCanvas.height;

  // Compute best fit scale
  const scaleW = (bodyRect.width - 60) / cardW;
  const scaleH = (bodyRect.height - 60) / cardH;
  AppState.zoomScale = Math.min(scaleW, scaleH, 1.0);

  AppState.panX = 0;
  AppState.panY = 0;
  applyZoomTransform();
}

function applyZoomTransform() {
  zoomCanvasWrapper.style.transform = `translate(${AppState.panX}px, ${AppState.panY}px) scale(${AppState.zoomScale})`;
}

// Drag to pan in modal
modalBody.addEventListener('mousedown', (e) => {
  AppState.isDragging = true;
  AppState.dragStartX = e.clientX - AppState.panX;
  AppState.dragStartY = e.clientY - AppState.panY;
});

window.addEventListener('mousemove', (e) => {
  if (!AppState.isDragging) return;
  AppState.panX = e.clientX - AppState.dragStartX;
  AppState.panY = e.clientY - AppState.dragStartY;
  applyZoomTransform();
});

window.addEventListener('mouseup', () => {
  AppState.isDragging = false;
});

// Mouse wheel zoom in modal
modalBody.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 0.15 : -0.15;
  zoomImageChange(delta);
}, { passive: false });

async function copyFromModal() {
  if (!AppState.activeZoomCard) return;
  const btn = document.getElementById('modalCopyBtn');
  await writeCanvasToClipboard(AppState.activeZoomCard.currentCanvas, btn, 'Copied! Press Ctrl + V in PhotoScape.');
}

/* ================= BATCH OPERATIONS ON SELECTED ================= */
function getSelectedCards() {
  return getAllCards().filter((c) => c.selected);
}

function batchCropSelected() {
  const list = getSelectedCards();
  if (list.length === 0) return showToast('Please select cards first.');
  list.forEach((c) => autoCropCard(c.id));
}

function batchFlipSelected(dir) {
  const list = getSelectedCards();
  if (list.length === 0) return showToast('Please select cards first.');
  list.forEach((c) => flipCard(c.id, dir));
}

function batchRotateSelected(deg) {
  const list = getSelectedCards();
  if (list.length === 0) return showToast('Please select cards first.');
  list.forEach((c) => rotateCard(c.id, deg));
}

function batchResetSelected() {
  const list = getSelectedCards();
  if (list.length === 0) return showToast('Please select cards first.');
  list.forEach((c) => resetCard(c.id));
}

/* ================= LOSSLESS AUTO-CROP, FLIP, ROTATE, RESET ================= */
function autoCropCard(cardId) {
  const card = findCard(cardId);
  if (!card) return;

  const src = card.currentCanvas;
  const w = src.width;
  const h = src.height;
  const ctx = src.getContext('2d', { willReadFrequently: true });
  const data = ctx.getImageData(0, 0, w, h).data;

  // Sample perimeter border color
  let bgR = 0, bgG = 0, bgB = 0, count = 0;
  for (let x = 0; x < w; x += 10) {
    let t = x * 4;
    let b = ((h - 1) * w + x) * 4;
    bgR += data[t] + data[b];
    bgG += data[t + 1] + data[b + 1];
    bgB += data[t + 2] + data[b + 2];
    count += 2;
  }
  bgR /= count; bgG /= count; bgB /= count;

  const tol = 26;
  function isContent(x, y) {
    const i = (y * w + x) * 4;
    return Math.sqrt((data[i] - bgR)**2 + (data[i+1] - bgG)**2 + (data[i+2] - bgB)**2) > tol;
  }

  let minX = w, minY = h, maxX = 0, maxY = 0;
  const step = 4;

  topL: for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (isContent(x, y)) { minY = Math.max(0, y - 6); break topL; }
    }
  }
  botL: for (let y = h - 1; y >= 0; y -= step) {
    for (let x = 0; x < w; x += step) {
      if (isContent(x, y)) { maxY = Math.min(h, y + 6); break botL; }
    }
  }
  leftL: for (let x = 0; x < w; x += step) {
    for (let y = minY; y <= maxY; y += step) {
      if (isContent(x, y)) { minX = Math.max(0, x - 6); break leftL; }
    }
  }
  rightL: for (let x = w - 1; x >= 0; x -= step) {
    for (let y = minY; y <= maxY; y += step) {
      if (isContent(x, y)) { maxX = Math.min(w, x + 6); break rightL; }
    }
  }

  const cropW = maxX - minX;
  const cropH = maxY - minY;

  if (cropW < 140 || cropH < 140) {
    showToast('Card border not clear enough to crop.');
    return;
  }

  const cropped = document.createElement('canvas');
  cropped.width = cropW;
  cropped.height = cropH;
  cropped.getContext('2d').drawImage(src, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  card.currentCanvas = cropped;
  refreshCardDOM(card);
  showToast(`Cut Border: ${cropW} × ${cropH} px`);
}

function flipCard(cardId, dir) {
  const card = findCard(cardId);
  if (!card) return;

  const src = card.currentCanvas;
  const flipped = document.createElement('canvas');
  flipped.width = src.width;
  flipped.height = src.height;
  const ctx = flipped.getContext('2d');

  ctx.save();
  if (dir === 'H') {
    ctx.translate(src.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, src.height);
    ctx.scale(1, -1);
  }
  ctx.drawImage(src, 0, 0);
  ctx.restore();

  card.currentCanvas = flipped;
  refreshCardDOM(card);
}

function rotateCard(cardId, deg) {
  const card = findCard(cardId);
  if (!card) return;

  const src = card.currentCanvas;
  const rotated = document.createElement('canvas');
  rotated.width = src.height;
  rotated.height = src.width;

  const ctx = rotated.getContext('2d');
  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);

  card.currentCanvas = rotated;
  refreshCardDOM(card);
}

function resetCard(cardId) {
  const card = findCard(cardId);
  if (!card) return;

  card.currentCanvas = cloneCanvas(card.originalCanvas);
  refreshCardDOM(card);
  showToast('Card reset back to original.');
}

function refreshCardDOM(card) {
  const vp = document.getElementById(`viewport_${card.id}`);
  if (vp) {
    const existing = vp.querySelector('canvas');
    if (existing) existing.remove();
    vp.appendChild(card.currentCanvas);
  }
  const dim = document.getElementById(`dim_${card.id}`);
  if (dim) dim.innerText = `${card.currentCanvas.width} × ${card.currentCanvas.height} px`;
}

/* ================= HELPERS ================= */
function getAllCards() {
  const res = [];
  AppState.docs.forEach((d) => {
    if (d.front) res.push(d.front);
    if (d.back) res.push(d.back);
  });
  return res;
}

function findCard(id) {
  return getAllCards().find((c) => c.id === id);
}

function cloneCanvas(src) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

function removeSingleDoc(docId) {
  AppState.docs = AppState.docs.filter((d) => d.docId !== docId);
  updateWorkspaceUI();
  showToast('File removed.');
}

function clearAllWorkspace() {
  AppState.docs = [];
  updateWorkspaceUI();
  showToast('All files removed.');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}