/**
 * Print Card A4 Pro Studio Engine
 * Full N-Up Grid, Top/Center Modes, "One Card 2 Copies", and Vector PDF
 */
document.addEventListener('DOMContentLoaded', () => {
  const state = {
    front: { img: null, dataUrl: '', x: 0, y: 0, scale: 1, rotation: 0 },
    back:  { img: null, dataUrl: '', x: 0, y: 0, scale: 1, rotation: 0 },
    previewScale: 0.65
  };

  const root = document.documentElement;
  const a4Page = document.getElementById('a4Page');
  const sheetBounds = document.getElementById('sheetBounds');
  const gridContainer = document.getElementById('gridContainer');
  const foldGuide = document.getElementById('foldGuide');

  // Print Mode Controls
  const printMode = document.getElementById('printMode');
  const customCountWrapper = document.getElementById('customCountWrapper');
  const copyCount = document.getElementById('copyCount');
  const copySource = document.getElementById('copySource');
  const capacityHint = document.getElementById('capacityHint');

  // Alignment Controls
  const verticalAlign = document.getElementById('verticalAlign');
  const horizontalAlign = document.getElementById('horizontalAlign');
  const topMargin = document.getElementById('topMargin');
  const gapX = document.getElementById('gapX');
  const gapY = document.getElementById('gapY');

  // Dimensions & Marks
  const presetSelect = document.getElementById('presetSelect');
  const cardW = document.getElementById('cardW');
  const cardH = document.getElementById('cardH');
  const cardR = document.getElementById('cardR');
  const cropMarks = document.getElementById('cropMarks');
  const centerFoldGuide = document.getElementById('centerFoldGuide');

  // Upload Elements
  const frontInput = document.getElementById('frontInput');
  const backInput = document.getElementById('backInput');
  const rotateFrontBtn = document.getElementById('rotateFrontBtn');
  const rotateBackBtn = document.getElementById('rotateBackBtn');
  const copyFrontToBackBtn = document.getElementById('copyFrontToBackBtn');

  // Zoom
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomDisplay = document.getElementById('zoomDisplay');

  // --- 1. Compute Sheet Configuration ---
  function computeLayout() {
    const w = parseFloat(cardW.value) || 85.6;
    const h = parseFloat(cardH.value) || 53.98;
    const gx = parseFloat(gapX.value) || 5;
    const gy = parseFloat(gapY.value) || 6;
    const tm = parseFloat(topMargin.value) || 15;
    const isRow = horizontalAlign.value === 'row';
    const mode = printMode.value;

    let slots = [];
    customCountWrapper.style.display = (mode === 'custom-copies') ? 'grid' : 'none';

    switch (mode) {
      case 'one-card-2-copies':
        // Exactly 2 copies of the Front face
        slots = [{ type: 'front' }, { type: 'front' }];
        capacityHint.textContent = 'Mode: 2 identical copies of Front Card';
        break;

      case 'pair-2-copies':
        // 2 Fronts and 2 Backs (total 4 cards)
        slots = [
          { type: 'front' }, { type: 'back' },
          { type: 'front' }, { type: 'back' }
        ];
        capacityHint.textContent = 'Mode: 2 Paired Copies (2 Fronts + 2 Backs)';
        break;

      case 'single-pair':
        slots = [{ type: 'front' }, { type: 'back' }];
        capacityHint.textContent = 'Mode: 1 Single Pair (1 Front + 1 Back)';
        break;

      case 'custom-copies': {
        const count = parseInt(copyCount.value, 10) || 2;
        const src = copySource.value;
        for (let i = 0; i < count; i++) {
          if (src === 'both') {
            slots.push({ type: 'front' });
            slots.push({ type: 'back' });
          } else {
            slots.push({ type: src });
          }
        }
        capacityHint.textContent = `Mode: ${slots.length} Custom Card Copies`;
        break;
      }

      case 'pairs-max': {
        const maxCols = Math.max(1, Math.floor((210 - 20 + gx) / (w + gx)));
        const maxRows = Math.max(1, Math.floor((297 - 20 + gy) / (h + gy)));
        const pairsPerRow = Math.max(1, Math.floor(maxCols / 2));
        const totalPairs = pairsPerRow * maxRows;
        for (let i = 0; i < totalPairs; i++) {
          slots.push({ type: 'front' });
          slots.push({ type: 'back' });
        }
        capacityHint.textContent = `Mode: Full Sheet (${totalPairs} Pairs = ${totalPairs * 2} cards)`;
        break;
      }

      case 'fronts-fill': {
        const maxCols = Math.max(1, Math.floor((210 - 20 + gx) / (w + gx)));
        const maxRows = Math.max(1, Math.floor((297 - 20 + gy) / (h + gy)));
        const total = maxCols * maxRows;
        for (let i = 0; i < total; i++) slots.push({ type: 'front' });
        capacityHint.textContent = `Mode: ${total} Fronts / Sheet (${maxCols}×${maxRows})`;
        break;
      }
    }

    // Grid column configuration
    let cols = 2;
    if (mode === 'pairs-max' || mode === 'fronts-fill') {
      cols = Math.max(1, Math.floor((210 - 20 + gx) / (w + gx)));
    } else if (isRow) {
      cols = Math.min(slots.length, 2);
    } else {
      cols = 1;
    }

    return { w, h, gx, gy, tm, slots, cols, isRow };
  }

  // --- 2. Render Grid & Apply Position Styles ---
  function renderSheet() {
    const { w, h, gx, gy, tm, slots, cols, isRow } = computeLayout();

    root.style.setProperty('--card-w', `${w}mm`);
    root.style.setProperty('--card-h', `${h}mm`);
    root.style.setProperty('--card-r', `${parseFloat(cardR.value) || 0}mm`);
    root.style.setProperty('--gap-x', `${gx}mm`);
    root.style.setProperty('--gap-y', `${gy}mm`);
    root.style.setProperty('--top-margin', `${tm}mm`);

    // Vertical alignment on page
    sheetBounds.className = 'sheet-content-bounds align-' + verticalAlign.value;
    gridContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridContainer.innerHTML = '';

    slots.forEach((slot, index) => {
      const slotEl = document.createElement('div');
      slotEl.className = 'card-slot' + (cropMarks.checked ? ' show-marks' : '');
      slotEl.dataset.type = slot.type;
      slotEl.dataset.index = index;

      const viewportEl = document.createElement('div');
      viewportEl.className = 'card-viewport';

      const imgEl = document.createElement('img');
      imgEl.draggable = false;

      const hintEl = document.createElement('div');
      hintEl.className = 'empty-hint';
      hintEl.textContent = `${slot.type.toUpperCase()} Card`;

      viewportEl.appendChild(imgEl);
      viewportEl.appendChild(hintEl);
      slotEl.appendChild(viewportEl);

      ['tl', 'tr', 'bl', 'br'].forEach(pos => {
        const mark = document.createElement('div');
        mark.className = `crop-mark cm-${pos}`;
        slotEl.appendChild(mark);
      });

      gridContainer.appendChild(slotEl);
      bindSlotInteractions(slot.type, viewportEl);
    });

    // Center fold guide setup
    if (centerFoldGuide.checked && slots.length === 2) {
      sheetBounds.classList.add('show-fold');
      if (isRow) {
        foldGuide.style.top = '-4mm';
        foldGuide.style.bottom = '-4mm';
        foldGuide.style.left = `calc(50% - 0.15mm)`;
        foldGuide.style.width = '0px';
        foldGuide.style.borderLeft = '0.25mm dashed #94a3b8';
        foldGuide.style.borderTop = 'none';
      } else {
        foldGuide.style.left = '-4mm';
        foldGuide.style.right = '-4mm';
        foldGuide.style.top = `calc(50% - 0.15mm)`;
        foldGuide.style.height = '0px';
        foldGuide.style.borderTop = '0.25mm dashed #94a3b8';
        foldGuide.style.borderLeft = 'none';
      }
    } else {
      sheetBounds.classList.remove('show-fold');
    }

    syncAllCardTransforms();
  }

  // --- 3. Interactive Pan, Zoom & Transform Engine ---
  function bindSlotInteractions(type, viewport) {
    let isDragging = false;
    let startX = 0, startY = 0;

    viewport.addEventListener('mousedown', (e) => {
      if (!state[type].img) return;
      isDragging = true;
      startX = e.clientX - state[type].x;
      startY = e.clientY - state[type].y;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      state[type].x = e.clientX - startX;
      state[type].y = e.clientY - startY;
      syncAllCardTransforms();
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    viewport.addEventListener('wheel', (e) => {
      if (!state[type].img) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.05 : 0.95;
      state[type].scale = Math.max(0.1, Math.min(10, state[type].scale * factor));
      syncAllCardTransforms();
    }, { passive: false });
  }

  function syncAllCardTransforms() {
    ['front', 'back'].forEach(type => {
      const s = state[type];
      const slots = gridContainer.querySelectorAll(`.card-slot[data-type="${type}"]`);
      slots.forEach(slot => {
        const img = slot.querySelector('img');
        const hint = slot.querySelector('.empty-hint');
        if (s.dataUrl) {
          img.src = s.dataUrl;
          img.style.display = 'block';
          hint.style.display = 'none';
          img.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.rotation}deg) scale(${s.scale})`;
        } else {
          img.style.display = 'none';
          hint.style.display = 'flex';
        }
      });
    });
  }

  function fitCardToViewport(type) {
    const s = state[type];
    if (!s.img) return;

    const sample = gridContainer.querySelector(`.card-slot[data-type="${type}"] .card-viewport`);
    if (!sample) return;

    const vw = sample.clientWidth;
    const vh = sample.clientHeight;

    const isRot = (s.rotation / 90) % 2 !== 0;
    const naturalW = isRot ? s.img.naturalHeight : s.img.naturalWidth;
    const naturalH = isRot ? s.img.naturalWidth : s.img.naturalHeight;

    const scale = Math.max(vw / naturalW, vh / naturalH);
    s.scale = scale;
    s.x = (vw - s.img.naturalWidth * scale) / 2;
    s.y = (vh - s.img.naturalHeight * scale) / 2;
    syncAllCardTransforms();
  }

  // --- 4. Uploads & Duplication ---
  function setupUpload(inputEl, type) {
    inputEl.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          state[type].img = img;
          state[type].dataUrl = evt.target.result;
          state[type].rotation = 0;
          fitCardToViewport(type);
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  setupUpload(frontInput, 'front');
  setupUpload(backInput, 'back');

  rotateFrontBtn.addEventListener('click', () => {
    state.front.rotation = (state.front.rotation + 90) % 360;
    fitCardToViewport('front');
  });

  rotateBackBtn.addEventListener('click', () => {
    state.back.rotation = (state.back.rotation + 90) % 360;
    fitCardToViewport('back');
  });

  // Duplicate Front image directly to Back slot
  copyFrontToBackBtn.addEventListener('click', () => {
    if (!state.front.img) {
      alert('Upload a Front card image first.');
      return;
    }
    state.back.img = state.front.img;
    state.back.dataUrl = state.front.dataUrl;
    state.back.rotation = state.front.rotation;
    state.back.scale = state.front.scale;
    state.back.x = state.front.x;
    state.back.y = state.front.y;
    syncAllCardTransforms();
  });

  // Controls Event Listeners
  [printMode, copyCount, copySource, verticalAlign, horizontalAlign, topMargin, gapX, gapY, cardW, cardH, cardR, cropMarks, centerFoldGuide].forEach(el => {
    el.addEventListener('change', renderSheet);
    el.addEventListener('input', renderSheet);
  });

  presetSelect.addEventListener('change', () => {
    if (presetSelect.value !== 'custom') {
      const [w, h, r] = presetSelect.value.split(',');
      cardW.value = w;
      cardH.value = h;
      cardR.value = r;
      renderSheet();
      fitCardToViewport('front');
      fitCardToViewport('back');
    }
  });

  // Zoom Controls
  function setZoom(val) {
    state.previewScale = Math.min(Math.max(0.3, val), 1.5);
    root.style.setProperty('--preview-scale', state.previewScale);
    zoomDisplay.textContent = `${Math.round(state.previewScale * 100)}%`;
  }
  zoomInBtn.addEventListener('click', () => setZoom(state.previewScale + 0.1));
  zoomOutBtn.addEventListener('click', () => setZoom(state.previewScale - 0.1));

  document.getElementById('printAction').addEventListener('click', () => window.print());

  // --- 5. True 1:1 Vector PDF Export with Top/Center Placement ---
  document.getElementById('exportPdfBtn').addEventListener('click', async () => {
    const btn = document.getElementById('exportPdfBtn');
    btn.innerText = 'Generating PDF...';
    btn.disabled = true;

    setTimeout(() => {
      try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        const pageRect = a4Page.getBoundingClientRect();
        const mmRatio = 210 / pageRect.width;

        const slots = gridContainer.querySelectorAll('.card-slot');

        slots.forEach((slot) => {
          const type = slot.dataset.type;
          const s = state[type];
          if (!s.img) return;

          const slotRect = slot.getBoundingClientRect();
          const xMm = (slotRect.left - pageRect.left) * mmRatio;
          const yMm = (slotRect.top - pageRect.top) * mmRatio;
          const wMm = slotRect.width * mmRatio;
          const hMm = slotRect.height * mmRatio;

          // High DPI off-screen canvas rasterizer
          const canvas = document.createElement('canvas');
          const sampleViewport = slot.querySelector('.card-viewport');
          canvas.width = sampleViewport.clientWidth * 2;
          canvas.height = sampleViewport.clientHeight * 2;
          const ctx = canvas.getContext('2d');

          ctx.scale(2, 2);
          ctx.translate(s.x, s.y);
          ctx.rotate((s.rotation * Math.PI) / 180);
          ctx.scale(s.scale, s.scale);
          ctx.drawImage(s.img, 0, 0);

          const cardJpeg = canvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(cardJpeg, 'JPEG', xMm, yMm, wMm, hMm);

          // Vector Crop Marks
          if (cropMarks.checked) {
            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.15);
            const markLen = 3.5;
            const offset = 1.5;

            // TL
            pdf.line(xMm - offset - markLen, yMm, xMm - offset, yMm);
            pdf.line(xMm, yMm - offset - markLen, xMm, yMm - offset);
            // TR
            pdf.line(xMm + wMm + offset, yMm, xMm + wMm + offset + markLen, yMm);
            pdf.line(xMm + wMm, yMm - offset - markLen, xMm + wMm, yMm - offset);
            // BL
            pdf.line(xMm - offset - markLen, yMm + hMm, xMm - offset, yMm + hMm);
            pdf.line(xMm, yMm + hMm + offset, xMm, yMm + hMm + offset + markLen);
            // BR
            pdf.line(xMm + wMm + offset, yMm + hMm, xMm + wMm + offset + markLen, yMm + hMm);
            pdf.line(xMm + wMm, yMm + hMm + offset, xMm + wMm, yMm + hMm + offset + markLen);
          }
        });

        pdf.save(`Card-Print-A4-${Date.now()}.pdf`);
      } catch (err) {
        console.error('PDF Export Error:', err);
        alert('An error occurred during PDF generation.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Download PDF (300 DPI Scale)
        `;
      }
    }, 40);
  });

  // Initial Render
  renderSheet();
});