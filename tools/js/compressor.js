/**
 * Exact Target Sizing Engine with Single-Source Cached Blobs & Hover-Zoom Lens
 * Guarantees 0-byte mismatch for BOTH Image and PDF downloads.
 */

if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const Loader = {
    show: (title = 'Processing...', sub = 'Optimizing on your device') => {
        document.getElementById('loader-title').textContent = title;
        document.getElementById('loader-sub').textContent = sub;
        document.getElementById('global-loader').classList.remove('d-none');
    },
    hide: () => document.getElementById('global-loader').classList.add('d-none')
};

function getRandomToken(len = 6) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Single Source of Truth
const state = {
    photoBlob: null,
    signBlob: null,
    activePresetTarget: 'photo',
    activeTab: 'id-maker',
    currentImageFile: null,
    currentImageObj: null,
    currentPdfFile: null,
    currentPdfDoc: null,
    // EXACT cached blobs directly downloaded without any discrepancy
    lockedImageBlob: null,
    lockedPdfBlob: null,
    isPdfCompiling: false
};

// Track active tab
document.querySelectorAll('button[data-bs-toggle="pill"]').forEach(tabBtn => {
    tabBtn.addEventListener('shown.bs.tab', (e) => {
        if (e.target.id === 'tab-id-maker') state.activeTab = 'id-maker';
        else if (e.target.id === 'tab-image-shrinker') state.activeTab = 'image-shrinker';
        else if (e.target.id === 'tab-pdf-shrinker') state.activeTab = 'pdf-shrinker';
    });
});

// ==========================================
// 1. ISOLATED PASTE & HOVER/TOUCH
// ==========================================
const cardPhoto = document.getElementById('card-photo');
const cardSign = document.getElementById('card-sign');

function setActivePresetTarget(type) {
    state.activePresetTarget = type;
    if (type === 'photo') {
        cardPhoto.classList.add('active-target');
        cardSign.classList.remove('active-target');
    } else {
        cardSign.classList.add('active-target');
        cardPhoto.classList.remove('active-target');
    }
}

cardPhoto.addEventListener('mouseenter', () => setActivePresetTarget('photo'));
cardSign.addEventListener('mouseenter', () => setActivePresetTarget('sign'));
cardPhoto.addEventListener('touchstart', () => setActivePresetTarget('photo'), { passive: true });
cardSign.addEventListener('touchstart', () => setActivePresetTarget('sign'), { passive: true });
cardPhoto.addEventListener('focusin', () => setActivePresetTarget('photo'));
cardSign.addEventListener('focusin', () => setActivePresetTarget('sign'));

window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || window.clipboardData).items;
    let pastedImage = null;

    for (let item of items) {
        if (item.type.includes('image')) {
            pastedImage = item.getAsFile();
            break;
        }
    }
    if (!pastedImage) return;

    if (state.activeTab === 'id-maker') {
        processPresetImage(pastedImage, state.activePresetTarget);
    } else if (state.activeTab === 'image-shrinker') {
        loadImageForLiveCompress(pastedImage);
    }
});

// Photo & Sign Triggers
document.getElementById('drop-photo').addEventListener('click', () => document.getElementById('file-photo').click());
document.getElementById('drop-sign').addEventListener('click', () => document.getElementById('file-sign').click());

document.getElementById('file-photo').addEventListener('change', (e) => processPresetImage(e.target.files[0], 'photo'));
document.getElementById('file-sign').addEventListener('change', (e) => processPresetImage(e.target.files[0], 'sign'));

setupDragDrop('drop-photo', (file) => processPresetImage(file, 'photo'));
setupDragDrop('drop-sign', (file) => processPresetImage(file, 'sign'));

