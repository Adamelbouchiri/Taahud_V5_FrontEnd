import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, RotateCcw, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '../../../i18n/LanguageContext';
import {
  PageHeader,
  Card,
  FilterBar,
  FilterSelect,
  FilterText,
  DataTable,
  Pagination,
  Badge,
  Modal,
  ConfirmDialog,
} from '../AdminUI';
import { RasdAdminNav, Notice, RecordFormModal, DetailGrid, date } from './RasdAdminKit';

/* ============================================================
 *  RasdEntityPage — the list / detail / form screen behind
 *  /admin/rasd/{projects,companies,contacts}.
 *  ----------------------------------------------------------------
 *  The three entities share one route shape on the BE (list, show,
 *  create, patch, soft delete, restore), so they share one screen
 *  here and differ only in the config each page passes:
 *
 *    service       admin.rasd.<entity>
 *    i18n          key prefix — admin.rasd.<entity>
 *    filters       [{ name, label, type: select|text|number, options }]
 *    sorts         [{ value: 'field:dir', label }]
 *    columns       DataTable columns
 *    formFields    (record|null) => RecordFormModal fields
 *    formDefaults  initial values for a NEW record (optional)
 *    detailItems   (record) => DetailGrid items
 *    detailExtra   (record) => node under the grid (optional)
 *    fetchDetail   GET /:id on open (companies — for their projects)
 *    headerActions extra buttons in the page header (optional)
 *
 *  Filters live in the URL. That's what lets the summary link straight
 *  to `contacts?reachable=none` or `projects?trashed=only`, and what
 *  makes «what did yesterday's batch add» a bookmarkable
 *  `?batch_id=29`. Trash is `trashed=only` on the same list — there's
 *  no separate route, and no hard delete anywhere.
 * ============================================================ */

const PER_PAGE = 25;

