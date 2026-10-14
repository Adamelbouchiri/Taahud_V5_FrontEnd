import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AlertTriangle, Search, X } from 'lucide-react';
import { admin } from '../../../services';
import { useTranslation } from '../../../i18n/LanguageContext';
import { formatNumber } from '../../../utils/money';
import { formatDate } from '../../../utils/date';
import { rasdLabels } from '../../../i18n/rasdLabel';
import { cityLabel } from '../../../config/cityTranslations';
import {
  RASD_STAGES,
  RASD_SECTORS,
  RASD_CONFIDENCE,
  RASD_COMPANY_CATEGORIES,
  RASD_COMPANY_SIZES,
  RASD_CONTACT_ROLES,
  RASD_RECORD_STATUSES,
  RASD_CITIES,
} from '../../../config/rasdConstants';
import { Badge, Modal } from '../AdminUI';
import Ltr from '../../Ltr';

/* ============================================================
 *  RasdAdminKit — pieces the رصد admin screens share.
 *  ----------------------------------------------------------------
 *    <RasdAdminNav />      tab strip across the five رصد screens
 *    <Notice />            success / error / warning strip
 *    <BatchStatusBadge />  queued · running · completed · failed
 *    <BatchStats />        the importer's free-form `stats` counters
 *    <RecordFormModal />   create / edit form with per-field 422s
 *    <DetailGrid />        label/value pairs for a record's detail
 *
 *  Numbers on these screens are Latin digits (RASD v1.3): ar-SA
 *  defaults to Arabic-Indic, and an admin copying a figure into a
 *  spreadsheet needs 0-9. `num()` is the one place that's decided.
 * ============================================================ */

export function num(n, lang) {
  if (n == null || n === '') return '—';
  return <Ltr>{formatNumber(n, lang, 0, { latin: true })}</Ltr>;
}

export function date(iso, lang) {
  return iso ? formatDate(iso, lang, { latin: true }) : '—';
}

/* ---------- Enum options ----------
   value = the BE enum (what filters and bodies send), label = our own
   translation of it. Cities stay Arabic as values; only their label
   is localized. */
export function useRasdOptions() {
  const { t, lang } = useTranslation();
  return useMemo(() => {
    const labels = rasdLabels(t);
    const of = (list, fn) => list.map((v) => ({ value: v, label: fn(v) }));
    return {
      labels,
      stages: of(RASD_STAGES, (v) => labels.stage(v)),
      sectors: of(RASD_SECTORS, (v) => labels.sector(v)),
      confidence: of(RASD_CONFIDENCE, (v) => labels.confidence(v)),
      categories: of(RASD_COMPANY_CATEGORIES, (v) => labels.category(v)),
      sizes: of(RASD_COMPANY_SIZES, (v) => labels.size(v)),
      contactRoles: of(RASD_CONTACT_ROLES, (v) => labels.contactRole(v)),
      statuses: of(RASD_RECORD_STATUSES, (v) => t(`admin.rasd.status.${v}`)),
      cities: of(RASD_CITIES, (v) => cityLabel(v, lang)),
    };
  }, [t, lang]);
}

/* ---------- Tab strip ---------- */
const TABS = [
  { to: '/admin/rasd', key: 'summary', end: true },
  { to: '/admin/rasd/projects', key: 'projects' },
  { to: '/admin/rasd/companies', key: 'companies' },
  { to: '/admin/rasd/contacts', key: 'contacts' },
  { to: '/admin/rasd/imports', key: 'imports' },
];