// ==========================================
// 2. TAB 1: PHOTO & SIGNATURE (EXACT MATCH)
// ==========================================
async function processPresetImage(file, type) {
    if (!file || !file.type.startsWith('image/')) return;
    
    Loader.show('Optimizing Image...', 'Applying dimensions & KB cap');
    try {
        const width = parseInt(document.getElementById(`${type}-w`).value) || (type === 'photo' ? 420 : 500);
        const height = parseInt(document.getElementById(`${type}-h`).value) || (type === 'photo' ? 525 : 200);
        const maxTargetKB = parseFloat(document.getElementById(`${type}-kb`).value) || 20;
        const fitMode = type === 'sign' ? document.getElementById('sign-fit').value : 'contain';

        const img = await readImageFile(file);
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (type === 'sign' && fitMode === 'cover') {
            const scale = Math.max(width / img.width, height / img.height);
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
        } else if (type === 'sign' && fitMode === 'tight') {
            ctx.drawImage(img, 4, 4, width - 8, height - 8);
        } else {
            const scale = Math.min((width - 8) / img.width, (height - 8) / img.height);
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
        }

        const bestBlob = await produceTargetCompressedBlob(canvas, maxTargetKB, 'image/jpeg');

        if (type === 'photo') state.photoBlob = bestBlob;
        if (type === 'sign') state.signBlob = bestBlob;

        const url = URL.createObjectURL(bestBlob);
        const dropBox = document.getElementById(`drop-${type}`);
        dropBox.innerHTML = `<img src="${url}" class="preview-rendered-img" alt="${type}">`;

        document.getElementById(`size-${type}`).textContent = (bestBlob.size / 1024).toFixed(1) + ' KB';
        document.getElementById(`dims-${type}`).textContent = `${width}x${height} px`;
        document.getElementById(`res-${type}`).classList.remove('d-none');

        checkBothReady();
    } catch (err) {
        console.error(err);
        alert('Could not process this image.');
    } finally {
        Loader.hide();
    }
}

function checkBothReady() {
    const btnBoth = document.getElementById('btn-download-both');
    btnBoth.disabled = !(state.photoBlob && state.signBlob);
}

document.getElementById('dl-photo').addEventListener('click', () => {
    if (!state.photoBlob) return;
    const defaultRandom = `photo_${getRandomToken()}`;
    const name = prompt("Enter file name for photo:", defaultRandom);
    if (name === null) return;
    const finalName = (name.trim() || defaultRandom).replace(/[^a-zA-Z0-9_-]/g, '');
    downloadBlob(state.photoBlob, `${finalName}.jpg`);
});

document.getElementById('dl-sign').addEventListener('click', () => {
    if (!state.signBlob) return;
    const defaultRandom = `sign_${getRandomToken()}`;
    const name = prompt("Enter file name for signature:", defaultRandom);
    if (name === null) return;
    const finalName = (name.trim() || defaultRandom).replace(/[^a-zA-Z0-9_-]/g, '');
    downloadBlob(state.signBlob, `${finalName}.jpg`);
});

document.getElementById('btn-download-both').addEventListener('click', () => {
    if (!state.photoBlob || !state.signBlob) return;
    const defaultRandom = `user_${getRandomToken()}`;
    const baseName = prompt("Enter  name (e.g. name):", defaultRandom);
    if (baseName === null) return;
    const cleanName = (baseName.trim() || defaultRandom).replace(/[^a-zA-Z0-9_-]/g, '');

    downloadBlob(state.photoBlob, `${cleanName}ph.jpg`);
    setTimeout(() => downloadBlob(state.signBlob, `${cleanName}sign.jpg`), 350);
});

// ==========================================
// 3. TAB 2: PICTURE COMPRESSOR WITH LIVE PREVIEW & HOVER-ZOOM
// ==========================================
const dropBatch = document.getElementById('drop-batch-images');
const fileBatch = document.getElementById('file-batch-images');
const imgLiveControl = document.getElementById('image-live-control');
const imgSlider = document.getElementById('img-live-slider');
const imgNum = document.getElementById('img-live-num');
const imgSavingsLabel = document.getElementById('slider-savings-label');
const livePreviewImg = document.getElementById('img-live-preview-element');
const btnImgSizeLabel = document.getElementById('btn-img-size-label');

dropBatch.addEventListener('click', () => fileBatch.click());
fileBatch.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) loadImageForLiveCompress(e.target.files[0]);
});
setupDragDrop('drop-batch-images', (file) => loadImageForLiveCompress(file));

async function loadImageForLiveCompress(file) {
    if (!file || !file.type.startsWith('image/')) return;

    state.currentImageFile = file;
    state.currentImageObj = await readImageFile(file);

    const origKB = Math.round(file.size / 1024);
    document.getElementById('live-img-filename').textContent = file.name;
    document.getElementById('live-img-original-size').textContent = `Original: ${origKB} KB`;
    document.getElementById('live-img-dimensions').textContent = `${state.currentImageObj.width} × ${state.currentImageObj.height} px`;

    // Strictly capped to original size
    const minKB = Math.max(5, Math.round(origKB * 0.05));
    const maxKB = Math.max(origKB, minKB + 5);

    imgSlider.min = minKB;
    imgSlider.max = maxKB;
    imgSlider.value = Math.round(origKB * 0.5) || minKB;
    imgNum.min = minKB;
    imgNum.max = maxKB;
    imgNum.value = imgSlider.value;

    document.getElementById('slider-min-label').textContent = `${minKB} KB`;
    document.getElementById('slider-max-label').textContent = `${maxKB} KB`;

    imgLiveControl.classList.remove('d-none');
    recalculateLiveImage();
}

