import { PDF_CONFIG } from './pdf-config.js';
import { renderAppChrome, escapeHtml, bindDropzone, showToast } from './pdf-ui.js';
import { revokeAllManagedUrls } from './pdf-files.js';

export function initToolPage(toolId) {
  renderAppChrome(toolId);
  window.addEventListener('unload', () => revokeAllManagedUrls());
}

export function initDashboardPage() {
  initToolPage('dashboard');
  const grid = document.getElementById('dashboardToolsGrid');
  const recentContainer = document.getElementById('recentToolsSection');

  const tools = PDF_CONFIG.TOOLS.filter(t => t.id !== 'dashboard');
 console.log('Dashboard tools:', tools);
  if (grid) {
    grid.innerHTML = tools.map(tool => `
      <div class="col-12 col-md-6 col-xl-4">
        <a href="${tool.href}" class="card h-100 text-decoration-none ps-workspace-card p-3 transition-all">
          <div class="d-flex align-items-start gap-3">
            <div class="bg-primary bg-opacity-10 text-primary rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style="width:48px;height:48px;">
              <i class="bi ${tool.icon} fs-4" aria-hidden="true"></i>
            </div>
            <div>
              <h2 class="h5 fw-bold mb-1 text-body">${escapeHtml(tool.title)}</h2>
              <p class="small text-secondary mb-0">${escapeHtml(tool.desc)}</p>
            </div>
          </div>
        </a>
      </div>
    `).join('');
  }

  try {
    const recentIds = JSON.parse(sessionStorage.getItem('ps_recent_tools') || '[]');
    if (recentIds.length > 0 && recentContainer) {
      const recentTools = recentIds.map(id => tools.find(t => t.id === id)).filter(Boolean);
      if (recentTools.length) {
        recentContainer.classList.remove('d-none');
        recentContainer.innerHTML = `
          <div class="mb-4">
            <h2 class="h6 text-uppercase fw-bold text-secondary mb-2">Recently Used in This Session</h2>
            <div class="d-flex flex-wrap gap-2">
              ${recentTools.map(t => `
                <a href="${t.href}" class="btn btn-sm btn-outline-primary">
                  <i class="bi ${t.icon} me-1" aria-hidden="true"></i>${escapeHtml(t.title)}
                </a>
              `).join('')}
            </div>
          </div>
        `;
      }
    }
  } catch (_) {}

  const quickDrop = document.getElementById('dashboardQuickDrop');
  const quickInput = document.getElementById('dashboardQuickInput');
  const quickModalEl = document.getElementById('quickRouteModal');

  if (quickDrop && quickInput && quickModalEl) {
    bindDropzone(quickDrop, quickInput, files => {
      const allImages = files.every(f => f.type.startsWith('image/'));
      const allPdfs = files.every(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
      const bodyEl = document.getElementById('quickRouteModalBody');
      if (!bodyEl) return;

      if (allImages) {
        bodyEl.innerHTML = `
          <p class="mb-3">You selected <strong>${files.length} image file(s)</strong>. Choose a tool to continue:</p>
          <div class="d-grid gap-2">
            <a href="image-to-pdf.html" class="btn btn-primary"><i class="bi bi-file-earmark-arrow-up me-2"></i>Open Image to PDF</a>
            <a href="scan.html" class="btn btn-outline-primary"><i class="bi bi-camera-fill me-2"></i>Open Scan to PDF</a>
          </div>
        `;
      } else if (allPdfs && files.length > 1) {
        bodyEl.innerHTML = `
          <p class="mb-3">You selected <strong>${files.length} PDF files</strong>. Recommended tool:</p>
          <div class="d-grid gap-2">
            <a href="merge.html" class="btn btn-primary"><i class="bi bi-arrows-angle-contract me-2"></i>Merge PDFs Together</a>
          </div>
        `;
      } else if (allPdfs && files.length === 1) {
        bodyEl.innerHTML = `
          <p class="mb-3">Selected <strong>${escapeHtml(files[0].name)}</strong>. What would you like to do?</p>
          <div class="d-grid gap-2">
            <a href="./tools/organize.html" class="btn btn-primary"><i class="bi bi-grid-3x3-gap-fill me-2"></i>Organize, Rotate & Delete Pages</a>
            <a href="./tools/split.html" class="btn btn-outline-primary"><i class="bi bi-arrows-angle-expand me-2"></i>Split or Extract Pages</a>
            <a href="./tools/pdf-to-image.html" class="btn btn-outline-primary"><i class="bi bi-file-earmark-image me-2"></i>Export Pages to Images</a>
          </div>
        `;
      } else {
        showToast('Please select either PDF files or supported images (JPG, PNG, WebP).', 'warning');
        return;
      }
      new window.bootstrap.Modal(quickModalEl).show();
    });
  }
}