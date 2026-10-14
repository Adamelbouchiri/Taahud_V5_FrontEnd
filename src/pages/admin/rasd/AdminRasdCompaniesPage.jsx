import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wand2, Users } from 'lucide-react';
import { admin } from '../../../services';
import { useTranslation } from '../../../i18n/LanguageContext';
import { cityLabel, regionLabel } from '../../../config/cityTranslations';
import { RASD_CONFIDENCE_TONE } from '../../../config/rasdConstants';
import { Badge, Modal, ConfirmDialog } from '../../../components/admin/AdminUI';
import RasdEntityPage from '../../../components/admin/rasd/RasdEntityPage';
import { useRasdOptions, num, Notice } from '../../../components/admin/rasd/RasdAdminKit';

/* ============================================================
 *  AdminRasdCompaniesPage — /admin/rasd/companies
 *
 *  The CR number is unique among live companies and is the ONLY merge
 *  key — «رفال» and «مرفال» are two companies. The BE enforces it and
 *  its 422 lands under the CR field.
 *
 *  The classify tool lives here. A plain run only fills unclassified
 *  rows; `force` re-classifies everyone and has wiped manual work
 *  before, so it sits behind a second, explicit confirmation.
 * ============================================================ */

export default function AdminRasdCompaniesPage() {
  const { t, lang } = useTranslation();
  const o = useRasdOptions();
  const L = o.labels;
  const tf = (k) => t(`admin.rasd.fields.${k}`);
  const yesNo = [
    { value: '1', label: t('admin.common.yes') },
    { value: '0', label: t('admin.common.no') },
  ];

  const filters = useMemo(
    () => [
      { name: 'category', label: tf('category'), type: 'select', options: o.categories },
      { name: 'size', label: tf('size'), type: 'select', options: o.sizes },
      { name: 'city', label: tf('city'), type: 'select', options: o.cities },
      { name: 'confidence', label: tf('confidence'), type: 'select', options: o.confidence },
      { name: 'status', label: tf('status'), type: 'select', options: o.statuses },
      { name: 'has_projects', label: t('admin.rasd.companies.hasProjects'), type: 'select', options: yesNo },
      { name: 'has_contacts', label: t('admin.rasd.companies.hasContacts'), type: 'select', options: yesNo },
      { name: 'has_website', label: t('admin.rasd.companies.hasWebsite'), type: 'select', options: yesNo },
      { name: 'batch_id', label: t('admin.rasd.common.batch'), type: 'number', minWidth: 120 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [o, t]
  );

  const sorts = useMemo(
    () =>
      ['updated_at:desc', 'name:asc', 'projects_count:desc', 'contacts_count:desc'].map((value) => ({
        value,
        label: t(`admin.rasd.sort.${value.replace(':', '_')}`),
      })),
    [t]
  );

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: tf('name'),
        render: (row) => (
          <div className="min-w-0" style={{ maxWidth: 300 }}>
            <div className="font-semibold truncate" style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>
              {row.name}
            </div>
            <div className="truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              #{row.id}
              {row.name_en ? ` · ${row.name_en}` : ''}
              {row.cr_number ? ` · ${t('admin.rasd.companies.crShort')} ${row.cr_number}` : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        label: tf('category'),
        render: (row) => (
          <div className="flex flex-col gap-1 items-start">
            <Badge tone={row.category === 'unclassified' || !row.category ? 'muted' : 'primary'}>
              {row.category ? L.category(row.category, row.category_label) : L.category('unclassified')}
            </Badge>
            {row.size && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{L.size(row.size, row.size_label)}</span>
            )}
          </div>
        ),
      },
      {
        key: 'city',
        label: tf('city'),
        render: (row) => (row.city ? cityLabel(row.city, lang) : '—'),
      },
      {
        key: 'counts',
        label: t('admin.rasd.companies.countsColumn'),
        render: (row) => (
          <span style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
            {num(row.projects_count ?? 0, lang)} {t('admin.rasd.companies.projectsShort')} ·{' '}
            {num(row.contacts_count ?? 0, lang)} {t('admin.rasd.companies.contactsShort')}
          </span>
        ),
      },
      {
        key: 'confidence',
        label: tf('confidence'),
        render: (row) =>
          row.confidence ? (
            <Badge tone={RASD_CONFIDENCE_TONE[row.confidence] || 'default'}>
              {L.confidence(row.confidence, row.confidence_label)}
            </Badge>
          ) : (
            '—'
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [L, t, lang]
  );

  const formFields = () => [
    { name: 'name', label: tf('name'), required: true },
    { name: 'name_en', label: tf('name_en'), ltr: true },
    { name: 'cr_number', label: tf('cr_number'), ltr: true, hint: t('admin.rasd.companies.crHint') },
    { name: 'category', label: tf('category'), type: 'select', options: o.categories },
    { name: 'city', label: tf('city'), type: 'select', options: o.cities },
    { name: 'region', label: tf('region') },
    { name: 'size', label: tf('size'), type: 'select', options: o.sizes },
    { name: 'website', label: tf('website'), ltr: true },
    { name: 'phone', label: tf('company_phone'), ltr: true },
    { name: 'email', label: tf('email'), type: 'email' },
    { name: 'linkedin_url', label: tf('linkedin_url'), type: 'url', wide: true },
    {
      name: 'confidence',
      label: tf('confidence'),
      type: 'select',
      options: o.confidence,
      placeholder: t('admin.rasd.form.defaultConfidence'),
    },
    {
      name: 'status',
      label: tf('status'),
      type: 'select',
      options: o.statuses,
      placeholder: t('admin.rasd.form.defaultStatus'),
    },
    { name: 'notes', label: tf('notes'), type: 'textarea', wide: true },
  ];

  const detailItems = (c) => [
    { label: tf('name_en'), value: c.name_en },
    { label: tf('cr_number'), value: c.cr_number },
    { label: tf('category'), value: c.category && L.category(c.category, c.category_label) },
    { label: tf('size'), value: c.size && L.size(c.size, c.size_label) },
    { label: tf('city'), value: c.city && cityLabel(c.city, lang) },
    { label: tf('region'), value: c.region && regionLabel(c.region, lang) },
    {
      label: tf('website'),
      value: c.website && (
        <a href={/^https?:\/\//i.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" dir="ltr">
          {c.website_normalized || c.website}
        </a>
      ),
    },
    { label: tf('company_phone'), value: c.phone && <span dir="ltr">{c.phone}</span> },
    { label: tf('email'), value: c.email && <span dir="ltr">{c.email}</span> },
    {
      label: tf('linkedin_url'),
      value: c.linkedin_url && (
        <a href={c.linkedin_url} target="_blank" rel="noreferrer" dir="ltr">
          {c.linkedin_url}
        </a>
      ),
    },
    { label: tf('confidence'), value: c.confidence && L.confidence(c.confidence, c.confidence_label) },
    { label: tf('status'), value: c.status && t(`admin.rasd.status.${c.status}`) },
    { label: tf('notes'), value: c.notes, wide: true },
  ];

  const detailExtra = (c) => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Link
          to={`/admin/rasd/contacts?company_id=${c.id}`}
          className="btn-secondary"
          style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }}
        >
          <Users size={14} />
          {t('admin.rasd.companies.viewContacts', { count: c.contacts_count ?? 0 })}
        </Link>
      </div>
      {Array.isArray(c.projects) && c.projects.length > 0 && (
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>
            {t('admin.rasd.companies.projectsOn', { count: c.projects.length })}
          </div>
          <ul className="m-0 p-0 flex flex-col gap-1" style={{ listStyle: 'none', fontSize: 13 }}>
            {c.projects.map((p, i) => (
              <li key={`${p.id}-${p.role}-${i}`} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {p.name}
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {' '}
                    · #{p.id}
                    {p.city ? ` · ${cityLabel(p.city, lang)}` : ''}
                  </span>
                </span>
                {p.role && <Badge tone="default">{L.role(p.role, p.role_label)}</Badge>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <>
      <RasdEntityPage
        service={admin.rasd.companies}
        i18n="admin.rasd.companies"
        filters={filters}
        sorts={sorts}
        columns={columns}
        formFields={formFields}
        detailItems={detailItems}
        detailExtra={detailExtra}
        fetchDetail
        headerActions={<ClassifyButton />}
      />
    </>
  );
}

/* ---------- Classify tool ---------- */
export function ClassifyButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = async (force) => {
    setBusy(true);
    setError('');
    try {
      const res = await admin.rasd.classifyCompanies({ force });
      setResult(res);
      setForceOpen(false);
    } catch (err) {
      setError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn-secondary"
        style={{ width: 'auto', padding: '10px 16px' }}
        onClick={() => {
          setResult(null);
          setError('');
          setOpen(true);
        }}
      >
        <Wand2 size={14} />
        {t('admin.rasd.classify.cta')}
      </button>

      <Modal
        open={open && !forceOpen}
        onClose={busy ? undefined : () => setOpen(false)}
        title={t('admin.rasd.classify.title')}
        width={520}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              {t('admin.common.close')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={() => run(false)}
              disabled={busy}
            >
              {busy ? '…' : t('admin.rasd.classify.run')}
            </button>
          </>
        }
      >
        <p className="m-0 mb-3" style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}>
          {t('admin.rasd.classify.description')}
        </p>
        {result && (
          <div className="mb-3">
            <Notice tone="success" className="">
              {result.message}
            </Notice>
            {result.output && (
              <pre
                className="mt-2 p-3 rounded-[10px] m-0"
                style={{
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-soft)',
                  fontSize: 12.5,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                }}
              >
                {result.output}
              </pre>
            )}
          </div>
        )}
        <Notice tone="error" className="mb-3">
          {error}
        </Notice>
        <div
          className="p-3 rounded-[10px]"
          style={{ border: '1px dashed rgba(185,28,28,0.35)', fontSize: 12.5, color: 'var(--text-ink-soft)' }}
        >
          <div className="mb-2">{t('admin.rasd.classify.forceIntro')}</div>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '7px 12px', fontSize: 12.5, borderColor: 'rgba(185,28,28,0.3)', color: '#b91c1c' }}
            onClick={() => {
              setError('');
              setForceOpen(true);
            }}
            disabled={busy}
          >
            {t('admin.rasd.classify.forceCta')}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={forceOpen}
        onClose={() => setForceOpen(false)}
        onConfirm={() => run(true)}
        title={t('admin.rasd.classify.forceTitle')}
        description={t('admin.rasd.classify.forceWarning')}
        requireReason={false}
        confirmLabel={t('admin.rasd.classify.forceConfirm')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="danger"
        busy={busy}
        error={error}
      />
    </>
  );
}
