/**
 * DL PVC Duplex Print Studio Engine
 * Production Logic: Multi-slot batch ingest, white-strip correction,
 * duplex mirroring, 3D card inspection, pan/drag viewport, and print dispatch.
 */ 
 pdfjsLib.GlobalWorkerOptions.workerSrc =
   'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; 

const TOTAL_SLOTS = 5; 
const RENDER_DPI_SCALE = 3.5; 

// System Defaults for instant reset (Mild Fill: 101.7%)
const DEFAULTS = {
   stretchPercent: 101.7,
   shiftY: 0.0,
   gap: '1.5mm',
   bleed: '0.5mm',
   guideColor: '#94a3b8',
   backShiftX: 0.0,
   backShiftY: 0.0
}; 

// Data store for DL 1..5 
const slotsData = Array.from({ length: TOTAL_SLOTS }, (_, i) => ({
   id: i + 1,
   loaded: false,
   fileName: '',
   frontDataUrl: null,
   backDataUrl: null
})); 

let currentZoom = 0.65; 

// DOM Elements 
const grid1 = document.getElementById('grid1'); 
const grid2 = document.getElementById('grid2'); 
const slotList = document.getElementById('slotList'); 
const sheetsWrapper = document.getElementById('sheetsWrapper'); 
const stageViewport = document.getElementById('stageViewport');
const zoomLevelText = document.getElementById('zoomLevel'); 
const loadedCountBadge = document.getElementById('loadedCountBadge'); 

// 3D Inspector Elements 
const inspectModal = document.getElementById('inspectModal'); 
const card3d = document.getElementById('card3d'); 
const inspectCardSelect = document.getElementById('inspectCardSelect'); 
const img3dFront = document.getElementById('img3dFront'); 
const img3dBack = document.getElementById('img3dBack'); 
const emptyFrontState = document.getElementById('emptyFrontState'); 
const emptyBackState = document.getElementById('emptyBackState'); 

/* ==========================================================================
   Initialization
   ========================================================================== */ 

function initializeApp() {
   buildGrids();
   buildSlotList();
   bindControls();
   bindInspection();
   bindPanAndDrag();
} 

/**
 * Creates 5-Row x 2-Column layout labeled DL 1 to DL 5
 * Sheet 1 (Front View): Left: Front 1..5 | Right: Back 1..5
 * Sheet 2 (Back View):  Left: Front 1..5 | Right: Back 1..5
 */ 
function buildGrids() {
   grid1.innerHTML = '';
   grid2.innerHTML = ''; 

   for (let i = 1; i <= TOTAL_SLOTS; i++) {
     grid1.appendChild(createCell(`s1-front-${i}`, `DL ${i} FRONT`, 'canvas-front'));
     grid1.appendChild(createCell(`s1-back-${i}`, `DL ${i} BACK`, 'canvas-back')); 

     grid2.appendChild(createCell(`s2-front-${i}`, `DL ${i} FRONT`, 'canvas-front'));
     grid2.appendChild(createCell(`s2-back-${i}`, `DL ${i} BACK`, 'canvas-back'));
   }
} 

function createCell(idPrefix, label, canvasClass) {
   const cell = document.createElement('div');
   cell.className = 'card-cell';
   cell.id = `cell-${idPrefix}`; 

   const placeholder = document.createElement('span');
   placeholder.className = 'card-placeholder';
   placeholder.textContent = label; 

   const canvas = document.createElement('canvas');
   canvas.id = `canv-${idPrefix}`;
   canvas.className = canvasClass; 

   cell.appendChild(placeholder);
   cell.appendChild(canvas);
   return cell;
} 

function buildSlotList() {
   slotList.innerHTML = '';
   let loadedCount = 0; 

   slotsData.forEach((slot) => {
     if (slot.loaded) loadedCount++;
     const item = document.createElement('div');
     item.className = `slot-item ${slot.loaded ? 'loaded' : ''}`;
     item.innerHTML = `
       <div class="slot-left-info">
         <span class="slot-tag">DL ${slot.id}</span>
         <span class="slot-file-text">${slot.loaded ? slot.fileName : 'Empty'}</span>
       </div>
       <div>
         ${slot.loaded ? `<button class="btn-slot-remove" onclick="clearSlot(${slot.id})" title="Remove">✕</button>` : ''}
       </div>
     `;
     slotList.appendChild(item);
   }); 

   loadedCountBadge.textContent = `${loadedCount} / ${TOTAL_SLOTS} Loaded`;
} 

