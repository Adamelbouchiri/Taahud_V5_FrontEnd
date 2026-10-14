import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { admin } from '../../../services';
import { useTranslation } from '../../../i18n/LanguageContext';
import { RASD_CONFIDENCE_TONE } from '../../../config/rasdConstants';
import { Badge } from '../../../components/admin/AdminUI';
import RasdEntityPage from '../../../components/admin/rasd/RasdEntityPage';
import { useRasdOptions } from '../../../components/admin/rasd/RasdAdminKit';

/* ============================================================
 *  AdminRasdContactsPage — /admin/rasd/contacts
 *
 *  Phone and email are shown IN FULL here — the admin owns the data;
 *  masking is a subscriber concern. (The audit log, by contrast, only
 *  ever records field NAMES for contact edits.)
 *
 *  `reachable` is the filter that matters: «which of the 350 can we
 *  actually reach». `reachable=none` is the admin's work queue — the
 *  people we have a name and title for but no way to contact — and
 *  the summary card links straight to it.
 *
 *  `phone` must normalize to a direct Saudi mobile (+9665…). A 920
 *  switchboard or a landline is refused, and the BE's message shows
 *  under the phone field so it's clear which number was rejected.
 * ============================================================ */

export default function AdminRasdContactsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const o = useRasdOptions();
  const L = o.labels;
  const tf = (k) => t(`admin.rasd.fields.${k}`);

  const filters = useMemo(
    () => [
      {
        name: 'reachable',
        label: t('admin.rasd.contacts.reachable'),
        type: 'select',
        options: ['any', 'mobile', 'email', 'none'].map((v) => ({
          value: v,
          label: t(`admin.rasd.contacts.reach.${v}`),
        })),
      },
      { name: 'role_category', label: tf('role_category'), type: 'select', options: o.contactRoles },
      { name: 'confidence', label: tf('confidence'), type: 'select', options: o.confidence },
      { name: 'status', label: tf('status'), type: 'select', options: o.statuses },
      {
        name: 'needs_update',
        label: t('admin.rasd.contacts.needsUpdate'),
        type: 'select',
        options: [
          { value: '1', label: t('admin.common.yes') },
          { value: '0', label: t('admin.common.no') },
        ],
      },
      { name: 'company_id', label: t('admin.rasd.contacts.companyId'), type: 'number', minWidth: 120 },
      { name: 'batch_id', label: t('admin.rasd.common.batch'), type: 'number', minWidth: 120 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [o, t]
  );

  const sorts = useMemo(
    () =>
      ['updated_at:desc', 'name:asc', 'role_title:asc'].map((value) => ({
        value,
        label: t(`admin.rasd.sort.${value.replace(':', '_')}`),
      })),
    [t]
  );

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: tf('person_name'),
        render: (row) => (
          <div className="min-w-0" style={{ maxWidth: 260 }}>
            <div className="font-semibold truncate" style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>
              {row.name}
            </div>
            <div className="truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {row.role_title || '—'}
            </div>
          </div>
        ),
      },
      {
        key: 'company',
        label: tf('company'),
        render: (row) => (
          <div className="min-w-0" style={{ maxWidth: 220 }}>
            <div className="truncate" style={{ fontSize: 13 }}>
              {row.company?.name || `#${row.rasd_company_id}`}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>#{row.rasd_company_id}</div>
          </div>
        ),
      },
      {
        key: 'role',
        label: tf('role_category'),
        render: (row) => (
          <Badge tone={row.role_category ? 'primary' : 'muted'}>
            {row.role_category
              ? L.contactRole(row.role_category, row.role_category_label)
              : t('rasd.contacts.unclassified')}
          </Badge>
        ),
      },
      {
        key: 'reach',
        label: t('admin.rasd.contacts.channels'),
        render: (row) => (
          <div className="flex flex-col gap-0.5" style={{ fontSize: 12.5 }}>
            {row.phone ? <span dir="ltr">{row.phone}</span> : null}
            {row.email ? (
              <span dir="ltr" className="truncate" style={{ maxWidth: 220 }}>
                {row.email}
              </span>
            ) : null}
            {!row.phone && !row.email && <Badge tone="warning">{t('admin.rasd.contacts.noChannel')}</Badge>}
          </div>
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
    [L, t]
  );

  const formFields = (record) => [
    {
      name: 'rasd_company_id',
      label: tf('company'),
      type: 'company',
      required: true,
      wide: true,
      initialName: record?.company?.name,
    },
    { name: 'name', label: tf('person_name'), required: true },
    { name: 'role_title', label: tf('role_title') },
    { name: 'role_category', label: tf('role_category'), type: 'select', options: o.contactRoles },
    { name: 'phone', label: tf('mobile'), ltr: true, hint: t('admin.rasd.contacts.phoneHint') },
    { name: 'email', label: tf('email'), type: 'email' },
    { name: 'linkedin_url', label: tf('linkedin_url'), type: 'url' },
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
    { name: 'source_reference', label: tf('source_reference'), type: 'textarea', wide: true },
    { name: 'notes', label: tf('notes'), type: 'textarea', wide: true },
  ];

  const detailItems = (c) => [
    { label: tf('company'), value: c.company ? `${c.company.name} · #${c.rasd_company_id}` : `#${c.rasd_company_id}` },
    { label: tf('role_title'), value: c.role_title },
    {
      label: tf('role_category'),
      value: c.role_category && L.contactRole(c.role_category, c.role_category_label),
    },
    { label: tf('mobile'), value: c.phone && <span dir="ltr">{c.phone}</span> },
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
    { label: tf('source_reference'), value: c.source_reference, wide: true },
    { label: tf('notes'), value: c.notes, wide: true },
  ];

  // Arriving from a company's detail (?company_id=…) pre-selects it for
  // a new contact.
  const companyId = searchParams.get('company_id');

  return (
    <RasdEntityPage
      service={admin.rasd.contacts}
      i18n="admin.rasd.contacts"
      filters={filters}
      sorts={sorts}
      columns={columns}
      formFields={formFields}
      formDefaults={companyId ? { rasd_company_id: companyId } : undefined}
      detailItems={detailItems}
    />
  );
}
