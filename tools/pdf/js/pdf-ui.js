import { PDF_CONFIG } from './pdf-config.js';
import { formatBytes } from './pdf-files.js';

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

export function renderAppChrome(activeToolId) {
  const activeTool = PDF_CONFIG.TOOLS.find(t => t.id === activeToolId) || PDF_CONFIG.TOOLS[0];

  if (activeToolId !== 'dashboard') {
    try {
      const recent = JSON.parse(sessionStorage.getItem('ps_recent_tools') || '[]').filter(id => id !== activeToolId);
      recent.unshift(activeToolId);
      sessionStorage.setItem('ps_recent_tools', JSON.stringify(recent.slice(0, 4)));
    } catch (_) {}
  }

  const headerEl = document.getElementById('appHeader');
  if (headerEl) {
    headerEl.innerHTML = `
      <nav class="navbar navbar-expand-lg ps-navbar navbar-dark py-2 px-3 shadow-sm" aria-label="Main Navigation">
        <div class="container-fluid">
          <a class="navbar-brand d-flex align-items-center gap-2 fw-bold" href="../../../tools/pdf/pdf.html">
            <span class="bg-primary text-white rounded-3 d-inline-flex align-items-center justify-content-center" style="width:36px;height:36px;">
              <i class="bi bi-file-earmark-pdf-fill fs-5" aria-hidden="true"></i>
            </span>
            <span>PDF Studio</span>
          </a>
          <div class="d-flex align-items-center gap-2">
            <button id="themeToggleBtn" type="button" class="btn btn-sm btn-outline-light" aria-label="Toggle color theme">
              <i class="bi bi-moon-stars-fill" id="themeIcon" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </nav>
    `;
  }

  const breadcrumbEl = document.getElementById('appBreadcrumbs');
  if (breadcrumbEl) {
    breadcrumbEl.innerHTML = activeToolId === 'dashboard'
      ? `<nav aria-label="breadcrumb"><ol class="breadcrumb mb-0 small"><li class="breadcrumb-item active" aria-current="page">Dashboard</li></ol></nav>`
      : `<nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0 small">
            <li class="breadcrumb-item"><a href="../pdf.html" class="text-decoration-none"><i class="bi bi-house-door me-1" aria-hidden="true"></i>Dashboard</a></li>
            <li class="breadcrumb-item active" aria-current="page">${escapeHtml(activeTool.title)}</li>
          </ol>
        </nav>`;
  }

  const sidebarEl = document.getElementById('appSidebar');
  if (sidebarEl) {
    const linksHtml = PDF_CONFIG.TOOLS.map(t => `
      <a href="${t.href}" class="ps-nav-link ${t.id === activeToolId ? 'active' : ''}" ${t.id === activeToolId ? 'aria-current="page"' : ''}>
        <i class="bi ${t.icon} fs-5" aria-hidden="true"></i>
        <span>${escapeHtml(t.title)}</span>
      </a>
    `).join('');

    sidebarEl.innerHTML = `
      <div class="ps-sidebar p-3">
        <div class="text-uppercase small fw-bold text-secondary mb-2 px-2">Tools</div>
        <nav class="ps-nav-list d-flex flex-lg-column gap-1" aria-label="PDF Tools Navigation">
          ${linksHtml}
        </nav>
      </div>
    `;
  }

  const footerEl = document.getElementById('appFooter');
  if (footerEl) {
    footerEl.innerHTML = `
      <footer class="mt-auto py-3 border-top text-center small text-secondary">
        <div class="container">
          <strong>PDF Studio</strong>
        </div>
      </footer>
    `;
  }

  initThemeSwitch();
}

function initThemeSwitch() {
  const saved = localStorage.getItem('ps_theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', saved);
  const btn = document.getElementById('themeToggleBtn');
  const icon = document.getElementById('themeIcon');
  const updateIcon = theme => {
    if (icon) icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
  };
  updateIcon(saved);
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-bs-theme', current);
      localStorage.setItem('ps_theme', current);
      updateIcon(current);
    });
  }
}

