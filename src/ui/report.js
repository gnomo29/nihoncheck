/**
 * Reportes de errores en lookup — localStorage + POST /api/reports.
 */

const STORAGE_KEY = 'reports_nihoncheck';

/** Evento de producto vía Sentry global (si está activo). */
function trackReporteEnviado(term, reportType) {
  const sentry = typeof globalThis !== 'undefined' && globalThis.NihonCheckSentry;
  if (sentry?.trackEvent) {
    sentry.trackEvent('reporte_enviado', { term, report: reportType });
  }
}

const CSV_COLUMNS = [
  'id',
  'date',
  'term',
  'report',
  'comment',
  'userAgent',
  'sourceUrl',
  'lookupData',
];

/**
 * Lee reportes guardados.
 * @returns {object[]}
 */
export function getReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Construye entrada normalizada de reporte.
 * @param {object} payload
 * @returns {object}
 */
export function buildReportEntry(payload) {
  const now = new Date().toISOString();
  return {
    id: payload.id || `r_${Date.now()}`,
    date: payload.date || payload.createdAt || now,
    term: String(payload.term || '').trim(),
    report: payload.report || 'lookup_error',
    comment: String(payload.comment || payload.message || '').trim(),
    userAgent:
      payload.userAgent ||
      (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    sourceUrl:
      payload.sourceUrl ||
      (typeof location !== 'undefined' ? location.href : ''),
    lookupData: payload.lookupData || null,
  };
}

/**
 * Guarda un reporte localmente.
 * @param {object} report
 * @returns {object}
 */
export function saveReport(report) {
  const entry = buildReportEntry(report);
  const list = getReports();
  list.push(entry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('No se pudo guardar reporte:', e);
  }
  return entry;
}

function csvCell(val) {
  const s = String(val ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

/**
 * Genera CSV de reportes guardados.
 * @returns {string}
 */
export function exportReportsCsv() {
  const rows = getReports();
  const lines = [CSV_COLUMNS.join(',')];

  for (const r of rows) {
    lines.push(
      [
        csvCell(r.id),
        csvCell(r.date || r.createdAt),
        csvCell(r.term),
        csvCell(r.report),
        csvCell(r.comment || r.message),
        csvCell(r.userAgent),
        csvCell(r.sourceUrl),
        csvCell(JSON.stringify(r.lookupData || {})),
      ].join(',')
    );
  }

  return lines.join('\n');
}

/**
 * Descarga reportes como archivo CSV en el navegador.
 * @param {string} [filename]
 */
export function exportCSV(filename) {
  if (typeof document === 'undefined') {
    return exportReportsCsv();
  }

  const csv = '\uFEFF' + exportReportsCsv();
  const name =
    filename ||
    `nihoncheck-reportes-${new Date().toISOString().slice(0, 10)}.csv`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Envía reporte al servidor (POST /api/reports).
 * @param {object} report
 * @param {string} [apiBase]
 */
export async function sendReportToApi(report, apiBase = '') {
  if (typeof fetch === 'undefined') {
    return { sent: false, reason: 'fetch no disponible' };
  }

  try {
    const res = await fetch(`${apiBase}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    const data = await res.json().catch(() => ({}));
    return { sent: res.ok, status: res.status, data };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

/**
 * Envía reporte a webhook si está configurado.
 * @param {object} report
 * @param {string} [webhookUrl]
 */
export async function sendReportWebhook(report, webhookUrl) {
  const url = webhookUrl || (typeof process !== 'undefined' && process.env?.WEBHOOK_URL);
  if (!url) return { sent: false, reason: 'WEBHOOK_URL no configurado' };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    return { sent: res.ok, status: res.status };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

/**
 * Envía reporte completo (local + API opcional).
 * @param {object} payload
 * @param {object} [opts]
 * @param {string} [opts.apiBase]
 * @param {boolean} [opts.postToApi]
 */
export async function submitReport(payload, opts = {}) {
  const entry = saveReport(payload);
  let api = { sent: false, reason: 'omitido' };

  if (opts.postToApi !== false && typeof location !== 'undefined' && location.protocol !== 'file:') {
    api = await sendReportToApi(entry, opts.apiBase ?? '');
  }

  trackReporteEnviado(entry.term, entry.report);

  return { entry, api };
}

/**
 * Inicializa modal de reporte en el DOM (navegador).
 * @param {object} opts
 * @param {string} opts.modalId
 * @param {string} opts.formId
 * @param {() => object|null} [opts.getLookupContext]
 * @param {string} [opts.apiBase]
 */
export function initReportModal(opts) {
  if (typeof document === 'undefined') return;

  const modal = document.getElementById(opts.modalId);
  const form = document.getElementById(opts.formId);
  if (!modal || !form) return;

  let pendingTerm = '';

  function openReport(term, lookupData) {
    pendingTerm = term || '';
    const termInput = form.querySelector('[name="report-term"]');
    const termVisible = form.querySelector('[name="report-term-visible"]');
    const dataInput = form.querySelector('[name="report-data"]');
    if (termInput) termInput.value = pendingTerm;
    if (termVisible) termVisible.value = pendingTerm;
    if (dataInput) dataInput.value = JSON.stringify(lookupData || opts.getLookupContext?.() || {});
    modal.removeAttribute('hidden');
    document.body.classList.add('modal-abierto');
    const commentEl = form.querySelector('[name="report-comment"]');
    if (commentEl) commentEl.focus();
  }

  function closeReport() {
    modal.setAttribute('hidden', '');
    document.body.classList.remove('modal-abierto');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reportType = form.querySelector('[name="report-type"]')?.value || 'lookup_error';
    const comment = form.querySelector('[name="report-comment"]')?.value?.trim() || '';
    if (!comment) return;

    const lookupData = opts.getLookupContext?.() || {};

    await submitReport(
      {
        term: pendingTerm,
        report: reportType,
        comment,
        lookupData,
      },
      { apiBase: opts.apiBase }
    );

    closeReport();
    form.reset();
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = 'Reporte guardado. Gracias.';
      toast.removeAttribute('hidden');
      setTimeout(() => toast.setAttribute('hidden', ''), 3000);
    }
  });

  modal.querySelectorAll('[data-action="cerrar-reporte"]').forEach((btn) => {
    btn.addEventListener('click', closeReport);
  });

  modal.addEventListener('click', (ev) => {
    if (ev.target === modal) closeReport();
  });

  return { openReport, closeReport };
}