/* ==========================================================================
   Preview Stage Mouse Pan & Drag Interaction
   ========================================================================== */ 

function bindPanAndDrag() {
   let isDown = false;
   let startX, startY, scrollLeft, scrollTop;

   stageViewport.addEventListener('mousedown', (e) => {
     // Only trigger drag panning if clicking directly on the viewport background or spacing
     if (e.target !== stageViewport && e.target !== sheetsWrapper) return;
     isDown = true;
     stageViewport.classList.add('is-dragging');
     startX = e.pageX - stageViewport.offsetLeft;
     startY = e.pageY - stageViewport.offsetTop;
     scrollLeft = stageViewport.scrollLeft;
     scrollTop = stageViewport.scrollTop;
   });

   stageViewport.addEventListener('mouseleave', () => {
     isDown = false;
     stageViewport.classList.remove('is-dragging');
   });

   stageViewport.addEventListener('mouseup', () => {
     isDown = false;
     stageViewport.classList.remove('is-dragging');
   });

   stageViewport.addEventListener('mousemove', (e) => {
     if (!isDown) return;
     e.preventDefault();
     const x = e.pageX - stageViewport.offsetLeft;
     const y = e.pageY - stageViewport.offsetTop;
     const walkX = (x - startX) * 1.5;
     const walkY = (y - startY) * 1.5;
     stageViewport.scrollLeft = scrollLeft - walkX;
     stageViewport.scrollTop = scrollTop - walkY;
   });
}

/* ==========================================================================
   Controls Binding & Default Resets
   ========================================================================== */ 