imgSlider.addEventListener('input', () => {
    imgNum.value = imgSlider.value;
    recalculateLiveImage();
});

imgNum.addEventListener('input', () => {
    let val = parseFloat(imgNum.value) || imgSlider.min;
    if (val > parseFloat(imgSlider.max)) {
        val = parseFloat(imgSlider.max);
        imgNum.value = val;
    }
    imgSlider.value = val;
    recalculateLiveImage();
});

document.getElementById('img-output-type').addEventListener('change', recalculateLiveImage);

let liveDebounce = null;
function recalculateLiveImage() {
    clearTimeout(liveDebounce);
    liveDebounce = setTimeout(async () => {
        if (!state.currentImageObj) return;

        const origKB = state.currentImageFile.size / 1024;
        let targetKB = Math.min(parseFloat(imgNum.value) || 50, origKB);
        const outputMime = document.getElementById('img-output-type').value;

        const img = state.currentImageObj;
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (outputMime === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // LOCK the exact blob in state
        const exactBlob = await produceTargetCompressedBlob(canvas, targetKB, outputMime);
        state.lockedImageBlob = exactBlob;

        const exactKB = (exactBlob.size / 1024).toFixed(1);
        const diffPct = Math.max(0, Math.round(((origKB - exactKB) / origKB) * 100));

        // Exact byte synchronization
        document.getElementById('live-img-target-display').textContent = `${exactKB} KB`;
        btnImgSizeLabel.textContent = `${exactKB} KB`;
        imgSavingsLabel.textContent = `Saved ${diffPct}% (Target: ≤ ${Math.round(targetKB)} KB)`;

        // Update live preview directly from locked blob
        if (livePreviewImg.src) URL.revokeObjectURL(livePreviewImg.src);
        livePreviewImg.src = URL.createObjectURL(exactBlob);

        const qualityPct = Math.min(100, Math.round((exactBlob.size / (origKB * 1024)) * 100));
        document.getElementById('preview-clarity-badge').textContent = `${qualityPct}% Profile`;
    }, 100);
}

// Download exact locked image blob
document.getElementById('btn-compress-image-now').addEventListener('click', () => {
    if (!state.lockedImageBlob) return;
    const targetKB = (state.lockedImageBlob.size / 1024).toFixed(0);
    const mime = document.getElementById('img-output-type').value;
    const ext = mime === 'image/jpeg' ? 'jpg' : (mime.split('/')[1] || 'jpg');
    downloadBlob(state.lockedImageBlob, `img_${getRandomToken()}_${targetKB}kb.${ext}`);
});

// Setup Hover Zoom for Image
setupHoverZoom('img-zoom-box', 'img-live-preview-element');

// ==========================================
// 4. TAB 3: PDF COMPRESSOR WITH EXACT SINGLE-SOURCE BLOB & HOVER ZOOM
// ==========================================
const dropPdf = document.getElementById('drop-pdf');
const filePdf = document.getElementById('file-pdf');
const pdfLiveControl = document.getElementById('pdf-live-control');
const pdfSlider = document.getElementById('pdf-live-slider');
const pdfNum = document.getElementById('pdf-live-num');
const pdfSavingsLabel = document.getElementById('pdf-slider-savings-label');
const pdfPreviewCanvas = document.getElementById('pdf-live-preview-canvas');
const btnPdf = document.getElementById('btn-compress-pdf-now');
const btnPdfSizeLabel = document.getElementById('btn-pdf-size-label');
const pdfStatusText = document.getElementById('pdf-status-text');
const pdfSpinner = document.getElementById('pdf-compile-spinner');

dropPdf.addEventListener('click', () => filePdf.click());
filePdf.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) loadPdfForLiveCompress(e.target.files[0]);
});
setupDragDrop('drop-pdf', (file) => loadPdfForLiveCompress(file));