export function showToast(message, variant = 'primary') {
  let container = document.getElementById('psToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'psToastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  const id = `toast-${Date.now()}`;
  const html = `
    <div id="${id}" class="toast align-items-center text-bg-${variant} border-0 show" role="status">
      <div class="d-flex">
        <div class="toast-body">${escapeHtml(message)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close notification"></button>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
  const el = document.getElementById(id);
  setTimeout(() => el?.remove(), 4000);
}

export async function copyCanvasOrDataUrlToClipboard(source) {
  if (!navigator.clipboard || !window.ClipboardItem) {
    throw new Error('Clipboard image copy is not supported in this browser.');
  }
  let pngBlob;
  if (source instanceof HTMLCanvasElement) {
    pngBlob = await new Promise(resolve => source.toBlob(resolve, 'image/png'));
  } else if (source instanceof Blob) {
    if (source.type === 'image/png') {
      pngBlob = source;
    } else {
      const bmp = await createImageBitmap(source);
      const c = document.createElement('canvas');
      c.width = bmp.width;
      c.height = bmp.height;
      c.getContext('2d').drawImage(bmp, 0, 0);
      pngBlob = await new Promise(resolve => c.toBlob(resolve, 'image/png'));
    }
  } else if (typeof source === 'string') {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = source;
    });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    pngBlob = await new Promise(resolve => c.toBlob(resolve, 'image/png'));
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
}

export function openCropModal({ imageSrc, initialCrop = { top: 0, right: 0, bottom: 0, left: 0 }, title = 'Crop Page' }) {
  return new Promise(resolve => {
    const modalId = `psCropModal-${Date.now()}`;
    const c = {
      top: initialCrop?.top || 0,
      right: initialCrop?.right || 0,
      bottom: initialCrop?.bottom || 0,
      left: initialCrop?.left || 0
    };

    const html = `
      <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}-label" aria-modal="true" role="dialog">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h2 class="modal-title h5" id="${modalId}-label"><i class="bi bi-crop me-2"></i>${escapeHtml(title)}</h2>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="row g-3 align-items-center">
                <div class="col-12 col-md-7 text-center">
                  <div class="ps-crop-stage">
                    <img src="${imageSrc}" alt="Crop Preview" id="${modalId}-img">
                    <div class="ps-crop-overlay-box" id="${modalId}-box"></div>
                  </div>
                </div>
                <div class="col-12 col-md-5">
                  <div class="mb-2">
                    <label class="form-label small fw-semibold d-flex justify-content-between">
                      <span>Top Inset (%)</span><span id="${modalId}-top-val">${c.top}%</span>
                    </label>
                    <input type="range" class="form-range" min="0" max="45" value="${c.top}" id="${modalId}-top">
                  </div>
                  <div class="mb-2">
                    <label class="form-label small fw-semibold d-flex justify-content-between">
                      <span>Bottom Inset (%)</span><span id="${modalId}-bottom-val">${c.bottom}%</span>
                    </label>
                    <input type="range" class="form-range" min="0" max="45" value="${c.bottom}" id="${modalId}-bottom">
                  </div>
                  <div class="mb-2">
                    <label class="form-label small fw-semibold d-flex justify-content-between">
                      <span>Left Inset (%)</span><span id="${modalId}-left-val">${c.left}%</span>
                    </label>
                    <input type="range" class="form-range" min="0" max="45" value="${c.left}" id="${modalId}-left">
                  </div>
                  <div class="mb-3">
                    <label class="form-label small fw-semibold d-flex justify-content-between">
                      <span>Right Inset (%)</span><span id="${modalId}-right-val">${c.right}%</span>
                    </label>
                    <input type="range" class="form-range" min="0" max="45" value="${c.right}" id="${modalId}-right">
                  </div>
                  <button type="button" class="btn btn-sm btn-outline-secondary w-100" id="${modalId}-reset">Reset Crop (0%)</button>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary fw-semibold" id="${modalId}-apply"><i class="bi bi-check2 me-1"></i>Apply Crop</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    const modalEl = document.getElementById(modalId);
    const bsModal = new window.bootstrap.Modal(modalEl);
    const boxEl = document.getElementById(`${modalId}-box`);

    const inputs = {
      top: document.getElementById(`${modalId}-top`),
      bottom: document.getElementById(`${modalId}-bottom`),
      left: document.getElementById(`${modalId}-left`),
      right: document.getElementById(`${modalId}-right`)
    };

    function updateOverlay() {
      const top = parseInt(inputs.top.value, 10) || 0;
      const bottom = parseInt(inputs.bottom.value, 10) || 0;
      const left = parseInt(inputs.left.value, 10) || 0;
      const right = parseInt(inputs.right.value, 10) || 0;

      document.getElementById(`${modalId}-top-val`).textContent = `${top}%`;
      document.getElementById(`${modalId}-bottom-val`).textContent = `${bottom}%`;
      document.getElementById(`${modalId}-left-val`).textContent = `${left}%`;
      document.getElementById(`${modalId}-right-val`).textContent = `${right}%`;

      boxEl.style.top = `${top}%`;
      boxEl.style.bottom = `${bottom}%`;
      boxEl.style.left = `${left}%`;
      boxEl.style.right = `${right}%`;
    }

    Object.values(inputs).forEach(inp => inp.addEventListener('input', updateOverlay));
    document.getElementById(`${modalId}-reset`).addEventListener('click', () => {
      Object.values(inputs).forEach(inp => { inp.value = 0; });
      updateOverlay();
    });

    let resolved = false;
    document.getElementById(`${modalId}-apply`).addEventListener('click', () => {
      resolved = true;
      const result = {
        top: parseInt(inputs.top.value, 10) || 0,
        bottom: parseInt(inputs.bottom.value, 10) || 0,
        left: parseInt(inputs.left.value, 10) || 0,
        right: parseInt(inputs.right.value, 10) || 0
      };
      bsModal.hide();
      resolve(result);
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      if (!resolved) resolve(null);
      modalEl.remove();
    });

    updateOverlay();
    bsModal.show();
  });
}