function bindControls() {
   const fileInput = document.getElementById('batchFileInput');
   fileInput.addEventListener('change', handleBatchFiles); 

   const dropzone = document.getElementById('dropzone');
   dropzone.addEventListener('dragover', (e) => {
     e.preventDefault();
     dropzone.style.borderColor = 'var(--accent)';
   });
   dropzone.addEventListener('dragleave', () => {
     dropzone.style.borderColor = 'var(--border-subtle)';
   });
   dropzone.addEventListener('drop', (e) => {
     e.preventDefault();
     dropzone.style.borderColor = 'var(--border-subtle)';
     if (e.dataTransfer.files.length > 0) {
       processFiles(Array.from(e.dataTransfer.files));
     }
   }); 

   const rngStretch = document.getElementById('rngStretch');
   const lblStretch = document.getElementById('lblStretch');
   const rngShiftY = document.getElementById('rngShiftY');
   const lblShiftY = document.getElementById('lblShiftY');
   const stretchPreset = document.getElementById('stretchPreset'); 

   rngStretch.addEventListener('input', (e) => {
     const val = parseFloat(e.target.value);
     lblStretch.textContent = `${val.toFixed(1)}%`;
     document.documentElement.style.setProperty('--front-scale-y', (val / 100).toString());
   }); 

   rngShiftY.addEventListener('input', (e) => {
     const val = parseFloat(e.target.value);
     lblShiftY.textContent = `${val.toFixed(1)} mm`;
     document.documentElement.style.setProperty('--front-shift-y', `${val}mm`);
   }); 

   stretchPreset.addEventListener('change', (e) => {
     const val = parseFloat(e.target.value);
     rngStretch.value = (val * 100).toFixed(1);
     lblStretch.textContent = `${rngStretch.value}%`;
     document.documentElement.style.setProperty('--front-scale-y', val.toString());
   }); 

   document.getElementById('btnResetBleed').addEventListener('click', () => {
     rngStretch.value = DEFAULTS.stretchPercent.toFixed(1);
     lblStretch.textContent = `${DEFAULTS.stretchPercent.toFixed(1)}%`;
     rngShiftY.value = DEFAULTS.shiftY;
     lblShiftY.textContent = `${DEFAULTS.shiftY.toFixed(1)} mm`;
     stretchPreset.value = '1.017'; 

     document.documentElement.style.setProperty('--front-scale-y', (DEFAULTS.stretchPercent / 100).toString());
     document.documentElement.style.setProperty('--front-shift-y', `${DEFAULTS.shiftY}mm`);
   }); 

   const selGap = document.getElementById('selGap');
   const selBleed = document.getElementById('selBleed');
   const inpShiftX = document.getElementById('inpShiftX');
   const inpShiftYBack = document.getElementById('inpShiftYBack');
   const selGuides = document.getElementById('selGuides'); 

   selGap.addEventListener('change', (e) => document.documentElement.style.setProperty('--cut-gap', e.target.value));
   selBleed.addEventListener('change', (e) => document.documentElement.style.setProperty('--safe-bleed', e.target.value));
   selGuides.addEventListener('change', (e) => document.documentElement.style.setProperty('--guide-color', e.target.value));
   inpShiftX.addEventListener('input', (e) => document.documentElement.style.setProperty('--back-x-shift', `${e.target.value || 0}mm`));
   inpShiftYBack.addEventListener('input', (e) => document.documentElement.style.setProperty('--back-y-shift', `${e.target.value || 0}mm`)); 

   document.getElementById('btnResetCalib').addEventListener('click', () => {
     selGap.value = DEFAULTS.gap;
     selBleed.value = DEFAULTS.bleed;
     selGuides.value = DEFAULTS.guideColor;
     inpShiftX.value = DEFAULTS.backShiftX.toFixed(1);
     inpShiftYBack.value = DEFAULTS.backShiftY.toFixed(1); 

     document.documentElement.style.setProperty('--cut-gap', DEFAULTS.gap);
     document.documentElement.style.setProperty('--safe-bleed', DEFAULTS.bleed);
     document.documentElement.style.setProperty('--guide-color', DEFAULTS.guideColor);
     document.documentElement.style.setProperty('--back-x-shift', `${DEFAULTS.backShiftX}mm`);
     document.documentElement.style.setProperty('--back-y-shift', `${DEFAULTS.backShiftY}mm`);
   }); 

   document.getElementById('btnPrint').addEventListener('click', () => {
     const sheet1 = document.getElementById('sheet1');
     const sheet2 = document.getElementById('sheet2'); 

     const prevDisplay1 = sheet1.style.display;
     const prevDisplay2 = sheet2.style.display;
     sheet1.style.display = 'flex';
     sheet2.style.display = 'flex'; 

     window.print(); 

     setTimeout(() => {
       sheet1.style.display = prevDisplay1;
       sheet2.style.display = prevDisplay2;
     }, 500);
   }); 

   document.getElementById('btnResetAll').addEventListener('click', resetAllSlots); 

   document.querySelectorAll('.tab-pill').forEach((btn) => {
     btn.addEventListener('click', (e) => {
       document.querySelectorAll('.tab-pill').forEach((b) => b.classList.remove('active'));
       e.target.classList.add('active');
       const view = e.target.dataset.view;
       if (view === 'front') {
         document.getElementById('sheet1').style.display = 'flex';
         document.getElementById('sheet2').style.display = 'none';
       } else if (view === 'back') {
         document.getElementById('sheet1').style.display = 'none';
         document.getElementById('sheet2').style.display = 'flex';
       } else {
         document.getElementById('sheet1').style.display = 'flex';
         document.getElementById('sheet2').style.display = 'flex';
       }
     });
   }); 

   document.getElementById('btnZoomIn').addEventListener('click', () => setZoom(currentZoom + 0.1));
   document.getElementById('btnZoomOut').addEventListener('click', () => setZoom(currentZoom - 0.1));
   document.getElementById('btnZoomFit').addEventListener('click', () => setZoom(0.65));
} 

function setZoom(val) {
   currentZoom = Math.min(Math.max(val, 0.3), 1.2);
   sheetsWrapper.style.transform = `scale(${currentZoom})`;
   zoomLevelText.textContent = `${Math.round(currentZoom * 100)}%`;
} 

/* ==========================================================================
   File Ingestion & High-Res Rendering
   ========================================================================== */ 

async function handleBatchFiles(e) {
   const files = Array.from(e.target.files);
   if (files.length === 0) return;
   await processFiles(files);
   e.target.value = '';
} 

async function processFiles(files) {
   const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
   for (let i = 0; i < pdfFiles.length && i < TOTAL_SLOTS; i++) {
     await loadSinglePDF(pdfFiles[i], i + 1);
   }
} 

