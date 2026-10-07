/**
 * Parivahan DL Studio Pro - Enterprise Suite v4.0 (app.js)
 * Implements helper functions: change specific file, restore defaults, 
 * toggle die-cut crop lines, and responsive parallel rendering.
 */

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let uploadedFiles = [];
let generatedPdfDataUri = null;
let debounceTimer = null;

// DOM Bindings
const dropZone = document.getElementById('dropZone');
const pdfInput = document.getElementById('pdfInput');
const fileListContainer = document.getElementById('fileListContainer');
const fileCountSpan = document.getElementById('fileCount');
const downloadBtn = document.getElementById('downloadBtn');
const statusDiv = document.getElementById('status');
const previewCanvas = document.getElementById('previewCanvas');

const wSlider = document.getElementById('wSlider');
const hSlider = document.getElementById('hSlider');
const topPaddingSlider = document.getElementById('topPaddingSlider');
const gapSlider = document.getElementById('gapSlider');
const dieCutToggle = document.getElementById('dieCutToggle');

// Default geometry values for restore helper
const DEFAULTS = {
    width: 85.0,
    height: 55.0,
    topPadding: 9.0,
    gap: 2.0,
    dieCut: true
};

if (dropZone) {
    ['dragenter', 'dragover'].forEach(e => dropZone.addEventListener(e, (ev) => { ev.preventDefault(); dropZone.style.borderColor = '#3b82f6'; }));
    ['dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, (ev) => { ev.preventDefault(); dropZone.style.borderColor = 'rgba(255,255,255,0.15)'; }));
    dropZone.addEventListener('drop', (e) => { handleFiles(e.dataTransfer.files); });
}

if (pdfInput) {
    pdfInput.addEventListener('change', (e) => { handleFiles(e.target.files); });
}

// Trigger smooth debounced pipeline on input change
[wSlider, hSlider, topPaddingSlider, gapSlider].forEach(slider => {
    if (slider) {
        slider.addEventListener('input', () => {
            updateBadgeValues();
            triggerPipelineWithDebounce();
        });
    }
});

if (dieCutToggle) {
    dieCutToggle.addEventListener('change', () => {
        if (uploadedFiles.length > 0) runPrecisionPipeline();
    });
}

function updateBadgeValues() {
    document.getElementById('wVal').innerText = parseFloat(wSlider.value).toFixed(1) + ' mm';
    document.getElementById('hVal').innerText = parseFloat(hSlider.value).toFixed(1) + ' mm';
    document.getElementById('topPaddingVal').innerText = parseFloat(topPaddingSlider.value).toFixed(1) + ' mm';
    document.getElementById('gapVal').innerText = parseFloat(gapSlider.value).toFixed(1) + ' mm';
}

function triggerPipelineWithDebounce() {
    if (uploadedFiles.length > 0) {
        if (statusDiv) {
            statusDiv.className = 'status-msg';
            statusDiv.innerText = 'Updating layout geometry...';
        }
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { runPrecisionPipeline(); }, 200);
    }
}

/**
 * HELPER: Restore all calibration sliders and options back to factory defaults
 */
window.restoreDefaults = function() {
    wSlider.value = DEFAULTS.width;
    hSlider.value = DEFAULTS.height;
    topPaddingSlider.value = DEFAULTS.topPadding;
    gapSlider.value = DEFAULTS.gap;
    dieCutToggle.checked = DEFAULTS.dieCut;
    
    updateBadgeValues();
    if (uploadedFiles.length > 0) {
        runPrecisionPipeline();
    }
    if (statusDiv) {
        statusDiv.className = 'status-msg success';
        statusDiv.innerText = 'Settings restored to default defaults.';
    }
}

