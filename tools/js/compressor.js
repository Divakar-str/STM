const CONFIG = {
    'photo-area': { w: 420, h: 525, maxKB: 20, dl: 'dl-photo', info: 'info-photo', res: 'res-photo', drop: 'photo-drop' },
    'sign-area': { w: 256, h: 64, maxKB: 20, dl: 'dl-sign', info: 'info-sign', res: 'res-sign', drop: 'sign-drop' }
};

let activeToolId = 'photo-area';

// 1. Tool Selection (Focus)
document.querySelectorAll('.pro-card').forEach(card => {
    card.addEventListener('mousedown', () => {
        activeToolId = card.id;
        card.focus();
    });
});

// 2. Click to Upload
document.getElementById('photo-drop').onclick = () => document.getElementById('input-photo').click();
document.getElementById('sign-drop').onclick = () => document.getElementById('input-sign').click();

document.getElementById('input-photo').onchange = (e) => handleFile(e.target.files[0], 'photo-area');
document.getElementById('input-sign').onchange = (e) => handleFile(e.target.files[0], 'sign-area');

// 3. Global Paste
window.addEventListener('paste', (e) => {
    const item = e.clipboardData.items[0];
    if (item && item.type.includes("image")) {
        handleFile(item.getAsFile(), activeToolId);
    }
});

// 4. Processing Engine
async function handleFile(file, toolId) {
    if (!file) return;
    const spec = CONFIG[toolId];
    document.getElementById('loader').classList.remove('d-none');

    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = spec.w;
    canvas.height = spec.h;

    // Background and Rendering
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, spec.w, spec.h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, spec.w, spec.h);

    // Iterative Compression Loop (Binary Search logic)
    let quality = 0.95;
    let blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));

    while (blob.size / 1024 > spec.maxKB && quality > 0.05) {
        quality -= 0.07;
        blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
    }

    // --- PREVIEW REPLACEMENT ---
    const url = URL.createObjectURL(blob);
    const dropBox = document.getElementById(spec.drop);
    
    // This replaces the icon with the actual image
    dropBox.innerHTML = `<img src="${url}" class="preview-img" alt="Preview">`;

    // Update Download Info
    document.getElementById(spec.info).innerText = (blob.size / 1024).toFixed(1) + " KB";
    document.getElementById(spec.dl).href = url;
    document.getElementById(spec.dl).download = `${toolId}_final.jpg`;
    document.getElementById(spec.res).classList.remove('d-none');

    document.getElementById('loader').classList.add('d-none');
}

function loadImage(file) {
    return new Promise(r => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => r(img);
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}