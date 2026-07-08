/**
 * Branded report export — shared by the admin tables (subscriptions, payments…).
 *
 * Produces a single layout, rendered two ways:
 *   • PDF   → opens a print window with the auto-print hook.
 *   • Excel → downloads a styled HTML `.xls` (Excel reads HTML tables and keeps
 *             the inline styling, so the sheet matches the on-screen report).
 *
 * The look: تعاهد wordmark top-aligned to the reading edge, a muted subtitle
 * line, then a clean table with a navy (#2c2f7c) header and zebra rows.
 */

const BRAND = '#2c2f7c';
const LOGO_MAIN = '#292E76';
const LOGO_ACCENT = '#CBCBCA';

/* تعاهد wordmark — mirrors src/components/Logo.jsx (light variant). */
const LOGO_SVG = `<svg viewBox="0 0 150 50" width="84" height="28" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="تعاهد" style="display:block">
  <path fill="${LOGO_ACCENT}" d="M94.73,29.27v-6.81c0-0.44-0.36-0.8-0.8-0.8h0c-0.44,0-0.8,0.36-0.8,0.8v6.81H94.73z"/>
  <path fill="${LOGO_MAIN}" d="M88.13,24.37v3.29c0,0-0.35,2.51-2.51,2.51H68.04c0,0-1.39-0.26-2.08-1.13c0,0-1.16,1.13-2.27,1.13s-8.36,0-8.36,0s-2.62-0.35-2.62-2.77s0-7.57,0-7.57h2.94v7.4h8.66l-0.35-1.56H58.6V22.9h5.2c0,0,0.87-0.17,2.08,1.04c0,0,1.21-1.04,2.25-1.04s5.2,0,5.2,0v2.77h-5.54l-0.35,1.56H85.1v-2.94h3.03V24.37z M77.76,26.08L79.84,24l-2.08-2.08L75.69,24L77.76,26.08z M81.92,26.08L84,24l-2.08-2.08L79.84,24L81.92,26.08z M34.93,22.25c-3.83,1.06-2.26,4.76-2.26,4.76h-3.3c0-4.76-4.35-4.76-4.35-4.76v2.99c1.74,0,1.57,1.76,1.57,1.76h-4.35v2.82h3.48c1.91-0.35,2.26-2.82,2.26-2.82c0,2.29,2.26,2.82,2.26,2.82s2.26,0,3.94,0c1.68,0,2.32-1.06,2.32-1.06c1.22,1.06,2.05,1.06,2.05,1.06h8.21c3.48-0.18,3.18-4.11,3.18-4.11c-0.47-2.87-3.08-3.12-3.08-3.12s-4.8,0-6.89,0c-2.09,0-2.14-2.47-2.14-2.47h-2.91V22.25z M36.35,24.45c0.77,0,1.39,0.62,1.39,1.39c0,0.77-0.62,1.39-1.39,1.39c-0.77,0-1.39-0.62-1.39-1.39C34.96,25.07,35.58,24.45,36.35,24.45z M40.42,25.32H47c0,0,0.52,0.17,0.52,0.87c0,0,0,0.69-0.52,0.69h-6.95C40.05,26.88,40.42,26.36,40.42,25.32z"/>
  <path fill="${LOGO_MAIN}" d="M104.9,21.1h6.31c0,0,1.43-0.04,2.58,1.37c0,0,1.04-1.33,2.51-1.37h6.34v3.49H116l-0.35,1.86h12.12v3.46h-11.44c0,0-1.75-0.1-2.54-1.42c0,0-1,1.43-2.58,1.42l-11.43,0l-1.74-3.46h13.89l-0.35-1.86h-6.64l0-3.49"/>
  <text x="133" y="20" fill="${LOGO_MAIN}" font-size="6.5" font-weight="700" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">®</text>
</svg>`;

function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build the report document markup.
 * @param {object}   o
 * @param {string}   o.title     document/print title (browser tab + filename source)
 * @param {string}   o.subtitle  muted line under the logo
 * @param {Array}    o.columns   [{ header, get }]
 * @param {Array}    o.rows      data rows
 * @param {'rtl'|'ltr'} o.dir
 * @param {string}   o.lang
 * @param {'print'|'excel'} o.mode
 */
function buildReportHtml({ title, subtitle, columns, rows, dir = 'rtl', lang = 'ar', mode = 'print' }) {
  const align = dir === 'rtl' ? 'right' : 'left';

  const thStyle =
    `background:${BRAND};color:#ffffff;font-weight:700;font-size:12px;` +
    `padding:11px 14px;text-align:${align};white-space:nowrap;border:1px solid ${BRAND};`;
  const tdBase =
    `padding:10px 14px;color:#2b2b35;font-size:12px;` +
    `text-align:${align};white-space:nowrap;border-bottom:1px solid #ededf1;`;

  const headCells = columns.map((c) => `<th style="${thStyle}">${escapeHtml(c.header)}</th>`).join('');
  const bodyRows = rows
    .map((r, i) => {
      const zebra = i % 2 === 1 ? 'background:#f7f7fa;' : '';
      const cells = columns
        .map((c) => `<td style="${tdBase}${zebra}">${escapeHtml(c.get(r))}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  // Excel's HTML importer doesn't render inline SVG, so fall back to a text wordmark.
  const logo =
    mode === 'excel'
      ? `<div style="font-size:20px;font-weight:800;color:${LOGO_MAIN};font-family:Arial,Helvetica,sans-serif">تعاهد&reg;</div>`
      : LOGO_SVG;

  const printHook =
    mode === 'print' ? `<script>window.onload=function(){setTimeout(function(){window.print();},120);};<\/script>` : '';

  return `<!doctype html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8" />
  <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Tahoma, system-ui, -apple-system, sans-serif;
      padding: 40px; color: #1a1a2e; margin: 0;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .report-head { text-align: ${align}; margin-bottom: 22px; }
    .report-sub { color: #6b7280; font-size: 12.5px; margin-top: 10px; }
    .table-wrap { border: 1px solid #ededf1; border-radius: 10px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    @media print { @page { margin: 16mm 12mm; } }
  </style></head><body>
  <div class="report-head">
    ${logo}
    <div class="report-sub">${escapeHtml(subtitle)}</div>
  </div>
  <div class="table-wrap">
    <table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table>
  </div>
  ${printHook}
  </body></html>`;
}

/** Open a print window for PDF export. Returns false if the popup was blocked. */
export function printReportPdf(opts) {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(buildReportHtml({ ...opts, mode: 'print' }));
  win.document.close();
  return true;
}

/** Download a styled `.xls` (HTML table Excel can open). */
export function downloadReportExcel({ filename = 'report', ...opts }) {
  const html = buildReportHtml({ ...opts, mode: 'excel' });
  // BOM keeps Excel reading the UTF-8 (Arabic) content correctly.
  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
