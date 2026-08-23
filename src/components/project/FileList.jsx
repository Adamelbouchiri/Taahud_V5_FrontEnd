import React from 'react';
import {
  Download,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  FileList — attachment rows for a project.
 *
 *  Shared by the user-side ProjectDetailsPage and the admin
 *  AdminProjectDetailPage so both render attachments the same
 *  way. Feed it whatever the API returns under `files`:
 *
 *    { id, original_name, mime_type, size_bytes, url, uploaded_at }
 *
 *  Older payloads only carried `file_path`, so the name/href
 *  lookups below keep falling back to it.
 * ============================================================ */

export default function FileList({ files }) {
  if (!Array.isArray(files) || files.length === 0) return null;

  return (
    <ul className="m-0 p-0 space-y-2">
      {files.map((f) => (
        <FileRow key={f.id} file={f} />
      ))}
    </ul>
  );
}

export function FileRow({ file }) {
  const { t } = useTranslation();
  const name =
    file.original_name ||
    file.file_path?.split('/').pop() ||
    file.url?.split('/').pop() ||
    t('projects.details.fileFallback', { id: file.id });
  const ext = name.split('.').pop()?.toLowerCase();
  const href = file.url || file.file_path;

  let Icon = FileText;
  let color = '#7a7a8c';
  let bg = '#f4f1e9';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    Icon = ImageIcon;
    color = '#2c2f7c';
    bg = 'rgba(44,47,124,0.08)';
  } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
    Icon = FileSpreadsheet;
    color = '#136d4a';
    bg = 'rgba(19,109,74,0.08)';
  } else if (ext === 'zip' || ext === 'rar') {
    Icon = FileArchive;
    color = '#3a3d99';
    bg = 'rgba(58,61,153,0.08)';
  } else if (ext === 'pdf') {
    color = '#b91c1c';
    bg = 'rgba(185,28,28,0.06)';
  }

  return (
    <li
      className="list-none flex items-center gap-3 px-4 py-3 rounded-[11px]"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-soft)',
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: bg,
          color,
        }}
      >
        <Icon size={16} strokeWidth={1.7} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="font-semibold truncate"
          style={{ fontSize: 13, color: 'var(--text-ink)' }}
        >
          {name}
        </div>
        {file.size_bytes != null && (
          <div
            style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}
          >
            {formatSize(file.size_bytes)}
          </div>
        )}
      </div>
      {href && (
        <a
          href={href}
          // `download` triggers a save-as instead of inline navigation,
          // and uses the original filename rather than the random hash
          // in the URL. Cross-origin file servers may ignore the hint
          // (browser falls back to opening in a new tab), but for the
          // same-origin Laravel storage symlink it works as expected.
          download={name}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center justify-center transition-colors"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-ink-soft)',
            flexShrink: 0,
          }}
          aria-label={t('projects.details.downloadAria', { name })}
        >
          <Download size={14} strokeWidth={1.8} />
        </a>
      )}
    </li>
  );
}

export function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