async function loadSinglePDF(file, slotIndex) {
   try {
     const arrayBuffer = await file.arrayBuffer();
     const pdfDoc = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise; 

     if (pdfDoc.numPages < 2) {
       alert(`"${file.name}" must contain at least 2 pages (Front & Back).`);
       return;
     } 

     const page1 = await pdfDoc.getPage(1);
     const page2 = await pdfDoc.getPage(2); 

     const frontDataUrl = await renderPageToCanvas(page1, `canv-s1-front-${slotIndex}`);
     const backDataUrl = await renderPageToCanvas(page2, `canv-s1-back-${slotIndex}`); 

     await renderPageToCanvas(page1, `canv-s2-front-${slotIndex}`);
     await renderPageToCanvas(page2, `canv-s2-back-${slotIndex}`); 

     slotsData[slotIndex - 1] = {
       id: slotIndex,
       loaded: true,
       fileName: file.name,
       frontDataUrl,
       backDataUrl
     };
     buildSlotList();
     update3DPreview();
   } catch (err) {
     console.error(`Error loading DL ${slotIndex}:`, err);
     alert(`Could not render "${file.name}": ` + err.message);
   }
} 

async function renderPageToCanvas(page, canvasId) {
   const canvas = document.getElementById(canvasId);
   if (!canvas) return null; 

   const ctx = canvas.getContext('2d');
   const viewport = page.getViewport({ scale: RENDER_DPI_SCALE }); 

   canvas.width = viewport.width;
   canvas.height = viewport.height; 

   await page.render({ canvasContext: ctx, viewport: viewport }).promise; 

   canvas.style.display = 'block';
   const ph = canvas.parentElement.querySelector('.card-placeholder');
   if (ph) ph.style.display = 'none'; 

   return canvas.toDataURL('image/png');
} 

function clearSlot(slotIndex) {
   slotsData[slotIndex - 1] = {
     id: slotIndex,
     loaded: false,
     fileName: '',
     frontDataUrl: null,
     backDataUrl: null
   }; 

   const canvasIds = [
     `canv-s1-front-${slotIndex}`,
     `canv-s1-back-${slotIndex}`,
     `canv-s2-front-${slotIndex}`,
     `canv-s2-back-${slotIndex}`
   ]; 

   canvasIds.forEach((id) => {
     const c = document.getElementById(id);
     if (c) {
       const ctx = c.getContext('2d');
       ctx.clearRect(0, 0, c.width, c.height);
       c.style.display = 'none';
       const ph = c.parentElement.querySelector('.card-placeholder');
       if (ph) ph.style.display = 'block';
     }
   });
   buildSlotList();
   update3DPreview();
} 

function resetAllSlots() {
   for (let i = 1; i <= TOTAL_SLOTS; i++) {
     clearSlot(i);
   }
} 

/* ==========================================================================
   3D Card Flip Inspection
   ========================================================================== */ 

function bindInspection() {
   const btnInspect = document.getElementById('btnInspect');
   const btnCloseModal = document.getElementById('btnCloseModal');
   const btnTriggerFlip = document.getElementById('btnTriggerFlip'); 

   btnInspect.addEventListener('click', () => {
     inspectModal.style.display = 'flex';
     update3DPreview();
   }); 

   btnCloseModal.addEventListener('click', () => {
     inspectModal.style.display = 'none';
     card3d.classList.remove('flipped');
   }); 

   inspectModal.addEventListener('click', (e) => {
     if (e.target === inspectModal) {
       inspectModal.style.display = 'none';
       card3d.classList.remove('flipped');
     }
   }); 

   btnTriggerFlip.addEventListener('click', () => {
     card3d.classList.toggle('flipped');
   }); 

   card3d.addEventListener('click', () => {
     card3d.classList.toggle('flipped');
   }); 

   inspectCardSelect.addEventListener('change', update3DPreview);
} 

function update3DPreview() {
   const selectedIndex = parseInt(inspectCardSelect.value, 10) - 1;
   const slot = slotsData[selectedIndex]; 

   if (slot && slot.loaded) {
     img3dFront.src = slot.frontDataUrl;
     img3dFront.style.display = 'block';
     emptyFrontState.style.display = 'none'; 

     img3dBack.src = slot.backDataUrl;
     img3dBack.style.display = 'block';
     emptyBackState.style.display = 'none';
   } else {
     img3dFront.style.display = 'none';
     emptyFrontState.style.display = 'block';
     emptyFrontState.textContent = `No DL Loaded in DL ${selectedIndex + 1}`; 

     img3dBack.style.display = 'none';
     emptyBackState.style.display = 'block';
     emptyBackState.textContent = `No DL Loaded in DL ${selectedIndex + 1}`;
   }
} 

// Boot application 
document.addEventListener('DOMContentLoaded', initializeApp);