export function RasdAdminNav() {
  const { t } = useTranslation();
  return (
    <nav
      className="flex gap-1 mb-6 overflow-x-auto"
      style={{ borderBottom: '1px solid var(--border-default)' }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className="whitespace-nowrap"
          style={({ isActive }) => ({
            padding: '10px 14px',
            fontSize: 13.5,
            fontWeight: isActive ? 700 : 500,
            color: isActive ? 'var(--accent-primary)' : 'var(--text-ink-soft)',
            borderBottom: `2px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
            marginBottom: -1,
            textDecoration: 'none',
          })}
        >
          {t(`admin.rasd.tabs.${tab.key}`)}
        </NavLink>
      ))}
    </nav>
  );
}

/* ---------- Notice ---------- */
const NOTICE_TONES = {
  success: { bg: 'rgba(19,109,74,0.10)', border: 'rgba(19,109,74,0.22)', color: '#136d4a' },
  error: { bg: 'rgba(185,28,28,0.06)', border: 'rgba(185,28,28,0.18)', color: 'var(--accent-danger)' },
  warning: { bg: 'rgba(184,134,42,0.10)', border: 'rgba(184,134,42,0.28)', color: '#8a6416' },
};

export function Notice({ tone = 'success', children, className = 'mb-4' }) {
  if (!children) return null;
  const c = NOTICE_TONES[tone] || NOTICE_TONES.success;
  return (
    <div
      className={`p-3 rounded-[10px] ${className}`}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        fontSize: 13,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
      }}
    >
      {children}
    </div>
  );
}

/* ---------- Import batch bits ---------- */
const BATCH_TONE = {
  queued: 'muted',
  running: 'primary',
  completed: 'success',
  failed: 'danger',
};

export function isBatchPending(batch) {
  return batch?.status === 'queued' || batch?.status === 'running';
}

export function BatchStatusBadge({ batch }) {
  const { t } = useTranslation();
  if (!batch) return null;
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <Badge tone={BATCH_TONE[batch.status] || 'default'}>
        {t(`admin.rasd.imports.status.${batch.status}`)}
      </Badge>
      <Badge tone={batch.dry_run ? 'warning' : 'primary'}>
        {batch.dry_run ? t('admin.rasd.imports.dryRun') : t('admin.rasd.imports.realRun')}
      </Badge>
      {batch.undone && <Badge tone="muted">{t('admin.rasd.imports.undone')}</Badge>}
    </span>
  );
}

/* `stats` is whatever the row importer counted — created / updated /
   unchanged for contacts, created / matched_cr / matched_domain / … for
   companies, null for a dry run. Rendered generically so a new counter
   on the BE shows up without a release here. */
export function BatchStats({ stats }) {
  const { t, lang } = useTranslation();
  if (!stats || typeof stats !== 'object') return null;
  const entries = Object.entries(stats).filter(([, v]) => typeof v === 'number');
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([k, v]) => {
        const key = `admin.rasd.imports.stats.${k}`;
        const label = t(key);
        return (
          <Badge key={k} tone="default">
            {label === key ? k : label}: {num(v, lang)}
          </Badge>
        );
      })}
    </div>
  );
}

/* ---------- DetailGrid ---------- */
export function DetailGrid({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3" style={{ fontSize: 13 }}>
      {items
        .filter(Boolean)
        .map((it) => (
          <div key={it.label} className={it.wide ? 'sm:col-span-2' : ''}>
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text-muted)',
                fontWeight: 600,
                marginBottom: 2,
              }}
            >
              {it.label}
            </div>
            <div
              style={{
                color: 'var(--text-ink)',
                whiteSpace: it.wide ? 'pre-wrap' : undefined,
                wordBreak: 'break-word',
                lineHeight: 1.55,
              }}
            >
              {it.value === null || it.value === undefined || it.value === '' ? '—' : it.value}
            </div>
          </div>
        ))}
    </div>
  );
}

/* ============================================================
 *  RecordFormModal
 *  ----------------------------------------------------------------
 *  One form for create and edit across projects / companies /
 *  contacts, driven by a field list:
 *
 *    { name, label, type, options?, required?, hint?, wide?, min?, max? }
 *    type: text | textarea | select | number | date | email | url |
 *          money | company
 *
 *  On EDIT only the changed fields go out (PATCH semantics, and the
 *  BE logs exactly the fields that changed — a full body would make
 *  every save look like it touched everything). A cleared field is
 *  sent as null, not '', so «unknown» stays unknown.
 *
 *  422s are mapped back under their field: the BE's Arabic messages
 *  are written to be shown as-is, and the phone rule in particular
 *  must sit under the number that was refused, not in a banner.
 * ============================================================ */

function toFormValue(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function fromFormValue(field, raw) {
  const v = typeof raw === 'string' ? raw.trim() : raw;
  if (v === '' || v === undefined) return null;
  if (field.type === 'number' || field.type === 'money' || field.type === 'company') {
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  }
  return v;
}

export function RecordFormModal({
  open,
  onClose,
  title,
  fields,
  record, // null → create
  defaults = {},
  onSubmit, // (payload) => Promise
  submitLabel,
}) {
  const { t, lang } = useTranslation();
  const [values, setValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset whenever the modal opens on a (possibly different) record.
  useEffect(() => {
    if (!open) return;
    const init = {};
    fields.forEach((f) => {
      init[f.name] = toFormValue(record ? record[f.name] : defaults[f.name]);
    });
    setValues(init);
    setFieldErrors({});
    setFormError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record]);

  const set = (name, v) => {
    setValues((prev) => ({ ...prev, [name]: v }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const payload = useMemo(() => {
    const out = {};
    fields.forEach((f) => {
      const next = fromFormValue(f, values[f.name]);
      if (!record) {
        if (next !== null) out[f.name] = next;
        return;
      }
      const prev = fromFormValue(f, toFormValue(record[f.name]));
      if (next !== prev) out[f.name] = next;
    });
    return out;
  }, [fields, values, record]);

  const missingRequired = fields.some(
    (f) => f.required && fromFormValue(f, values[f.name]) === null
  );
  const unchanged = !!record && Object.keys(payload).length === 0;

  const handleSubmit = async () => {
    setBusy(true);
    setFieldErrors({});
    setFormError('');
    try {
      await onSubmit(payload);
    } catch (err) {
      const errors = err?.data?.errors;
      if (errors && typeof errors === 'object' && Object.keys(errors).length) {
        const mapped = {};
        const orphan = [];
        Object.entries(errors).forEach(([k, msgs]) => {
          const msg = Array.isArray(msgs) ? msgs[0] : msgs;
          if (fields.some((f) => f.name === k)) mapped[k] = msg;
          else orphan.push(msg);
        });
        setFieldErrors(mapped);
        setFormError(orphan.join('\n'));
      } else {
        setFormError(err?.message || t('admin.common.actionError'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      width={680}
      footer={
        <>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 18px' }}
            onClick={onClose}
            disabled={busy}
          >
            {t('admin.common.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 18px' }}
            onClick={handleSubmit}
            disabled={busy || missingRequired || unchanged}
          >
            {busy ? '…' : submitLabel || t('admin.common.save')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        {fields.map((f) => (
          <div key={f.name} className={f.wide ? 'sm:col-span-2' : ''}>
            <label className="field-label">
              {f.label}
              {f.required && <span style={{ color: 'var(--accent-danger)' }}> *</span>}
            </label>
            <FieldInput field={f} value={values[f.name] ?? ''} onChange={(v) => set(f.name, v)} />
            {fieldErrors[f.name] ? (
              <div className="field-hint" style={{ color: 'var(--accent-danger)' }}>
                {fieldErrors[f.name]}
              </div>
            ) : f.type === 'money' && values[f.name] && Number.isFinite(Number(values[f.name])) ? (
              <div className="field-hint">
                {num(Number(values[f.name]), lang)} {t('common.currency')}
              </div>
            ) : f.hint ? (
              <div className="field-hint">{f.hint}</div>
            ) : null}
          </div>
        ))}
      </div>
      <Notice tone="error" className="mt-4">
        {formError}
      </Notice>
    </Modal>
  );
}

function FieldInput({ field, value, onChange }) {
  const { t } = useTranslation();
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          className="field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{ padding: '12px 14px', resize: 'vertical' }}
        />
      );
    case 'select':
      return (
        <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{field.placeholder || t('admin.rasd.form.choose')}</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case 'company':
      return <CompanyPicker value={value} initialName={field.initialName} onChange={onChange} />;
    case 'money':
      // A plain number: «265000000», never «٢٦٥ مليون» or «≈ 265M» —
      // the hint under the field shows the formatted reading.
      return (
        <input
          className="field"
          inputMode="decimal"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        />
      );
    case 'number':
      return (
        <input
          className="field"
          type="number"
          dir="ltr"
          min={field.min}
          max={field.max}
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'date':
      // Native date inputs emit YYYY-MM-DD, which is exactly the BE format.
      return (
        <input
          className="field"
          type="date"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'email':
    case 'url':
      return (
        <input
          className="field"
          type={field.type}
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <input
          className="field"
          dir={field.ltr ? 'ltr' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/* ---------- CompanyPicker ----------
   Searches the admin company list by name and stores the id. The
   initial label comes from the record (contact.company.name) so an
   edit doesn't open on a bare number. */
function CompanyPicker({ value, initialName, onChange }) {
  const { t } = useTranslation();
  const [label, setLabel] = useState(initialName || '');
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [openList, setOpenList] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    setLabel(initialName || '');
  }, [initialName]);

  useEffect(() => {
    if (!openList || q.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const res = await admin.rasd.companies.list({ q: q.trim(), per_page: 10, sort: 'name', direction: 'asc' });
        if (!cancelled) setResults(res.data);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q, openList]);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpenList(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (value && !openList) {
    return (
      <div
        className="field flex items-center justify-between gap-2"
        style={{ display: 'flex', alignItems: 'center' }}
      >
        <span className="truncate">
          {label || `#${value}`} <span style={{ color: 'var(--text-muted)' }}>#{value}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            onChange('');
            setLabel('');
            setOpenList(true);
          }}
          aria-label={t('admin.rasd.form.changeCompany')}
          style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <Search
        size={14}
        style={{
          position: 'absolute',
          top: '50%',
          insetInlineStart: 12,
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}
      />
      <input
        className="field"
        style={{ paddingInlineStart: 34 }}
        value={q}
        placeholder={t('admin.rasd.form.companySearch')}
        onFocus={() => setOpenList(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpenList(true);
        }}
      />
      {openList && results.length > 0 && (
        <ul
          className="absolute z-10 w-full m-0 p-1 mt-1 overflow-y-auto"
          style={{
            listStyle: 'none',
            maxHeight: 220,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-elevated)',
          }}
        >
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full text-start"
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--text-ink)',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-canvas)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => {
                  onChange(String(c.id));
                  setLabel(c.name);
                  setQ('');
                  setOpenList(false);
                }}
              >
                {c.name}
                <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
                  {' '}
                  · #{c.id}
                  {c.city ? ` · ${c.city}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* Typed text is only a search — say so, or Save just sits
          disabled with no reason given. */}
      {q.trim().length >= 2 &&
        (searching ? (
          <div className="field-hint">{t('admin.rasd.form.companySearching')}</div>
        ) : openList && results.length === 0 ? (
          <div className="field-hint" style={{ color: 'var(--accent-danger)' }}>
            {t('admin.rasd.form.companyNoResults')}
          </div>
        ) : (
          <div className="field-hint" style={{ color: 'var(--accent-danger)' }}>
            {t('admin.rasd.form.companyPickHint')}
          </div>
        ))}
    </div>
  );
}

/* ---------- UnknownColumns ----------
   Shown loudly even on a successful import — it's the early warning
   that the source changed its header. */
export function UnknownColumns({ columns }) {
  const { t } = useTranslation();
  if (!Array.isArray(columns) || columns.length === 0) return null;
  return (
    <Notice tone="warning" className="mt-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 700 }}>{t('admin.rasd.imports.unknownColumns')}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {columns.map((c) => (
              <code
                key={c}
                style={{
                  padding: '1px 7px',
                  borderRadius: 6,
                  background: 'rgba(184,134,42,0.14)',
                  fontSize: 12,
                }}
              >
                {c}
              </code>
            ))}
          </div>
          <div className="mt-1" style={{ fontSize: 12 }}>
            {t('admin.rasd.imports.unknownColumnsHint')}
          </div>
        </div>
      </div>
    </Notice>
  );
}
