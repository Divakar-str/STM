document.addEventListener("DOMContentLoaded", () => {
    const croppers = {};
    const selectedRatios = { image: NaN, imageFront: NaN, imageBack: NaN };

    // Bidirectional Undo/Redo Stacks
    const historyStacks = { image: [], imageFront: [], imageBack: [] };
    const redoStacks = { image: [], imageFront: [], imageBack: [] };
    const preFilterBases = { image: null, imageFront: null, imageBack: null };

    let userCardScale = 0.80;
    let activeContainer = document.getElementById("canvas-container-main");

    function updateUndoRedoUI(imgId) {
        const uBtn = document.getElementById(`btnUndo-${imgId}`);
        const rBtn = document.getElementById(`btnRedo-${imgId}`);
        if (uBtn) uBtn.disabled = !historyStacks[imgId] || historyStacks[imgId].length <= 1;
        if (rBtn) rBtn.disabled = !redoStacks[imgId] || redoStacks[imgId].length === 0;
    }

    function pushHistory(imgId, dataUrl) {
        if (!historyStacks[imgId]) historyStacks[imgId] = [];
        historyStacks[imgId].push(dataUrl);
        if (historyStacks[imgId].length > 25) historyStacks[imgId].shift();

        // Clear forward redo history upon fresh mutation
        redoStacks[imgId] = [];
        updateUndoRedoUI(imgId);
    }

    function undoAction(imgId) {
        if (!historyStacks[imgId] || historyStacks[imgId].length <= 1) return;

        if (croppers[imgId]) {
            croppers[imgId].destroy();
            croppers[imgId] = null;
            updateCropBtnUI(imgId, false);
        }

        const currentState = historyStacks[imgId].pop();
        if (!redoStacks[imgId]) redoStacks[imgId] = [];
        redoStacks[imgId].push(currentState);

        const previousState = historyStacks[imgId][historyStacks[imgId].length - 1];
        const img = document.getElementById(imgId);
        img.src = previousState;
        preFilterBases[imgId] = previousState;

        updateUndoRedoUI(imgId);
    }

    function redoAction(imgId) {
        if (!redoStacks[imgId] || redoStacks[imgId].length === 0) return;

        if (croppers[imgId]) {
            croppers[imgId].destroy();
            croppers[imgId] = null;
            updateCropBtnUI(imgId, false);
        }

        const nextState = redoStacks[imgId].pop();
        historyStacks[imgId].push(nextState);

        const img = document.getElementById(imgId);
        img.src = nextState;
        preFilterBases[imgId] = nextState;

        updateUndoRedoUI(imgId);
    }

    function normalizeImage(dataUrl, maxDim = 2400) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let w = img.naturalWidth;
                let h = img.naturalHeight;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL("image/jpeg", 0.95));
            };
            img.src = dataUrl;
        });
    }

    async function setupImageToZone(imgId, dataUrl) {
        const img = document.getElementById(imgId);
        if (!img) return;

        const container = img.closest(".canvas-workspace");
        const placeholder = container.querySelector(".drop-zone-placeholder");

        if (croppers[imgId]) {
            croppers[imgId].destroy();
            croppers[imgId] = null;
            updateCropBtnUI(imgId, false);
        }

        const cleanData = await normalizeImage(dataUrl);
        img.src = cleanData;
        img.style.display = "block";
        if (placeholder) placeholder.style.display = "none";

        preFilterBases[imgId] = cleanData;
        historyStacks[imgId] = [];
        redoStacks[imgId] = [];
        pushHistory(imgId, cleanData);
    }

    function setRatio(imgId, ratioValue, btnElement) {
        selectedRatios[imgId] = ratioValue;
        const parent = btnElement.parentElement;
        parent.querySelectorAll("button").forEach(b => b.classList.remove("active"));
        btnElement.classList.add("active");

        if (croppers[imgId]) {
            croppers[imgId].setAspectRatio(ratioValue);
        }
    }

    function toggleCrop(imgId) {
        const img = document.getElementById(imgId);
        if (!img || !img.src || img.style.display === "none") {
            alert("Please load an image first.");
            return;
        }

        if (croppers[imgId]) {
            const canvas = croppers[imgId].getCroppedCanvas({
                imageSmoothingEnabled: true,
                imageSmoothingQuality: "high"
            });
            if (canvas) {
                const croppedData = canvas.toDataURL("image/jpeg", 0.95);
                croppers[imgId].destroy();
                croppers[imgId] = null;
                img.src = croppedData;
                preFilterBases[imgId] = croppedData;
                pushHistory(imgId, croppedData);
                updateCropBtnUI(imgId, false);
            }
        } else {
            croppers[imgId] = new Cropper(img, {
                aspectRatio: selectedRatios[imgId],
                viewMode: 2,
                autoCropArea: 0.98,
                responsive: true,
                restore: false,
                movable: true,
                zoomable: true,
                rotatable: false,
                scalable: false
            });
            updateCropBtnUI(imgId, true);
        }
    }

    function updateCropBtnUI(imgId, isCropping) {
        const btn = document.getElementById(`btnCrop-${imgId}`);
        if (!btn) return;
        if (isCropping) {
            btn.innerHTML = `<i class="fa-solid fa-check me-1"></i> Apply`;
            btn.classList.add("btn-crop-active");
        } else {
            btn.innerHTML = `<i class="fa-solid fa-crop-simple me-1"></i> Crop`;
            btn.classList.remove("btn-crop-active");
        }
    }

    function rotateImage(imgId) {
        const img = document.getElementById(imgId);
        if (!img || !img.src || img.style.display === "none") return;

        if (croppers[imgId]) {
            croppers[imgId].destroy();
            croppers[imgId] = null;
            updateCropBtnUI(imgId, false);
        }

        const source = new Image();
        source.crossOrigin = "anonymous";
        source.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            // Swap width and height for 90-degree turn
            canvas.width = source.naturalHeight;
            canvas.height = source.naturalWidth;

            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((90 * Math.PI) / 180);
            ctx.drawImage(source, -source.naturalWidth / 2, -source.naturalHeight / 2);

            const rotatedData = canvas.toDataURL("image/jpeg", 0.95);
            img.src = rotatedData;
            preFilterBases[imgId] = rotatedData;
            pushHistory(imgId, rotatedData);
        };
        source.src = img.src;
    }

    function applyFilter(imgId, type) {
        const img = document.getElementById(imgId);
        if (!img || !img.src || img.style.display === "none") return;

        const baseImageSrc = preFilterBases[imgId] || img.src;
        if (type === "none") {
            img.src = baseImageSrc;
            pushHistory(imgId, baseImageSrc);
            return;
        }

        const temp = new Image();
        temp.crossOrigin = "anonymous";
        temp.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = temp.naturalWidth;
            canvas.height = temp.naturalHeight;
            ctx.drawImage(temp, 0, 0);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
                const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                if (type === "grayscale") {
                    d[i] = gray; d[i + 1] = gray; d[i + 2] = gray;
                } else if (type === "bw") {
                    const bin = gray > 142 ? 255 : 0;
                    d[i] = bin; d[i + 1] = bin; d[i + 2] = bin;
                }
            }
            ctx.putImageData(imgData, 0, 0);
            const filteredData = canvas.toDataURL("image/jpeg", 0.95);
            img.src = filteredData;
            pushHistory(imgId, filteredData);
        };
        temp.src = baseImageSrc;
    }

    function resetImage(imgId) {
        const img = document.getElementById(imgId);
        if (!img) return;

        if (croppers[imgId]) {
            croppers[imgId].destroy();
            croppers[imgId] = null;
            updateCropBtnUI(imgId, false);
        }

        img.src = "";
        img.style.display = "none";
        historyStacks[imgId] = [];
        redoStacks[imgId] = [];
        preFilterBases[imgId] = null;

        const container = img.closest(".canvas-workspace");
        const placeholder = container.querySelector(".drop-zone-placeholder");
        const input = container.querySelector("input[type='file']");

        if (placeholder) placeholder.style.display = "flex";
        if (input) input.value = "";
        updateUndoRedoUI(imgId);
    }

    function updateCardScale(value) {
        userCardScale = parseInt(value, 10) / 100;
        document.getElementById("scaleValLabel").textContent = `${value}%`;
    }

    function saveFull(imgId) {
        const img = document.getElementById(imgId);
        if (!img || !img.src || img.style.display === "none") return alert("No image loaded.");
        const a = document.createElement("a");
        a.href = img.src;
        a.download = `PrintStudio_${Date.now()}.jpeg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // =============================================================
    // PRINT LOGIC: Strict physical A4 (210mm x 297mm) bounds
    // Solves multi-page spillover and aspect-ratio shrinkage on mobile
    // =============================================================

    function printFullPage(imgId) {
        const img = document.getElementById(imgId);
        if (!img || !img.src || img.style.display === "none") return alert("Upload an image first.");

        const win = window.open("", "_blank");
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Print Document</title>
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    * {
                        box-sizing: border-box;
                    }
                    html, body {
                        width: 210mm;
                        height: 297mm;
                        margin: 0;
                        padding: 0;
                        background: #ffffff;
                        overflow: hidden;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .page-container {
                        width: 210mm;
                        height: 297mm;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 8mm;
                        page-break-inside: avoid;
                        page-break-after: avoid;
                    }
                    .page-container img {
                        max-width: 100%;
                        max-height: 100%;
                        width: auto;
                        height: auto;
                        object-fit: contain;
                        display: block;
                    }
                </style>
            </head>
            <body>
                <div class="page-container">
                    <img src="${img.src}" />
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 250);
                    };
                <\/script>
            </body>
            </html>
        `);
        win.document.close();
    }

    function saveIDCopy(fId, bId) {
        const fImg = document.getElementById(fId);
        const bImg = document.getElementById(bId);

        const hasF = fImg && fImg.src && fImg.style.display !== "none";
        const hasB = bImg && bImg.src && bImg.style.display !== "none";

        if (!hasF && !hasB) return alert("Upload at least one side of the ID.");

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 2480;
        canvas.height = 3508;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const halfPageH = canvas.height / 2;
        const targetCardH = halfPageH * userCardScale;

        const drawSlot = (src, yCenter) => {
            return new Promise((resolve) => {
                if (!src) return resolve();
                const image = new Image();
                image.onload = () => {
                    const aspect = image.naturalWidth / image.naturalHeight;
                    const drawH = targetCardH;
                    const drawW = drawH * aspect;
                    const x = (canvas.width - drawW) / 2;
                    const y = yCenter - (drawH / 2);
                    ctx.drawImage(image, x, y, drawW, drawH);
                    resolve();
                };
                image.src = src;
            });
        };

        Promise.all([
            drawSlot(hasF ? fImg.src : null, canvas.height * 0.25),
            drawSlot(hasB ? bImg.src : null, canvas.height * 0.75)
        ]).then(() => {
            const a = document.createElement("a");
            a.href = canvas.toDataURL("image/jpeg", 0.95);
            a.download = `ID_Sheet_${Math.round(userCardScale * 100)}pct_${Date.now()}.jpeg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

    function printIDCopy(fId, bId) {
        const fImg = document.getElementById(fId);
        const bImg = document.getElementById(bId);

        const fSrc = (fImg && fImg.src && fImg.style.display !== "none") ? fImg.src : "";
        const bSrc = (bImg && bImg.src && bImg.style.display !== "none") ? bImg.src : "";

        if (!fSrc && !bSrc) return alert("Upload at least one side to print.");

        // Exact millimeter height per card based on half-page (148.5mm)
        const targetCardHeightMm = Math.round(148.5 * userCardScale * 0.88);

        const win = window.open("", "_blank");
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Print ID Duplex</title>
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    * {
                        box-sizing: border-box;
                    }
                    html, body {
                        width: 210mm;
                        height: 297mm;
                        margin: 0;
                        padding: 0;
                        background: #ffffff;
                        overflow: hidden;
                        page-break-inside: avoid;
                        page-break-after: avoid;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .half-page {
                        width: 210mm;
                        height: 148.5mm;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        overflow: hidden;
                        page-break-inside: avoid;
                        page-break-after: avoid;
                    }
                    .card-box {
                        height: ${targetCardHeightMm}mm;
                        max-width: 190mm;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .card-box img {
                        max-height: 100%;
                        max-width: 100%;
                        width: auto;
                        height: auto;
                        object-fit: contain;
                        display: block;
                    }
                </style>
            </head>
            <body>
                <div class="half-page">
                    ${fSrc ? `<div class="card-box"><img src="${fSrc}"></div>` : ''}
                </div>
                <div class="half-page">
                    ${bSrc ? `<div class="card-box"><img src="${bSrc}"></div>` : ''}
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 250);
                    };
                <\/script>
            </body>
            </html>
        `);
        win.document.close();
    }

    function switchMode(mode) {
        const fullSec = document.getElementById("fullPageSection");
        const idSec = document.getElementById("idCopySection");
        const tabFull = document.getElementById("tabFullBtn");
        const tabId = document.getElementById("tabIdBtn");
        const fullActs = document.getElementById("fullHeaderActions");
        const idActs = document.getElementById("idHeaderActions");

        if (mode === "full") {
            fullSec.classList.remove("d-none");
            idSec.classList.add("d-none");
            tabFull.classList.add("active");
            tabId.classList.remove("active");
            fullActs.classList.remove("d-none");
            fullActs.classList.add("d-flex");
            idActs.classList.add("d-none");
            idActs.classList.remove("d-flex");
            setActiveTarget(document.getElementById("canvas-container-main"));
        } else {
            fullSec.classList.add("d-none");
            idSec.classList.remove("d-none");
            tabFull.classList.remove("active");
            tabId.classList.add("active");
            fullActs.classList.add("d-none");
            fullActs.classList.remove("d-flex");
            idActs.classList.remove("d-none");
            idActs.classList.add("d-flex");
            setActiveTarget(document.getElementById("canvas-container-front"));
        }
    }

    function setActiveTarget(container) {
        document.querySelectorAll(".canvas-workspace").forEach(c => c.classList.remove("active-target"));
        if (container) {
            container.classList.add("active-target");
            activeContainer = container;
        }
    }

    document.querySelectorAll(".canvas-workspace").forEach(box => {
        box.addEventListener("click", () => setActiveTarget(box));
        box.addEventListener("focus", () => setActiveTarget(box));
        box.addEventListener("mouseenter", () => setActiveTarget(box));

        box.addEventListener("dragover", (e) => {
            e.preventDefault();
            box.classList.add("drag-active");
        });
        box.addEventListener("dragleave", () => box.classList.remove("drag-active"));
        box.addEventListener("drop", (e) => {
            e.preventDefault();
            box.classList.remove("drag-active");
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = ev => setupImageToZone(box.querySelector("img").id, ev.target.result);
                reader.readAsDataURL(file);
            }
        });
    });

    document.addEventListener("paste", (e) => {
        if (!activeContainer) return;
        const items = (e.clipboardData || window.clipboardData).items;
        for (const item of items) {
            if (item.type.startsWith("image")) {
                const file = item.getAsFile();
                const reader = new FileReader();
                reader.onload = ev => {
                    const targetImg = activeContainer.querySelector("img");
                    if (targetImg) setupImageToZone(targetImg.id, ev.target.result);
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    });

    function loadImage(event, imgId) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => setupImageToZone(imgId, e.target.result);
        reader.readAsDataURL(file);
    }

    // Expose handlers to global window scope
    window.switchMode = switchMode;
    window.loadImage = loadImage;
    window.setRatio = setRatio;
    window.toggleCrop = toggleCrop;
    window.rotateImage = rotateImage;
    window.applyFilter = applyFilter;
    window.undoAction = undoAction;
    window.redoAction = redoAction;
    window.resetImage = resetImage;
    window.updateCardScale = updateCardScale;
    window.saveFull = saveFull;
    window.saveIDCopy = saveIDCopy;
    window.printFullPage = printFullPage;
    window.printIDCopy = printIDCopy;
});