export function showErrorBanner(containerEl, err, onRetry = null) {
  if (!containerEl) return;
  containerEl.classList.remove('d-none');
  containerEl.innerHTML = `
    <div class="alert alert-danger d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3" role="alert">
      <div>
        <div class="fw-bold"><i class="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>${escapeHtml(err.message || 'Operation Failed')}</div>
        ${err.file ? `<div class="small mt-1"><strong>File:</strong> ${escapeHtml(err.file)}</div>` : ''}
        ${err.remediation ? `<div class="small mt-1 text-muted">${escapeHtml(err.remediation)}</div>` : ''}
      </div>
      ${onRetry ? `<button type="button" class="btn btn-sm btn-danger align-self-start align-self-md-center" id="errRetryBtn"><i class="bi bi-arrow-clockwise me-1"></i>Retry</button>` : ''}
    </div>
  `;
  if (onRetry) {
    containerEl.querySelector('#errRetryBtn')?.addEventListener('click', () => {
      containerEl.classList.add('d-none');
      onRetry();
    });
  }
}

export function clearErrorBanner(containerEl) {
  if (containerEl) {
    containerEl.classList.add('d-none');
    containerEl.innerHTML = '';
  }
}

export function updateProgressPanel(panelEl, { state, percent = 0, label = '', onCancel = null }) {
  if (!panelEl) return;
  if (state === 'Idle' || state === 'Ready') {
    panelEl.classList.add('d-none');
    return;
  }
  panelEl.classList.remove('d-none');
  panelEl.innerHTML = `
    <div class="card border-primary mb-3" role="region" aria-live="polite" aria-label="Task Progress">
      <div class="card-body py-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="fw-semibold"><span class="badge bg-primary me-2">${escapeHtml(state)}</span>${escapeHtml(label)}</span>
          <div class="d-flex align-items-center gap-2">
            <span class="small fw-bold">${Math.round(percent)}%</span>
            ${onCancel ? `<button type="button" class="btn btn-sm btn-outline-danger" id="cancelTaskBtn">Cancel</button>` : ''}
          </div>
        </div>
        <div class="progress" style="height: 10px;">
          <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar"
               style="width: ${Math.max(5, Math.min(100, percent))}%"
               aria-valuenow="${Math.round(percent)}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>
    </div>
  `;
  if (onCancel) {
    panelEl.querySelector('#cancelTaskBtn')?.addEventListener('click', onCancel);
  }
}