export default function RasdEntityPage({
  service,
  i18n,
  filters: filterDefs,
  sorts,
  columns,
  formFields,
  formDefaults,
  detailItems,
  detailExtra,
  fetchDetail = false,
  headerActions,
  rowTitle = (row) => row.name,
}) {
  const { t, lang } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const filterNames = useMemo(
    () => ['q', 'trashed', ...filterDefs.map((f) => f.name)],
    [filterDefs]
  );
  const values = Object.fromEntries(filterNames.map((n) => [n, searchParams.get(n) || '']));
  const sortValue = searchParams.get('sort')
    ? `${searchParams.get('sort')}:${searchParams.get('direction') || 'desc'}`
    : sorts[0].value;
  const page = Number(searchParams.get('page')) || 1;

  const [data, setData] = useState({ rows: [], meta: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null → create
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const updateParams = (mutate) => {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next, { replace: true });
  };

  const setFilter = (name, value) =>
    updateParams((next) => {
      if (value) next.set(name, value);
      else next.delete(name);
      next.delete('page');
    });

  const setSort = (value) =>
    updateParams((next) => {
      const [field, dir] = value.split(':');
      next.set('sort', field);
      next.set('direction', dir);
      next.delete('page');
    });

  const paramsKey = searchParams.toString();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [sort, direction] = sortValue.split(':');
    try {
      const res = await service.list({
        ...Object.fromEntries(filterNames.map((n) => [n, values[n]])),
        sort,
        direction,
        page,
        per_page: PER_PAGE,
      });
      setData({ rows: res.data, meta: res.meta });
    } catch (err) {
      setError(err.message || t('admin.common.loadError'));
      setData({ rows: [], meta: null });
    } finally {
      setLoading(false);
    }
    // values/sortValue/page are all derived from paramsKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, service, t]);

  // Debounced: `q` is free text.
  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [load]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const openDetail = async (row) => {
    setSelected(row);
    setActionError('');
    if (!fetchDetail) return;
    setDetailLoading(true);
    try {
      setSelected(await service.get(row.id));
    } catch {
      // The list row is enough to act on; the extra detail is a bonus.
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setFormOpen(true);
  };

  const handleSave = async (payload) => {
    if (editing) {
      const updated = await service.update(editing.id, payload);
      showToast(t(`${i18n}.saved`));
      if (selected?.id === editing.id) setSelected({ ...selected, ...updated });
    } else {
      await service.create(payload);
      showToast(t(`${i18n}.created`));
    }
    setFormOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!selected) return;
    setBusy(true);
    setActionError('');
    try {
      const res = await service.remove(selected.id);
      showToast(res?.message || t(`${i18n}.deleted`));
      setDeleteOpen(false);
      setSelected(null);
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (row) => {
    setBusy(true);
    setActionError('');
    try {
      await service.restore(row.id);
      showToast(t(`${i18n}.restored`));
      setSelected(null);
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const allColumns = useMemo(
    () => [
      ...columns,
      {
        key: '_updated',
        label: t('admin.rasd.common.updatedAt'),
        render: (row) => (
          <div className="flex flex-col gap-1">
            <span style={{ fontSize: 12.5 }}>{date(row.updated_at, lang)}</span>
            {row.deleted_at && <Badge tone="danger">{t('admin.rasd.common.deleted')}</Badge>}
            {row.status === 'draft' && <Badge tone="muted">{t('admin.rasd.status.draft')}</Badge>}
          </div>
        ),
      },
    ],
    [columns, t, lang]
  );

  const activeCount = filterNames.filter((n) => values[n]).length;

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.rasd.eyebrow')}
        title={t(`${i18n}.title`)}
        subtitle={t(`${i18n}.subtitle`)}
        actions={
          <>
            {headerActions}
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
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 16px' }}
              onClick={openCreate}
            >
              <Plus size={14} />
              {t(`${i18n}.add`)}
            </button>
          </>
        }
      />

      <RasdAdminNav />

      <Notice tone="success">{toast}</Notice>

      <FilterBar
        title={t('admin.common.filtersTitle')}
        activeCount={activeCount}
        onReset={() =>
          updateParams((next) => {
            filterNames.forEach((n) => next.delete(n));
            next.delete('page');
          })
        }
        resetLabel={t('admin.common.reset')}
        searchValue={values.q}
        onSearchChange={(v) => setFilter('q', v)}
        searchPlaceholder={t(`${i18n}.searchPlaceholder`)}
      >
        {filterDefs.map((f) =>
          f.type === 'select' ? (
            <FilterSelect
              key={f.name}
              label={f.label}
              value={values[f.name]}
              onChange={(v) => setFilter(f.name, v)}
              options={[{ value: '', label: t('admin.common.all') }, ...f.options]}
              minWidth={f.minWidth}
            />
          ) : (
            <FilterText
              key={f.name}
              label={f.label}
              value={values[f.name]}
              onChange={(v) => setFilter(f.name, v)}
              type={f.type === 'number' ? 'number' : 'text'}
              minWidth={f.minWidth}
            />
          )
        )}
        <FilterSelect
          label={t('admin.rasd.common.trash')}
          value={values.trashed}
          onChange={(v) => setFilter('trashed', v)}
          options={[
            { value: '', label: t('admin.rasd.common.trashActive') },
            { value: 'with', label: t('admin.rasd.common.trashWith') },
            { value: 'only', label: t('admin.rasd.common.trashOnly') },
          ]}
        />
        <FilterSelect
          label={t('admin.rasd.common.sort')}
          value={sortValue}
          onChange={setSort}
          options={sorts}
          minWidth={200}
        />
      </FilterBar>

      <div className="mt-4">
        <Card padded={false}>
          <Notice tone="error" className="m-4">
            {error}
          </Notice>
          <DataTable
            columns={allColumns}
            rows={data.rows}
            rowKey={(row) => row.id}
            loading={loading}
            emptyTitle={
              values.trashed === 'only' ? t('admin.rasd.common.trashEmpty') : t(`${i18n}.empty`)
            }
            onRowClick={openDetail}
          />
          <Pagination
            meta={data.meta}
            onPage={(p) => updateParams((next) => next.set('page', String(p)))}
            t={t}
          />
        </Card>
      </div>

      {/* Detail */}
      <Modal
        open={!!selected && !formOpen && !deleteOpen}
        onClose={() => setSelected(null)}
        title={selected ? rowTitle(selected) : ''}
        width={680}
        footer={
          selected && (
            <div className="flex flex-wrap gap-2 justify-end w-full">
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto', padding: '10px 16px' }}
                onClick={() => setSelected(null)}
              >
                {t('admin.common.close')}
              </button>
              {selected.deleted_at ? (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 16px' }}
                  onClick={() => handleRestore(selected)}
                  disabled={busy}
                >
                  <RotateCcw size={14} />
                  {t('admin.rasd.common.restore')}
                </button>
              ) : (
                <>
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
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 size={14} />
                    {t('admin.rasd.common.delete')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: 'auto', padding: '10px 16px' }}
                    onClick={() => openEdit(selected)}
                  >
                    <Pencil size={14} />
                    {t('admin.common.edit')}
                  </button>
                </>
              )}
            </div>
          )
        }
      >
        {selected && (
          <div className="flex flex-col gap-4">
            {selected.deleted_at && (
              <Notice tone="warning" className="">
                {t('admin.rasd.common.deletedOn', { date: date(selected.deleted_at, lang) })}
              </Notice>
            )}
            <DetailGrid items={detailItems(selected)} />
            <DetailGrid
              items={[
                {
                  label: t('admin.rasd.common.createdByBatch'),
                  value: selected.created_by_batch_id
                    ? `#${selected.created_by_batch_id}`
                    : t('admin.rasd.common.manual'),
                },
                {
                  label: t('admin.rasd.common.lastBatch'),
                  value: selected.rasd_import_batch_id ? `#${selected.rasd_import_batch_id}` : null,
                },
                { label: t('admin.rasd.common.createdAt'), value: date(selected.created_at, lang) },
                { label: t('admin.rasd.common.updatedAt'), value: date(selected.updated_at, lang) },
              ]}
            />
            {detailLoading ? (
              <div className="shimmer" style={{ height: 14, width: 140, borderRadius: 6 }} />
            ) : (
              detailExtra?.(selected)
            )}
            <Notice tone="error" className="">
              {actionError}
            </Notice>
          </div>
        )}
      </Modal>

      <RecordFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t(`${i18n}.editTitle`) : t(`${i18n}.addTitle`)}
        fields={formFields(editing)}
        record={editing}
        defaults={formDefaults}
        onSubmit={handleSave}
      />

      {/* Soft delete — reversible from the trash view, so no reason is
          demanded (the BE treats it as optional). */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t(`${i18n}.deleteTitle`)}
        description={t('admin.rasd.common.deleteDescription')}
        requireReason={false}
        confirmLabel={t('admin.rasd.common.delete')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="danger"
        busy={busy}
        error={actionError}
      />
    </div>
  );
}
