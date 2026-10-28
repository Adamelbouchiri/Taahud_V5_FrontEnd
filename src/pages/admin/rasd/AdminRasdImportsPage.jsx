import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Upload,
  UploadCloud,
  FileSpreadsheet,
  RefreshCw,
  Play,
  Undo2,
  Download,
  FileWarning,
  ExternalLink,
  Hash,
  X,
} from 'lucide-react';
import { admin } from '../../../services';
import { useTranslation } from '../../../i18n/LanguageContext';
import {
  PageHeader,
  Card,
  FilterBar,
  FilterSelect,
  DataTable,
  Pagination,
  ConfirmDialog,
} from '../../../components/admin/AdminUI';
import {
  RasdAdminNav,
  Notice,
  BatchStatusBadge,
  BatchStats,
  UnknownColumns,
  DetailGrid,
  isBatchPending,
  num,
  date,
} from '../../../components/admin/rasd/RasdAdminKit';

/* ============================================================
 *  AdminRasdImportsPage — /admin/rasd/imports
 *  ----------------------------------------------------------------
 *  The cycle (RASD_ADMIN_API.md §6):
 *
 *    upload (dry run) → poll every 2s → read the result
 *        rejections? → download CSV → fix → upload again
 *        «تنفيذ» (run) → a NEW real batch on the same stored file
 *        «تراجع» (undo) if needed
 *
 *  Uploads are ALWAYS dry runs. There is deliberately no «import for
 *  real» option at upload time — every bad column this month was
 *  caught by a dry run, and a button shouldn't make skipping it easy.
 *
 *  The Run / Undo buttons are drawn from the batch's own `can_run` /
 *  `can_undo`. The rules live in the BE resource alone; re-deriving
 *  them here is how they'd drift apart again.
 *
 *  `?batch=ID` opens a batch directly (the summary links here).
 * ============================================================ */

const TYPES = ['projects', 'companies', 'contacts'];
const POLL_MS = 2000;
const MAX_BYTES = 5 * 1024 * 1024;

const isCsv = (f) => /\.(csv|txt)$/i.test(f.name) || ['text/csv', 'text/plain'].includes(f.type);

const fileSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/* Drag-and-drop zone over a hidden <input type="file">. Click / Enter /
 * Space open the picker; a drop goes through the same `isCsv` check the
 * picker's `accept` gives for free. `dragDepth` counts enter/leave pairs
 * so hovering over the zone's children doesn't flicker the highlight. */