export function renderResultPanel(panelEl, { title, filename, size, pageCount, onDownload, onReset }) {
  if (!panelEl) return;
  panelEl.classList.remove('d-none');
  panelEl.innerHTML = `
    <div class="alert alert-success border-success p-4 mb-3" role="region" aria-live="polite">
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h3 class="h5 fw-bold text-success mb-1"><i class="bi bi-check-circle-fill me-2" aria-hidden="true"></i>${escapeHtml(title)}</h3>
          <p class="mb-0 small">
            <strong>File:</strong> ${escapeHtml(filename)} &bull;
            <strong>Size:</strong> ${formatBytes(size)}
            ${pageCount ? ` &bull; <strong>Pages/Items:</strong> ${pageCount}` : ''}
          </p>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-success fw-semibold" id="resultDownloadBtn">
            <i class="bi bi-download me-1" aria-hidden="true"></i>Download
          </button>
          <button type="button" class="btn btn-outline-secondary" id="resultStartOverBtn">
            <i class="bi bi-arrow-repeat me-1" aria-hidden="true"></i>Start New
          </button>
        </div>
      </div>
    </div>
  `;
  panelEl.querySelector('#resultDownloadBtn')?.addEventListener('click', onDownload);
  panelEl.querySelector('#resultStartOverBtn')?.addEventListener('click', onReset);
}

export function confirmAction({ title, message, confirmText = 'Confirm', variant = 'danger' }) {
  return new Promise(resolve => {
    const previousFocus = document.activeElement;
    const modalId = `psConfirmModal-${Date.now()}`;
    const html = `
      <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}-label" aria-modal="true" role="dialog">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h2 class="modal-title h5" id="${modalId}-label">${escapeHtml(title)}</h2>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">${escapeHtml(message)}</div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="${modalId}-cancel">Cancel</button>
              <button type="button" class="btn btn-${variant}" id="${modalId}-ok">${escapeHtml(confirmText)}</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    const modalEl = document.getElementById(modalId);
    const bsModal = new window.bootstrap.Modal(modalEl);
    let settled = false;

    modalEl.querySelector(`#${modalId}-ok`).addEventListener('click', () => {
      settled = true;
      bsModal.hide();
      resolve(true);
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      if (!settled) resolve(false);
      modalEl.remove();
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    });

    bsModal.show();
  });
}

export function bindDropzone(dropzoneEl, fileInputEl, onFilesSelected) {
  if (!dropzoneEl || !fileInputEl) return;

  dropzoneEl.addEventListener('click', e => {
    if (e.target !== fileInputEl) fileInputEl.click();
  });

  dropzoneEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputEl.click();
    }
  });

  ['dragenter', 'dragover'].forEach(evt => {
    dropzoneEl.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneEl.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    dropzoneEl.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneEl.classList.remove('dragover');
    });
  });

  dropzoneEl.addEventListener('drop', e => {
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) onFilesSelected(files);
  });

  fileInputEl.addEventListener('change', e => {
    const files = Array.from(e.target.files || []);
    if (files.length) onFilesSelected(files);
    fileInputEl.value = '';
  });
}