async function loadPdfForLiveCompress(file) {
    if (!file || file.type !== 'application/pdf') {
        alert('Please choose a valid PDF file.');
        return;
    }

    state.currentPdfFile = file;
    const origKB = Math.round(file.size / 1024);

    document.getElementById('live-pdf-filename').textContent = file.name;
    document.getElementById('live-pdf-original-size').textContent = `Original: ${origKB} KB`;

    // Strictly capped to original PDF size
    const minKB = Math.max(15, Math.round(origKB * 0.05));
    const maxKB = Math.max(origKB, minKB + 5);

    pdfSlider.min = minKB;
    pdfSlider.max = maxKB;
    pdfSlider.value = Math.round(origKB * 0.5) || minKB;
    pdfNum.min = minKB;
    pdfNum.max = maxKB;
    pdfNum.value = pdfSlider.value;

    document.getElementById('pdf-slider-min').textContent = `${minKB} KB`;
    document.getElementById('pdf-slider-max').textContent = `${maxKB} KB`;

    // Load PDF Document
    const fileBuffer = await file.arrayBuffer();
    state.currentPdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;

    pdfLiveControl.classList.remove('d-none');
    compileAndLockPdfBlob();
}

pdfSlider.addEventListener('input', () => {
    pdfNum.value = pdfSlider.value;
    compileAndLockPdfBlob();
});

pdfNum.addEventListener('input', () => {
    let val = parseFloat(pdfNum.value) || pdfSlider.min;
    if (val > parseFloat(pdfSlider.max)) {
        val = parseFloat(pdfSlider.max);
        pdfNum.value = val;
    }
    pdfSlider.value = val;
    compileAndLockPdfBlob();
});

let pdfCompileDebounce = null;
/**
 * Compiles the PDF in the background and locks the EXACT Blob into state.lockedPdfBlob.
 * What is shown on the UI tag & button matches the exact byte count of this blob!
 */
function compileAndLockPdfBlob() {
    clearTimeout(pdfCompileDebounce);

    // Show compiling status immediately
    pdfSpinner.classList.remove('d-none');
    pdfStatusText.textContent = 'Compiling exact PDF size...';
    btnPdf.disabled = true;

    pdfCompileDebounce = setTimeout(async () => {
        if (!state.currentPdfDoc || !state.currentPdfFile) return;

        const origKB = state.currentPdfFile.size / 1024;
        const targetKB = Math.min(parseFloat(pdfNum.value) || 100, origKB);
        const totalPages = state.currentPdfDoc.numPages;

        // Derive dynamic DPI & JPEG compression parameters
        const targetBytesPerPage = (targetKB * 1024) / totalPages;
        let renderScale = 1.8;
        let jpegQuality = 0.65;

        if (targetBytesPerPage < 30000) {
            renderScale = 1.35;
            jpegQuality = 0.42;
        } else if (targetBytesPerPage < 70000) {
            renderScale = 1.75;
            jpegQuality = 0.60;
        } else {
            renderScale = 2.15;
            jpegQuality = 0.78;
        }

        try {
            // 1. Render First-Page Preview for the canvas
            const firstPage = await state.currentPdfDoc.getPage(1);
            const previewViewport = firstPage.getViewport({ scale: renderScale });

            pdfPreviewCanvas.width = previewViewport.width;
            pdfPreviewCanvas.height = previewViewport.height;
            const ctx = pdfPreviewCanvas.getContext('2d', { alpha: false });
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, previewViewport.width, previewViewport.height);

            await firstPage.render({
                canvasContext: ctx,
                viewport: previewViewport,
                intent: 'print'
            }).promise;

            document.getElementById('pdf-clarity-badge').textContent = `DPI ${Math.round(renderScale * 72)}`;

            // 2. Compile Entire Document into exact Binary Blob
            const newPdfDoc = await PDFLib.PDFDocument.create();

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                const page = await state.currentPdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale: renderScale });

                const offCanvas = document.createElement('canvas');
                offCanvas.width = viewport.width;
                offCanvas.height = viewport.height;
                const offCtx = offCanvas.getContext('2d', { alpha: false });
                offCtx.fillStyle = '#FFFFFF';
                offCtx.fillRect(0, 0, viewport.width, viewport.height);

                await page.render({
                    canvasContext: offCtx,
                    viewport: viewport,
                    intent: 'print'
                }).promise;

                const imgDataUrl = offCanvas.toDataURL('image/jpeg', jpegQuality);
                const embeddedImg = await newPdfDoc.embedJpg(imgDataUrl);

                const origViewport = page.getViewport({ scale: 1.0 });
                const newPage = newPdfDoc.addPage([origViewport.width, origViewport.height]);
                newPage.drawImage(embeddedImg, {
                    x: 0,
                    y: 0,
                    width: origViewport.width,
                    height: origViewport.height
                });
            }

            const compiledBytes = await newPdfDoc.save();
            const lockedBlob = new Blob([compiledBytes], { type: 'application/pdf' });

            // Store single-source locked blob
            state.lockedPdfBlob = lockedBlob;

            // Reflect the EXACT size of the compiled blob on screen
            const exactPdfKB = (lockedBlob.size / 1024).toFixed(1);
            const savedPct = Math.max(0, Math.round(((origKB - exactPdfKB) / origKB) * 100));

            document.getElementById('live-pdf-target-display').textContent = `${exactPdfKB} KB`;
            btnPdfSizeLabel.textContent = `${exactPdfKB} KB`;
            pdfSavingsLabel.textContent = `Saved ${savedPct}% (Target: ≤ ${Math.round(targetKB)} KB)`;

            pdfStatusText.textContent = 'Ready for instant download';
            btnPdf.disabled = false;
        } catch (err) {
            console.error('PDF compile error:', err);
            pdfStatusText.textContent = 'Could not compile preview';
        } finally {
            pdfSpinner.classList.add('d-none');
        }
    }, 250);
}