function FileDropzone({ inputRef, file, disabled, onChange, onReject }) {
  const { t } = useTranslation();
  const [over, setOver] = useState(false);
  const dragDepth = useRef(0);

  const pick = (f) => {
    if (!f) return;
    if (!isCsv(f)) {
      onReject();
      return;
    }
    onChange(f);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  const tooLarge = file && file.size > MAX_BYTES;
  const tone = over ? 'var(--accent-primary)' : file ? (tooLarge ? 'var(--accent-gold)' : 'var(--accent-secondary)') : 'var(--border-strong)';

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        if (disabled) return;
        dragDepth.current += 1;
        setOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setOver(false);
        if (!disabled) pick(e.dataTransfer.files?.[0]);
      }}
      className="relative rounded-xl transition-all outline-none focus-visible:ring-2"
      style={{
        border: `1.5px dashed ${tone}`,
        background: over
          ? 'color-mix(in srgb, var(--accent-primary) 7%, var(--bg-surface))'
          : 'var(--bg-surface-soft)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transform: over ? 'scale(1.01)' : 'none',
        padding: file ? '14px 16px' : '26px 16px',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {file ? (
        <div className="flex items-center gap-3">
          <span
            className="flex items-center justify-center rounded-lg shrink-0"
            style={{
              width: 42,
              height: 42,
              background: `color-mix(in srgb, ${tone} 12%, transparent)`,
              color: tone,
            }}
          >
            <FileSpreadsheet size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate" style={{ fontSize: 14, color: 'var(--text-ink)' }} dir="auto">
              {file.name}
            </div>
            <div style={{ fontSize: 12, color: tooLarge ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
              <span dir="ltr">{fileSize(file.size)}</span> · {t('admin.rasd.imports.dropReplace')}
            </div>
          </div>
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            aria-label={t('admin.rasd.imports.removeFile')}
            title={t('admin.rasd.imports.removeFile')}
            className="flex items-center justify-center rounded-lg shrink-0 transition-colors hover:bg-black/5"
            style={{ width: 32, height: 32, color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center pointer-events-none">
          <span
            className="flex items-center justify-center rounded-full mb-3 transition-transform"
            style={{
              width: 48,
              height: 48,
              background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
              color: 'var(--accent-primary)',
              transform: over ? 'translateY(-3px)' : 'none',
            }}
          >
            <UploadCloud size={24} />
          </span>
          <div className="font-semibold" style={{ fontSize: 14, color: 'var(--text-ink)' }}>
            {over ? t('admin.rasd.imports.dropActive') : t('admin.rasd.imports.dropTitle')}
          </div>
          <div className="mt-1" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {t('admin.rasd.imports.dropOr')}{' '}
            <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
              {t('admin.rasd.imports.dropBrowse')}
            </span>
          </div>
          <div className="mt-2" style={{ fontSize: 11.5, color: 'var(--text-muted)' }} dir="ltr">
            CSV · ≤ 5 MB
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminRasdImportsPage() {
  const { t, lang } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = searchParams.get('batch');

  const [type, setType] = useState('projects');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef(null);

  const [filters, setFilters] = useState({ type: '', status: '', dry_run: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], meta: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.rasd.imports.list({ ...filters, page, per_page: 20 });
      setData({ rows: res.data, meta: res.meta });
    } catch (err) {
      setError(err.message || t('admin.common.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openBatch = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('batch', String(id));
    else next.delete('batch');
    setSearchParams(next, { replace: true });
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const batch = await admin.rasd.imports.upload({ file, type });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      openBatch(batch.id);
      load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setUploadError(err.message || t('admin.common.actionError'));
    } finally {
      setUploading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'id',
        label: t('admin.rasd.imports.batch'),
        render: (row) => (
          <div className="min-w-0" style={{ maxWidth: 300 }}>
            <div className="font-semibold truncate" style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>
              #{row.id} · {row.filename}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t(`admin.rasd.imports.types.${row.type}`)} · {date(row.created_at, lang)}
              {row.uploaded_by?.name ? ` · ${row.uploaded_by.name}` : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        label: t('admin.rasd.fields.status'),
        render: (row) => <BatchStatusBadge batch={row} />,
      },
      {
        key: 'rows',
        label: t('admin.rasd.imports.rows'),
        render: (row) =>
          row.rows_total == null ? (
            '—'
          ) : (
            <span style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
              {num(row.rows_accepted, lang)} / {num(row.rows_total, lang)}
              {row.rows_rejected > 0 && (
                <span style={{ color: 'var(--accent-danger)' }}>
                  {' '}
                  · {t('admin.rasd.imports.rejectedShort')} {num(row.rows_rejected, lang)}
                </span>
              )}
            </span>
          ),
      },
      {
        key: 'flags',
        label: '',
        render: (row) =>
          row.unknown_columns?.length > 0 ? (
            <span title={row.unknown_columns.join(', ')} style={{ color: '#b8862a' }}>
              <FileWarning size={16} />
            </span>
          ) : null,
      },
    ],
    [t, lang]
  );

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.rasd.eyebrow')}
        title={t('admin.rasd.imports.title')}
        subtitle={t('admin.rasd.imports.subtitle')}
        actions={
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 16px' }}
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={14} />
            {t('admin.common.refresh')}
          </button>
        }
      />

      <RasdAdminNav />

      {activeId && (
        <div className="mb-5">
          <BatchPanel
            key={activeId}
            batchId={activeId}
            onClose={() => openBatch(null)}
            onChanged={load}
            onReplaced={(b) => {
              openBatch(b.id);
              load();
            }}
          />
        </div>
      )}

      {/* Upload */}
      <Card>
        <div className="font-semibold mb-1" style={{ fontSize: 15, color: 'var(--text-ink)' }}>
          {t('admin.rasd.imports.uploadTitle')}
        </div>
        <p className="m-0 mb-4" style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {t('admin.rasd.imports.uploadHint')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-start">
          <div>
            <label className="field-label">{t('admin.rasd.imports.type')}</label>
            <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((v) => (
                <option key={v} value={v}>
                  {t(`admin.rasd.imports.types.${v}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">{t('admin.rasd.imports.file')}</label>
            <FileDropzone
              inputRef={fileRef}
              file={file}
              disabled={uploading}
              onChange={(f) => {
                setFile(f);
                setUploadError('');
              }}
              onReject={() => setUploadError(t('admin.rasd.imports.notCsv'))}
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            type="button"
            className="btn-primary"
            style={{ width: 'auto', padding: '11px 18px' }}
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            <Upload size={14} />
            {uploading ? '…' : t('admin.rasd.imports.uploadCta')}
          </button>
        </div>
        {file && file.size > MAX_BYTES && (
          <Notice tone="warning" className="mt-3">
            {t('admin.rasd.imports.tooLarge')}
          </Notice>
        )}
        <Notice tone="error" className="mt-3">
          {uploadError}
        </Notice>
      </Card>

      {/* History */}
      <div className="mt-5">
        <FilterBar
          title={t('admin.rasd.imports.history')}
          activeCount={Object.values(filters).filter(Boolean).length}
          onReset={() => {
            setFilters({ type: '', status: '', dry_run: '' });
            setPage(1);
          }}
          resetLabel={t('admin.common.reset')}
        >
          <FilterSelect
            label={t('admin.rasd.imports.type')}
            value={filters.type}
            onChange={(v) => {
              setFilters((f) => ({ ...f, type: v }));
              setPage(1);
            }}
            options={[
              { value: '', label: t('admin.common.all') },
              ...TYPES.map((v) => ({ value: v, label: t(`admin.rasd.imports.types.${v}`) })),
            ]}
          />
          <FilterSelect
            label={t('admin.rasd.fields.status')}
            value={filters.status}
            onChange={(v) => {
              setFilters((f) => ({ ...f, status: v }));
              setPage(1);
            }}
            options={[
              { value: '', label: t('admin.common.all') },
              ...['queued', 'running', 'completed', 'failed'].map((v) => ({
                value: v,
                label: t(`admin.rasd.imports.status.${v}`),
              })),
            ]}
          />
          <FilterSelect
            label={t('admin.rasd.imports.mode')}
            value={filters.dry_run}
            onChange={(v) => {
              setFilters((f) => ({ ...f, dry_run: v }));
              setPage(1);
            }}
            options={[
              { value: '', label: t('admin.common.all') },
              { value: '1', label: t('admin.rasd.imports.dryRun') },
              { value: '0', label: t('admin.rasd.imports.realRun') },
            ]}
          />
        </FilterBar>
        <div className="mt-4">
          <Card padded={false}>
            <Notice tone="error" className="m-4">
              {error}
            </Notice>
            <DataTable
              columns={columns}
              rows={data.rows}
              rowKey={(row) => row.id}
              loading={loading}
              emptyTitle={t('admin.rasd.imports.empty')}
              onRowClick={(row) => {
                openBatch(row.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
            <Pagination meta={data.meta} onPage={setPage} t={t} />
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 *  BatchPanel — one batch, polled while it's queued/running.
 * ============================================================ */
function BatchPanel({ batchId, onClose, onChanged, onReplaced }) {
  const { t, lang } = useTranslation();
  const [batch, setBatch] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  const [rejections, setRejections] = useState(null);
  const [rejLoading, setRejLoading] = useState(false);

  const fetchBatch = useCallback(async () => {
    try {
      const b = await admin.rasd.imports.get(batchId);
      setBatch(b);
      setLoadError('');
      return b;
    } catch (err) {
      setLoadError(err.message || t('admin.common.loadError'));
      return null;
    }
  }, [batchId, t]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  // Poll while the worker has it. When it settles, refresh the history
  // list once so its row shows the final counts too.
  const pending = isBatchPending(batch);
  useEffect(() => {
    if (!pending) return undefined;
    const id = setInterval(async () => {
      const b = await fetchBatch();
      if (b && !isBatchPending(b)) onChanged?.();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [pending, fetchBatch, onChanged]);

  const handleRun = async () => {
    setBusy(true);
    setActionError('');
    try {
      const real = await admin.rasd.imports.run(batch.id);
      setRunOpen(false);
      onReplaced?.(real);
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    setBusy(true);
    setActionError('');
    try {
      const res = await admin.rasd.imports.undo(batch.id);
      const d = res?.deleted || {};
      setToast(
        `${res?.message || ''}\n${t('admin.rasd.imports.undoResult', {
          projects: d.projects ?? 0,
          companies: d.companies ?? 0,
          contacts: d.contacts ?? 0,
          updated: d.updated_only ?? 0,
        })}`
      );
      setUndoOpen(false);
      await fetchBatch();
      onChanged?.();
    } catch (err) {
      // 422s carry ready-to-show Arabic: dry run / not completed / only
      // updated rows (the last one with `counts`).
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const loadRejections = async () => {
    setRejLoading(true);
    setActionError('');
    try {
      setRejections(await admin.rasd.imports.rejections(batch.id));
    } catch (err) {
      setActionError(err.message || t('admin.common.loadError'));
    } finally {
      setRejLoading(false);
    }
  };

  const saveCsv = async (fetchBlob, filename, errorKey) => {
    setActionError('');
    try {
      const blob = await fetchBlob(batch.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // A blob error body can't be read as JSON here, so fall back to
      // our own message.
      setActionError(t(errorKey));
    }
  };

  const downloadCsv = () =>
    saveCsv(admin.rasd.imports.rejectionsCsv, `rejections-${batch.id}.csv`, 'admin.rasd.imports.csvError');

  // v1.5 — a project uploaded with an empty «معرّف المشروع» got its TAID
  // here, and this file is the only way the data team learns it. Without
  // it next month's upload duplicates those rows instead of updating them.
  const downloadTaids = () =>
    saveCsv(admin.rasd.imports.taidsCsv, `taids-${batch.id}.csv`, 'admin.rasd.imports.taidsError');

  if (!batch) {
    return (
      <Card>
        {loadError ? (
          <Notice tone="error" className="">
            {loadError}
          </Notice>
        ) : (
          <div className="shimmer" style={{ height: 14, width: 180, borderRadius: 6 }} />
        )}
      </Card>
    );
  }

  // The doc wants «created N, updated M — undo deletes the N and does
  // not restore the M» in the confirmation. Only the row importers that
  // count `created` let us say that; otherwise the wording stays general.
  const created = typeof batch.stats?.created === 'number' ? batch.stats.created : null;
  const updated =
    typeof batch.stats?.updated === 'number'
      ? batch.stats.updated
      : Math.max(0, (batch.rows_accepted ?? 0) - (created ?? 0));
  const undoDescription =
    created != null
      ? t('admin.rasd.imports.undoDescriptionCounts', { created, updated })
      : t('admin.rasd.imports.undoDescription');

  return (
    <Card style={{ borderColor: 'rgba(44,47,124,0.35)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="min-w-0">
          <div className="font-semibold" style={{ fontSize: 16, color: 'var(--text-ink)' }}>
            #{batch.id} · {batch.filename}
          </div>
          <div className="mt-1.5">
            <BatchStatusBadge batch={batch} />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('admin.common.close')}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={15} />
        </button>
      </div>

      {pending && (
        <Notice tone="warning">{t('admin.rasd.imports.polling')}</Notice>
      )}
      <Notice tone="success">{toast}</Notice>

      <DetailGrid
        items={[
          { label: t('admin.rasd.imports.type'), value: t(`admin.rasd.imports.types.${batch.type}`) },
          { label: t('admin.rasd.imports.uploadedBy'), value: batch.uploaded_by?.name },
          { label: t('admin.rasd.imports.rowsTotal'), value: batch.rows_total == null ? null : num(batch.rows_total, lang) },
          {
            label: t('admin.rasd.imports.rowsAccepted'),
            value: batch.rows_accepted == null ? null : num(batch.rows_accepted, lang),
          },
          {
            label: t('admin.rasd.imports.rowsRejected'),
            value:
              batch.rows_rejected == null ? null : (
                <span style={{ color: batch.rows_rejected > 0 ? 'var(--accent-danger)' : undefined, fontWeight: 600 }}>
                  {num(batch.rows_rejected, lang)}
                </span>
              ),
          },
          { label: t('admin.rasd.imports.finishedAt'), value: batch.finished_at && date(batch.finished_at, lang) },
          batch.undone_at && { label: t('admin.rasd.imports.undoneAt'), value: date(batch.undone_at, lang) },
          batch.notes && { label: t('admin.rasd.fields.notes'), value: batch.notes, wide: true },
        ]}
      />

      {batch.stats && (
        <div className="mt-3">
          <BatchStats stats={batch.stats} />
        </div>
      )}

      <UnknownColumns columns={batch.unknown_columns} />

      {batch.status === 'failed' && batch.error && (
        <Notice tone="error" className="mt-3">
          {batch.error}
        </Notice>
      )}

      {batch.dry_run && batch.status === 'completed' && (
        <Notice tone="warning" className="mt-3">
          {t('admin.rasd.imports.dryRunDone')}
        </Notice>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {batch.can_run && (
          <button
            type="button"
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 16px' }}
            onClick={() => {
              setActionError('');
              setRunOpen(true);
            }}
          >
            <Play size={14} />
            {t('admin.rasd.imports.run')}
          </button>
        )}
        {batch.rows_rejected > 0 && (
          <>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 16px' }}
              onClick={loadRejections}
              disabled={rejLoading}
            >
              <FileWarning size={14} />
              {rejLoading ? '…' : t('admin.rasd.imports.showRejections')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 16px' }}
              onClick={downloadCsv}
            >
              <Download size={14} />
              {t('admin.rasd.imports.downloadCsv')}
            </button>
          </>
        )}
        {!batch.dry_run && batch.status === 'completed' && (
          <Link
            to={`/admin/rasd/${batch.type}?batch_id=${batch.id}`}
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 16px' }}
          >
            <ExternalLink size={14} />
            {t('admin.rasd.imports.viewRows')}
          </Link>
        )}
        {/* Dry runs assign no numbers (the endpoint 422s), and only
            project batches touch rows that carry a TAID. */}
        {!batch.dry_run && batch.status === 'completed' && batch.type === 'projects' && (
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 16px' }}
            onClick={downloadTaids}
          >
            <Hash size={14} />
            {t('admin.rasd.imports.downloadTaids')}
          </button>
        )}
        {batch.can_undo && (
          <button
            type="button"
            className="btn-secondary"
            style={{
              width: 'auto',
              padding: '10px 16px',
              borderColor: 'rgba(185,28,28,0.3)',
              color: '#b91c1c',
            }}
            onClick={() => {
              setActionError('');
              setUndoOpen(true);
            }}
          >
            <Undo2 size={14} />
            {t('admin.rasd.imports.undo')}
          </button>
        )}
      </div>

      <Notice tone="error" className="mt-3">
        {!runOpen && !undoOpen ? actionError : ''}
      </Notice>

      {Array.isArray(rejections) && (
        <div className="mt-4">
          <RejectionsTable rows={rejections} />
        </div>
      )}

      <ConfirmDialog
        open={runOpen}
        onClose={() => setRunOpen(false)}
        onConfirm={handleRun}
        title={t('admin.rasd.imports.runTitle')}
        description={t('admin.rasd.imports.runDescription', {
          accepted: batch.rows_accepted ?? 0,
          rejected: batch.rows_rejected ?? 0,
        })}
        requireReason={false}
        confirmLabel={t('admin.rasd.imports.run')}
        cancelLabel={t('admin.common.cancel')}
        busy={busy}
        error={actionError}
      />

      <ConfirmDialog
        open={undoOpen}
        onClose={() => setUndoOpen(false)}
        onConfirm={handleUndo}
        title={t('admin.rasd.imports.undoTitle')}
        description={undoDescription}
        requireReason={false}
        confirmLabel={t('admin.rasd.imports.undo')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="danger"
        busy={busy}
        error={actionError}
      />
    </Card>
  );
}

function RejectionsTable({ rows }) {
  const { t, lang } = useTranslation();
  if (rows.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('admin.rasd.imports.noRejections')}</div>
    );
  }
  return (
    <div
      className="overflow-x-auto rounded-[10px]"
      style={{ border: '1px solid var(--border-soft)', maxHeight: 420, overflowY: 'auto' }}
    >
      <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: 'var(--bg-canvas)' }}>
            <th className="text-start" style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
              {t('admin.rasd.imports.sheetRow')}
            </th>
            <th className="text-start" style={{ padding: '8px 12px' }}>
              {t('admin.rasd.imports.reason')}
            </th>
            <th className="text-start" style={{ padding: '8px 12px' }}>
              {t('admin.rasd.imports.original')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.row} style={{ borderTop: '1px solid var(--border-soft)', verticalAlign: 'top' }}>
              <td style={{ padding: '8px 12px', fontWeight: 600 }}>{num(r.row, lang)}</td>
              <td style={{ padding: '8px 12px', color: 'var(--accent-danger)' }}>
                {(r.errors || []).map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </td>
              <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                {r.original
                  ? Object.entries(r.original).map(([k, v]) => (
                      <div key={k}>
                        <span style={{ fontWeight: 600 }}>{k}:</span> {String(v ?? '')}
                      </div>
                    ))
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
