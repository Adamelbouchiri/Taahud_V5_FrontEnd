import React, { useMemo } from 'react';
import { admin } from '../../../services';
import { useTranslation } from '../../../i18n/LanguageContext';
import { cityLabel, regionLabel } from '../../../config/cityTranslations';
import { RASD_STAGE_TONE, RASD_CONFIDENCE_TONE } from '../../../config/rasdConstants';
import { Badge } from '../../../components/admin/AdminUI';
import RasdEntityPage from '../../../components/admin/rasd/RasdEntityPage';
import { useRasdOptions, num, date } from '../../../components/admin/rasd/RasdAdminKit';

/* ============================================================
 *  AdminRasdProjectsPage — /admin/rasd/projects
 *
 *  `estimated_value` is a plain number on the wire (265000000) and a
 *  formatted reading on screen. `progress_percent` is 0–100 or null,
 *  and null is «unknown», never zero — so it's shown as a dash and a
 *  cleared field goes out as null.
 * ============================================================ */

export default function AdminRasdProjectsPage() {
  const { t, lang } = useTranslation();
  const o = useRasdOptions();
  const L = o.labels;
  const tf = (k) => t(`admin.rasd.fields.${k}`);

  const filters = useMemo(
    () => [
      { name: 'stage', label: tf('stage'), type: 'select', options: o.stages },
      { name: 'sector', label: tf('sector'), type: 'select', options: o.sectors },
      { name: 'city', label: tf('city'), type: 'select', options: o.cities },
      { name: 'confidence', label: tf('confidence'), type: 'select', options: o.confidence },
      { name: 'status', label: tf('status'), type: 'select', options: o.statuses },
      {
        name: 'has_open_roles',
        label: t('admin.rasd.projects.openRoles'),
        type: 'select',
        options: [
          { value: '1', label: t('admin.common.yes') },
          { value: '0', label: t('admin.common.no') },
        ],
      },
      { name: 'batch_id', label: t('admin.rasd.common.batch'), type: 'number', minWidth: 120 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [o, t]
  );

  const sorts = useMemo(
    () =>
      [
        'updated_at:desc',
        'name:asc',
        'estimated_value:desc',
        'progress_percent:desc',
        'expected_end_at:asc',
        'announced_at:desc',
      ].map((value) => ({ value, label: t(`admin.rasd.sort.${value.replace(':', '_')}`) })),
    [t]
  );

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: tf('name'),
        render: (row) => (
          <div className="min-w-0" style={{ maxWidth: 320 }}>
            <div className="font-semibold truncate" style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>
              {row.name}
            </div>
            <div className="truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              #{row.id} · {cityLabel(row.city, lang)}
              {row.region && row.region !== row.city ? ` · ${regionLabel(row.region, lang)}` : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'stage',
        label: tf('stage'),
        render: (row) => (
          <div className="flex flex-col gap-1 items-start">
            <Badge tone={RASD_STAGE_TONE[row.stage] || 'default'}>{L.stage(row.stage, row.stage_label)}</Badge>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{L.sector(row.sector, row.sector_label)}</span>
          </div>
        ),
      },
      {
        key: 'progress',
        label: tf('progress_percent'),
        render: (row) =>
          row.progress_percent == null ? '—' : <span>{num(row.progress_percent, lang)}%</span>,
      },
      {
        key: 'value',
        label: tf('estimated_value'),
        render: (row) =>
          row.estimated_value == null ? (
            '—'
          ) : (
            <span style={{ whiteSpace: 'nowrap' }}>
              {num(row.estimated_value, lang)} {t('common.currency')}
            </span>
          ),
      },
      {
        key: 'roles',
        label: t('admin.rasd.projects.partiesColumn'),
        render: (row) => (
          <span style={{ fontSize: 12.5 }}>
            {num(row.parties_count ?? 0, lang)} · {t('admin.rasd.projects.openShort')}{' '}
            <strong style={{ color: row.open_roles_count ? 'var(--accent-primary)' : undefined }}>
              {num(row.open_roles_count ?? 0, lang)}
            </strong>
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
    { name: 'name', label: tf('name'), required: true, wide: true },
    { name: 'city', label: tf('city'), type: 'select', options: o.cities, required: true },
    { name: 'region', label: tf('region') },
    { name: 'sector', label: tf('sector'), type: 'select', options: o.sectors, required: true },
    { name: 'stage', label: tf('stage'), type: 'select', options: o.stages, required: true },
    {
      name: 'progress_percent',
      label: tf('progress_percent'),
      type: 'number',
      min: 0,
      max: 100,
      hint: t('admin.rasd.projects.progressHint'),
    },
    { name: 'estimated_value', label: tf('estimated_value'), type: 'money' },
    { name: 'announced_at', label: tf('announced_at'), type: 'date' },
    { name: 'collected_at', label: tf('collected_at'), type: 'date' },
    { name: 'expected_start_at', label: tf('expected_start_at'), type: 'date' },
    { name: 'expected_end_at', label: tf('expected_end_at'), type: 'date' },
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
    { name: 'description', label: tf('description'), type: 'textarea', wide: true },
    { name: 'notes', label: tf('notes'), type: 'textarea', wide: true },
    { name: 'source_reference', label: tf('source_reference'), type: 'textarea', wide: true },
  ];

  const detailItems = (p) => [
    { label: tf('city'), value: cityLabel(p.city, lang) },
    { label: tf('region'), value: p.region ? regionLabel(p.region, lang) : null },
    { label: tf('sector'), value: L.sector(p.sector, p.sector_label) },
    { label: tf('stage'), value: L.stage(p.stage, p.stage_label) },
    {
      label: tf('progress_percent'),
      value: p.progress_percent == null ? t('admin.rasd.common.unknown') : <>{num(p.progress_percent, lang)}%</>,
    },
    {
      label: tf('estimated_value'),
      value:
        p.estimated_value == null ? null : (
          <>
            {num(p.estimated_value, lang)} {t('common.currency')}
          </>
        ),
    },
    { label: tf('announced_at'), value: p.announced_at && date(p.announced_at, lang) },
    { label: tf('collected_at'), value: p.collected_at && date(p.collected_at, lang) },
    { label: tf('expected_start_at'), value: p.expected_start_at && date(p.expected_start_at, lang) },
    { label: tf('expected_end_at'), value: p.expected_end_at && date(p.expected_end_at, lang) },
    { label: tf('confidence'), value: p.confidence && L.confidence(p.confidence, p.confidence_label) },
    { label: tf('status'), value: p.status && t(`admin.rasd.status.${p.status}`) },
    {
      label: t('admin.rasd.projects.partiesColumn'),
      value: (
        <>
          {num(p.parties_count ?? 0, lang)} · {t('admin.rasd.projects.openShort')}{' '}
          {num(p.open_roles_count ?? 0, lang)}
        </>
      ),
    },
    { label: tf('external_ref'), value: p.external_ref },
    { label: tf('description'), value: p.description, wide: true },
    { label: tf('notes'), value: p.notes, wide: true },
    { label: tf('source_reference'), value: p.source_reference, wide: true },
  ];

  return (
    <RasdEntityPage
      service={admin.rasd.projects}
      i18n="admin.rasd.projects"
      filters={filters}
      sorts={sorts}
      columns={columns}
      formFields={formFields}
      detailItems={detailItems}
    />
  );
}