function handleFiles(files) {
    for (let file of files) {
        if (file.type !== 'application/pdf') {
            alert(`Skipped "${file.name}": Only PDF files are accepted.`);
            continue;
        }
        if (uploadedFiles.length >= 5) {
            alert('Maximum limit of 5 PDFs reached for batch compilation.');
            break;
        }
        uploadedFiles.push(file);
    }
    updateFileListUI();
    if (uploadedFiles.length > 0) runPrecisionPipeline();
}

/**
 * HELPER: Change / Replace an existing file in the queue at a specific index
 */
window.changeFile = function(index) {
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'file';
    hiddenInput.accept = 'application/pdf';
    hiddenInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            uploadedFiles[index] = file;
            updateFileListUI();
            runPrecisionPipeline();
        } else {
            alert('Invalid file selected. Please choose a PDF.');
        }
    };
    hiddenInput.click();
}

/**
 * HELPER: Remove single file from queue
 */
window.removeFile = function(index) {
    uploadedFiles.splice(index, 1);
    updateFileListUI();
    if (uploadedFiles.length > 0) {
        runPrecisionPipeline();
    } else {
        resetWorkspace();
    }
};

/**
 * HELPER: Clear entire queue
 */
window.clearAllFiles = function() {
    uploadedFiles = [];
    resetWorkspace();
}

function resetWorkspace() {
    if (fileListContainer) fileListContainer.innerHTML = '<div class="empty-list-text">No files loaded in queue.</div>';
    if (fileCountSpan) fileCountSpan.innerText = '0';
    if (downloadBtn) downloadBtn.style.display = 'none';
    if (previewCanvas) previewCanvas.getContext('2d').clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    if (statusDiv) statusDiv.innerText = '';
}