// Download the EXACT locked PDF blob with 0 size discrepancy
document.getElementById('btn-compress-pdf-now').addEventListener('click', () => {
    if (!state.lockedPdfBlob) return;
    const finalKB = (state.lockedPdfBlob.size / 1024).toFixed(0);
    downloadBlob(state.lockedPdfBlob, `pdf_${getRandomToken()}_${finalKB}kb.pdf`);
});

// Setup Hover Zoom for PDF Canvas
setupHoverZoom('pdf-zoom-box', 'pdf-live-preview-canvas');

// ==========================================
// 5. HOVER ZOOM MAGNIFIER CONTROLLER
// ==========================================
function setupHoverZoom(containerId, targetElementId) {
    const container = document.getElementById(containerId);
    const target = document.getElementById(targetElementId);
    if (!container || !target) return;

    function handleMove(clientX, clientY) {
        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Calculate transform origin as percentage of container
        const originX = (x / rect.width) * 100;
        const originY = (y / rect.height) * 100;

        target.style.transformOrigin = `${originX}% ${originY}%`;
        container.classList.add('is-zoomed');
    }

    // Mouse Events (Desktop)
    container.addEventListener('mousemove', (e) => {
        handleMove(e.clientX, e.clientY);
    });

    container.addEventListener('mouseleave', () => {
        container.classList.remove('is-zoomed');
        target.style.transformOrigin = 'center center';
    });

    // Touch Events (Mobile pan)
    container.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    container.addEventListener('touchend', () => {
        container.classList.remove('is-zoomed');
        target.style.transformOrigin = 'center center';
    });
}

// ==========================================
// 6. TARGET SIZING ENGINE (IMAGE COMPRESSION)
// ==========================================
async function produceTargetCompressedBlob(sourceCanvas, targetKB, mimeType = 'image/jpeg') {
    const targetBytes = Math.round(targetKB * 1024);
    
    let lowQ = 0.05, highQ = 0.95, bestBlob = null;
    for (let i = 0; i < 7; i++) {
        const midQ = (lowQ + highQ) / 2;
        const b = await canvasToBlob(sourceCanvas, mimeType, midQ);
        if (b.size <= targetBytes) {
            bestBlob = b;
            lowQ = midQ;
        } else {
            highQ = midQ;
        }
    }

    if (!bestBlob) {
        bestBlob = await canvasToBlob(sourceCanvas, mimeType, 0.05);
    }

    if (bestBlob.size > targetBytes) {
        let currentW = sourceCanvas.width;
        let currentH = sourceCanvas.height;
        for (let step = 0; step < 5; step++) {
            const ratio = Math.sqrt(targetBytes / bestBlob.size) * 0.95;
            currentW = Math.max(16, Math.round(currentW * ratio));
            currentH = Math.max(16, Math.round(currentH * ratio));

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = currentW;
            tempCanvas.height = currentH;
            const ctx = tempCanvas.getContext('2d');
            if (mimeType === 'image/jpeg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, currentW, currentH);
            }
            ctx.drawImage(sourceCanvas, 0, 0, currentW, currentH);

            bestBlob = await canvasToBlob(tempCanvas, mimeType, 0.65);
            if (bestBlob.size <= targetBytes) break;
        }
    }

    return bestBlob;
}

// ==========================================
// 7. SHARED UTILITIES
// ==========================================
function readImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function canvasToBlob(canvas, mimeType, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setupDragDrop(zoneId, onFileDrop) {
    const zone = document.getElementById(zoneId);
    if (!zone) return;

    ['dragenter', 'dragover'].forEach(name => {
        zone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(name => {
        zone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.remove('dragover');
        });
    });

    zone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files[0]) onFileDrop(files[0]);
    });
}