function updateFileListUI() {
    if (fileCountSpan) fileCountSpan.innerText = uploadedFiles.length;
    if (!fileListContainer || uploadedFiles.length === 0) return;
    
    fileListContainer.innerHTML = '';
    uploadedFiles.forEach((file, idx) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <span>${idx + 1}. ${file.name.substring(0, 16)}...</span>
            <div class="file-actions">
                <button onclick="changeFile(${idx})" title="Change PDF">Change</button>
                <button class="danger" onclick="removeFile(${idx})" title="Remove">&times;</button>
            </div>
        `;
        fileListContainer.appendChild(item);
    });
}

/**
 * Core Parallel Prepress Execution Pipeline
 */
async function runPrecisionPipeline() {
    if (statusDiv) {
        statusDiv.className = 'status-msg';
        statusDiv.innerText = 'Rendering plates & packing rows...';
    }

    try {
        const targetW = parseFloat(wSlider.value);
        const targetH = parseFloat(hSlider.value);
        const topPadding = parseFloat(topPaddingSlider.value);
        const rowGap = parseFloat(gapSlider.value);
        const showDieCut = dieCutToggle.checked;

        // Parallel processing across loaded files
        const processingPromises = uploadedFiles.map(async (file) => {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                if (pdfDoc.numPages < 2) return null;

                const scaleFactor = 5.0;

                const page1 = await pdfDoc.getPage(1);
                const vp1 = page1.getViewport({ scale: scaleFactor });
                const canvas1 = document.createElement('canvas');
                canvas1.width = vp1.width; canvas1.height = vp1.height;
                await page1.render({ canvasContext: canvas1.getContext('2d'), viewport: vp1 }).promise;

                // Parivahan bottom whitespace trim (~1.3mm)
                const trimPx = (1.3 / 55.0) * canvas1.height;
                const cleanCanvas1 = document.createElement('canvas');
                cleanCanvas1.width = canvas1.width; cleanCanvas1.height = canvas1.height - trimPx;
                cleanCanvas1.getContext('2d').drawImage(canvas1, 0, 0, canvas1.width, canvas1.height - trimPx, 0, 0, canvas1.width, canvas1.height - trimPx);

                const page2 = await pdfDoc.getPage(2);
                const vp2 = page2.getViewport({ scale: scaleFactor });
                const canvas2 = document.createElement('canvas');
                canvas2.width = vp2.width; canvas2.height = vp2.height;
                await page2.render({ canvasContext: canvas2.getContext('2d'), viewport: vp2 }).promise;

                return {
                    frontDataUrl: cleanCanvas1.toDataURL('image/png', 1.0),
                    backDataUrl: canvas2.toDataURL('image/png', 1.0)
                };
            } catch (err) {
                console.error("File parse error:", err);
                return null;
            }
        });

        const renderedResults = (await Promise.all(processingPromises)).filter(Boolean);
        if (renderedResults.length === 0) throw new Error("No valid DL PDFs parsed.");

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const a4W = 210.0;
        const horizontalCardGap = 4.0;
        const rowTotalW = (targetW * 2) + horizontalCardGap;
        const startX = (a4W - rowTotalW) / 2;
        const startY = topPadding;

        renderedResults.forEach((result, i) => {
            const currentRowY = startY + (i * (targetH + rowGap));
            const frontX = startX;
            const backX = startX + targetW + horizontalCardGap;

            pdf.addImage(result.frontDataUrl, 'PNG', frontX, currentRowY, targetW, targetH);
            pdf.addImage(result.backDataUrl, 'PNG', backX, currentRowY, targetW, targetH);

            // Conditional Die-Cut / Guillotine Crop Marks
            if (showDieCut) {
                pdf.setDrawColor(40, 40, 40);
                pdf.setLineWidth(0.3);
                
                const foldX = startX + targetW + (horizontalCardGap / 2);
                pdf.setLineDash([1, 1], 0);
                pdf.line(foldX, currentRowY - 2, foldX, currentRowY + targetH + 2);
                pdf.setLineDash([], 0);

                const markLen = 5;
                const offset = 2;
                const cards = [[frontX, currentRowY, targetW, targetH], [backX, currentRowY, targetW, targetH]];

                cards.forEach(([cx, cy, cw, ch]) => {
                    pdf.line(cx - offset - markLen, cy, cx - offset, cy);
                    pdf.line(cx, cy - offset - markLen, cx, cy - offset);
                    pdf.line(cx + cw + offset, cy, cx + cw + offset + markLen, cy);
                    pdf.line(cx + cw, cy - offset - markLen, cx + cw, cy - offset);
                    pdf.line(cx - offset - markLen, cy + ch, cx - offset, cy + ch);
                    pdf.line(cx, cy + ch + offset, cx, cy + ch + offset + markLen);
                    pdf.line(cx + cw + offset, cy + ch, cx + cw + offset + markLen, cy + ch);
                    pdf.line(cx + cw, cy + ch + offset, cx + cw, cy + ch + offset + markLen);
                });
            }
        });

        generatedPdfDataUri = pdf.output('datauristring');

        if (previewCanvas) {
            const loadingTask = pdfjsLib.getDocument({ data: atob(generatedPdfDataUri.split(',')[1]) });
            const previewDoc = await loadingTask.promise;
            const previewPage = await previewDoc.getPage(1);
            const viewport = previewPage.getViewport({ scale: 1.1 });
            
            const ctx = previewCanvas.getContext('2d');
            previewCanvas.width = viewport.width;
            previewCanvas.height = viewport.height;
            await previewPage.render({ canvasContext: ctx, viewport: viewport }).promise;
        }

        if (statusDiv) {
            statusDiv.className = 'status-msg success';
            statusDiv.innerText = `Success! ${renderedResults.length} card(s) packed securely.`;
        }

        if (downloadBtn) {
            downloadBtn.style.display = 'block';
            downloadBtn.onclick = () => {
                const link = document.createElement('a');
                link.href = generatedPdfDataUri;
                link.download = 'Parivahan_DL_Studio_Pro.pdf';
                link.click();
            };
        }

    } catch (err) {
        console.error("Pipeline Error:", err);
        if (statusDiv) {
            statusDiv.className = 'status-msg error';
            statusDiv.innerText = 'Error: ' + err.message;
        }
    }
}