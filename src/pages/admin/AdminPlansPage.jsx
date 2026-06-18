import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  Plus,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  Check,
} from 'lucide-react';
import { admin } from '../../services';
import { useUser } from '../../contexts/UserContext';
import { useTranslation } from '../../i18n/LanguageContext';
import {
  PageHeader,
  Card,
  FilterBar,
  FilterSelect,
  DataTable,
  Pagination,
  Badge,
  Modal,
} from '../../components/admin/AdminUI';

/* ============================================================
 *  AdminPlansPage — /admin/plans
 *
 *  The full plan catalog (including inactive plans, unlike the
 *  public /plans), wired to the admin plan endpoints:
 *
 *    GET    /admin/plans              list (filters below)
 *    POST   /admin/plans              create
 *    PATCH  /admin/plans/:id          update (→ price_changed)
 *    POST   /admin/plans/:id/activate
 *    POST   /admin/plans/:id/deactivate
 *    DELETE /admin/plans/:id          super-admin (422 plan_in_use)
 *
 *  Retire vs delete: deactivate hides a plan from new sign-ups but
 *  keeps existing subscribers; delete only succeeds for a plan no
 *  subscription has ever used. The UI surfaces the BE's plan_in_use
 *  error inline and steers the admin to deactivate instead.
 * ============================================================ */

const ACCOUNT_TYPES = ['individual', 'entrepreneur', 'engineering', 'developer', 'supplier'];
const TIERS = ['basic', 'premium', 'addon'];
const INTERVALS = [1, 6, 12];

const EMPTY_FORM = {
  code: '',
  account_type: '',
  tier: 'basic',
  billing_interval_months: '1',
  price: '',
  currency: 'SAR',
  name_ar: '',
  name_en: '',
  description_ar: '',
  description_en: '',
  features: [],
  is_addon: false,
  is_active: true,
  sort_order: '',
};

export default function AdminPlansPage() {
  const { t, lang } = useTranslation();
  const { isSuperAdmin } = useUser();

  const [accountType, setAccountType] = useState('');
  const [tier, setTier] = useState('');
  const [kind, setKind] = useState(''); // '' | '1' add-ons | '0' base
  const [status, setStatus] = useState(''); // '' | '1' active | '0' inactive
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], meta: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(null); // 'form' | 'deactivate' | 'remove'
  const [editing, setEditing] = useState(null); // plan being edited, or null for create
  const [subsCount, setSubsCount] = useState(null); // subscribers on the edited plan
  const [form, setForm] = useState(EMPTY_FORM);

  // Feature catalog (codes → labels) for the editor checklist.
  const [featureCatalog, setFeatureCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [removeReason, setRemoveReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState('');

  /* ---------- helpers ---------- */
  const currencyDefault = 'SAR';
  const fmtMoney = useCallback(
    (n, currency) => {
      const num = typeof n === 'string' ? parseFloat(n) : n;
      if (num == null || Number.isNaN(num)) return '—';
      let body;
      try {
        body = new Intl.NumberFormat(lang || undefined, { maximumFractionDigits: 2 }).format(num);
      } catch {
        body = String(num);
      }
      return `${body} ${currency || (lang === 'ar' ? 'ر.س' : currencyDefault)}`;
    },
    [lang]
  );

  const periodLabel = useCallback(
    (months) => {
      const m = Number(months);
      if (m === 1) return t('admin.subscriptions.period.monthly');
      if (m === 3) return t('admin.subscriptions.period.quarterly');
      if (m === 6) return t('admin.subscriptions.period.semiAnnual');
      if (m === 12) return t('admin.subscriptions.period.annual');
      if (m > 0) return t('admin.subscriptions.period.nMonths', { n: m });
      return '—';
    },
    [t]
  );

  const planName = useCallback(
    (plan) => (lang === 'ar' ? plan?.name_ar : plan?.name_en) || plan?.name_en || plan?.name_ar || plan?.code || '—',
    [lang]
  );

  const fmtDate = useCallback(
    (iso) => {
      if (!iso) return '—';
      try {
        return new Intl.DateTimeFormat(lang || undefined, { dateStyle: 'medium' }).format(new Date(iso));
      } catch {
        return iso;
      }
    },
    [lang]
  );

  // Resolve a feature code to a label in the active language via the
  // catalog (falls back to the code itself when it isn't catalogued).
  const featureLabel = useCallback(
    (code) => {
      const item = featureCatalog.find((c) => c.code === code);
      if (item) return (lang === 'ar' ? item.ar : item.en) || item.en || item.ar || code;
      return code;
    },
    [featureCatalog, lang]
  );

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  /* ---------- load ---------- */
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.plans.list({
        account_type: accountType || undefined,
        tier: tier || undefined,
        is_addon: kind || undefined,
        is_active: status || undefined,
        per_page: 25,
        page,
      });
      setData({ rows: res.data, meta: res.meta });
    } catch (err) {
      setError(err.message || t('admin.common.loadError'));
      setData({ rows: [], meta: null });
    } finally {
      setLoading(false);
    }
  }, [accountType, tier, kind, status, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Feature catalog is static per deploy — load once.
  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    admin.plans
      .features()
      .then((res) => {
        if (active) setFeatureCatalog(Array.isArray(res) ? res : []);
      })
      .catch(() => {
        if (active) setFeatureCatalog([]);
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [accountType, tier, kind, status]);

  // When the view or edit modal opens, pull the plan's subscriber count
  // from the show endpoint (judge deactivate-vs-delete; surface it on view).
  useEffect(() => {
    const target = modal === 'view' ? selected : modal === 'form' ? editing : null;
    if (!target?.id) {
      setSubsCount(null);
      return undefined;
    }
    let active = true;
    setSubsCount(null);
    admin.plans
      .get(target.id)
      .then((res) => {
        if (active && typeof res?.subscriptions_count === 'number') setSubsCount(res.subscriptions_count);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [modal, editing, selected]);

  /* ---------- modal open/close ---------- */
  const openView = (plan) => {
    setSelected(plan);
    setActionError('');
    setModal('view');
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setActionError('');
    setModal('form');
  };

  const openEdit = (plan) => {
    setEditing(plan);
    setForm({
      code: plan.code || '',
      account_type: plan.account_type || '',
      tier: plan.tier || 'basic',
      billing_interval_months: String(plan.billing_interval_months ?? '1'),
      price: plan.price != null ? String(plan.price) : '',
      currency: plan.currency || 'SAR',
      name_ar: plan.name_ar || '',
      name_en: plan.name_en || '',
      description_ar: plan.description_ar || '',
      description_en: plan.description_en || '',
      features: Array.isArray(plan.features) ? [...plan.features] : [],
      is_addon: !!plan.is_addon,
      is_active: !!plan.is_active,
      sort_order: plan.sort_order != null ? String(plan.sort_order) : '',
    });
    setActionError('');
    setModal('form');
  };

  const closeModal = () => {
    if (busy) return;
    setModal(null);
    setEditing(null);
    setSelected(null);
    setRemoveReason('');
    setActionError('');
  };

  /* ---------- form validity ---------- */
  const formValid =
    form.code.trim() &&
    form.tier &&
    form.billing_interval_months &&
    form.price !== '' &&
    Number(form.price) >= 0 &&
    form.name_ar.trim() &&
    form.name_en.trim() &&
    (form.is_addon || form.account_type);

  const buildPayload = () => {
    const features = (Array.isArray(form.features) ? form.features : [])
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      code: form.code.trim(),
      tier: form.tier,
      billing_interval_months: Number(form.billing_interval_months),
      price: Number(form.price),
      currency: form.currency || 'SAR',
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      description_ar: form.description_ar.trim() || null,
      description_en: form.description_en.trim() || null,
      features,
      is_addon: form.is_addon,
      is_active: form.is_active,
    };
    // account_type only applies to base plans.
    if (form.is_addon) payload.account_type = null;
    else payload.account_type = form.account_type;
    if (form.sort_order !== '') payload.sort_order = Math.max(1, Number(form.sort_order) || 1);
    return payload;
  };

  const handleSubmit = async () => {
    setBusy(true);
    setActionError('');
    try {
      if (editing) {
        const res = await admin.plans.update(editing.id, buildPayload());
        showToast(res?.price_changed ? t('admin.plans.form.priceChanged') : t('admin.plans.form.updated'));
      } else {
        await admin.plans.create(buildPayload());
        showToast(t('admin.plans.form.created'));
      }
      closeModal();
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleActivate = async (plan) => {
    try {
      await admin.plans.activate(plan.id);
      showToast(t('admin.plans.activate.done'));
      load();
    } catch (err) {
      showToast(err.message || t('admin.common.actionError'));
    }
  };

  const handleDeactivate = async () => {
    if (!selected) return;
    setBusy(true);
    setActionError('');
    try {
      await admin.plans.deactivate(selected.id);
      showToast(t('admin.plans.deactivate.done'));
      closeModal();
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!selected) return;
    setBusy(true);
    setActionError('');
    try {
      await admin.plans.remove(selected.id, removeReason || undefined);
      showToast(t('admin.plans.remove.done'));
      closeModal();
      load();
    } catch (err) {
      // The BE returns 422 { code: 'plan_in_use', subscriptions_count } when
      // a subscription references the plan — steer to deactivate instead.
      if (err.data?.code === 'plan_in_use') {
        setActionError(t('admin.plans.remove.inUse', { n: err.data.subscriptions_count ?? '?' }));
      } else {
        setActionError(err.message || t('admin.common.actionError'));
      }
    } finally {
      setBusy(false);
    }
  };

  /* ---------- columns ---------- */
  const columns = useMemo(
    () => [
      {
        key: 'plan',
        label: t('admin.plans.columns.plan'),
        render: (row) => (
          <div className="min-w-0">
            <div className="font-semibold truncate" style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>
              {planName(row)}
            </div>
            <div className="truncate" style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {row.code}
            </div>
          </div>
        ),
      },
      {
        key: 'account_type',
        label: t('admin.plans.columns.accountType'),
        render: (row) =>
          row.is_addon ? (
            <Badge tone="warning">{t('admin.plans.addon')}</Badge>
          ) : row.account_type ? (
            <Badge tone="primary">{t(`accountType.${row.account_type}`)}</Badge>
          ) : (
            '—'
          ),
      },
      {
        key: 'tier',
        label: t('admin.plans.columns.tier'),
        render: (row) => (row.tier ? <Badge tone="default">{t(`admin.plans.tiers.${row.tier}`)}</Badge> : '—'),
      },
      {
        key: 'term',
        label: t('admin.plans.columns.term'),
        render: (row) => periodLabel(row.billing_interval_months),
      },
      {
        key: 'price',
        label: t('admin.plans.columns.price'),
        render: (row) => (
          <span style={{ fontWeight: 600, color: 'var(--text-ink)', fontSize: 13 }}>
            {fmtMoney(row.price, row.currency)}
          </span>
        ),
      },
      {
        key: 'status',
        label: t('admin.plans.columns.status'),
        render: (row) => (
          <Badge tone={row.is_active ? 'success' : 'muted'}>
            {row.is_active ? t('admin.plans.status.active') : t('admin.plans.status.inactive')}
          </Badge>
        ),
      },
      {
        key: 'actions',
        label: t('admin.plans.columns.actions'),
        headerStyle: { textAlign: 'end' },
        cellStyle: { textAlign: 'end' },
        render: (row) => (
          <div
            className="inline-flex items-center"
            style={{ gap: 2, padding: 3, borderRadius: 11, background: 'var(--bg-canvas)', border: '1px solid var(--border-soft)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <IconAction icon={Pencil} label={t('admin.plans.actions.edit')} onClick={() => openEdit(row)} />
            {row.is_active ? (
              <IconAction
                icon={PowerOff}
                tone="warning"
                label={t('admin.plans.actions.deactivate')}
                onClick={() => {
                  setSelected(row);
                  setActionError('');
                  setModal('deactivate');
                }}
              />
            ) : (
              <IconAction icon={Power} tone="success" label={t('admin.plans.actions.activate')} onClick={() => handleActivate(row)} />
            )}
            {isSuperAdmin && (
              <IconAction
                icon={Trash2}
                tone="danger"
                label={t('admin.plans.actions.delete')}
                onClick={() => {
                  setSelected(row);
                  setRemoveReason('');
                  setActionError('');
                  setModal('remove');
                }}
              />
            )}
          </div>
        ),
      },
    ],
    [t, planName, periodLabel, fmtMoney, isSuperAdmin]
  );

  const activeFilterCount = (accountType ? 1 : 0) + (tier ? 1 : 0) + (kind ? 1 : 0) + (status ? 1 : 0);

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.plans.eyebrow')}
        title={t('admin.plans.title')}
        subtitle={t('admin.plans.subtitle')}
        actions={
          <>
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
            <button type="button" className="btn-primary" style={{ width: 'auto', padding: '10px 16px' }} onClick={openCreate}>
              <Plus size={15} />
              {t('admin.plans.newPlan')}
            </button>
          </>
        }
      />

      {toast && (
        <div
          className="mb-4 p-3 rounded-[10px]"
          style={{ background: 'rgba(19,109,74,0.10)', border: '1px solid rgba(19,109,74,0.22)', color: '#136d4a', fontSize: 13 }}
        >
          {toast}
        </div>
      )}

      <FilterBar
        title={t('admin.common.filtersTitle')}
        activeCount={activeFilterCount}
        onReset={() => {
          setAccountType('');
          setTier('');
          setKind('');
          setStatus('');
        }}
        resetLabel={t('admin.common.reset')}
      >
        <FilterSelect
          label={t('admin.plans.filters.accountType')}
          value={accountType}
          onChange={setAccountType}
          options={[
            { value: '', label: t('admin.common.anyAccountType') },
            ...ACCOUNT_TYPES.map((tp) => ({ value: tp, label: t(`accountType.${tp}`) })),
          ]}
        />
        <FilterSelect
          label={t('admin.plans.filters.tier')}
          value={tier}
          onChange={setTier}
          options={[
            { value: '', label: t('admin.plans.anyTier') },
            ...TIERS.map((tr) => ({ value: tr, label: t(`admin.plans.tiers.${tr}`) })),
          ]}
        />
        <FilterSelect
          label={t('admin.plans.filters.kind')}
          value={kind}
          onChange={setKind}
          options={[
            { value: '', label: t('admin.plans.anyKind') },
            { value: '0', label: t('admin.plans.baseOnly') },
            { value: '1', label: t('admin.plans.addonsOnly') },
          ]}
        />
        <FilterSelect
          label={t('admin.plans.filters.status')}
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: t('admin.plans.anyStatus') },
            { value: '1', label: t('admin.plans.activeOnly') },
            { value: '0', label: t('admin.plans.inactiveOnly') },
          ]}
        />
      </FilterBar>

      <div className="mt-4">
        <Card padded={false}>
          {error && (
            <div
              className="p-4"
              style={{
                background: 'rgba(185,28,28,0.06)',
                borderBottom: '1px solid rgba(185,28,28,0.18)',
                color: 'var(--accent-danger)',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
          <DataTable
            columns={columns}
            rows={data.rows}
            rowKey={(row) => row.id}
            loading={loading}
            emptyTitle={t('admin.plans.empty')}
            onRowClick={(row) => openView(row)}
          />
          <Pagination meta={data.meta} onPage={(p) => setPage(p)} t={t} />
        </Card>
      </div>

      {/* ---------- View (read-only) ---------- */}
      <Modal
        open={modal === 'view'}
        onClose={closeModal}
        width={620}
        title={selected ? planName(selected) : t('admin.plans.title')}
        footer={
          <>
            <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '10px 18px' }} onClick={closeModal}>
              {t('admin.common.close')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={() => selected && openEdit(selected)}
            >
              <Pencil size={14} />
              {t('admin.plans.actions.edit')}
            </button>
          </>
        }
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={selected.is_active ? 'success' : 'muted'}>
                {selected.is_active ? t('admin.plans.status.active') : t('admin.plans.status.inactive')}
              </Badge>
              {selected.is_addon ? (
                <Badge tone="warning">{t('admin.plans.addon')}</Badge>
              ) : selected.account_type ? (
                <Badge tone="primary">{t(`accountType.${selected.account_type}`)}</Badge>
              ) : null}
              {selected.tier && <Badge tone="default">{t(`admin.plans.tiers.${selected.tier}`)}</Badge>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <ViewField label={t('admin.plans.form.code')}>
                <span style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{selected.code}</span>
              </ViewField>
              <ViewField label={t('admin.plans.columns.term')}>{periodLabel(selected.billing_interval_months)}</ViewField>
              <ViewField label={t('admin.plans.columns.price')}>{fmtMoney(selected.price, selected.currency)}</ViewField>
              <ViewField label={t('admin.plans.subsCountLabel')}>
                {subsCount == null ? '…' : t('admin.plans.subsCount', { n: subsCount })}
              </ViewField>
              <ViewField label={t('admin.plans.form.nameAr')}>{selected.name_ar}</ViewField>
              <ViewField label={t('admin.plans.form.nameEn')}>{selected.name_en}</ViewField>
              {selected.sort_order != null && (
                <ViewField label={t('admin.plans.form.sortOrder')}>{selected.sort_order}</ViewField>
              )}
              <ViewField label={t('admin.plans.view.createdAt')}>{fmtDate(selected.created_at)}</ViewField>
              {selected.description_ar && (
                <ViewField label={t('admin.plans.form.descAr')} span={2}>{selected.description_ar}</ViewField>
              )}
              {selected.description_en && (
                <ViewField label={t('admin.plans.form.descEn')} span={2}>{selected.description_en}</ViewField>
              )}
            </div>

            <div>
              <div
                style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}
              >
                {t('admin.plans.form.features')}
              </div>
              {Array.isArray(selected.features) && selected.features.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selected.features.map((code) => (
                    <span
                      key={code}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 500,
                        background: 'var(--bg-canvas)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-ink-soft)',
                      }}
                    >
                      {featureLabel(code)}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('admin.plans.view.noFeatures')}</span>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ---------- Create / Edit form ---------- */}
      <Modal
        open={modal === 'form'}
        onClose={closeModal}
        width={640}
        title={editing ? t('admin.plans.form.editTitle') : t('admin.plans.form.createTitle')}
        footer={
          <>
            <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '10px 18px' }} onClick={closeModal} disabled={busy}>
              {t('admin.common.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={handleSubmit}
              disabled={busy || !formValid}
            >
              {busy ? '…' : editing ? t('admin.plans.form.save') : t('admin.plans.form.create')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {editing && (
            <div
              className="flex items-center justify-between gap-3 p-3 rounded-[10px]"
              style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-soft)' }}
            >
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                {t('admin.plans.subsCountLabel')}
              </span>
              <Badge tone={subsCount > 0 ? 'warning' : 'muted'}>
                {subsCount == null ? '…' : t('admin.plans.subsCount', { n: subsCount })}
              </Badge>
            </div>
          )}

          <Toggle
            label={t('admin.plans.form.isAddon')}
            checked={form.is_addon}
            onChange={(v) => setForm({ ...form, is_addon: v, account_type: v ? '' : form.account_type })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Labeled label={t('admin.plans.form.code')} hint={t('admin.plans.form.codeHint')}>
              <input className="field field-no-icon" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Labeled>
            {!form.is_addon && (
              <Labeled label={t('admin.plans.form.accountType')}>
                <select className="field" value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })}>
                  <option value="">{t('admin.plans.form.accountTypePlaceholder')}</option>
                  {ACCOUNT_TYPES.map((tp) => (
                    <option key={tp} value={tp}>
                      {t(`accountType.${tp}`)}
                    </option>
                  ))}
                </select>
              </Labeled>
            )}
            <Labeled label={t('admin.plans.form.tier')}>
              <select className="field" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                {TIERS.map((tr) => (
                  <option key={tr} value={tr}>
                    {t(`admin.plans.tiers.${tr}`)}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label={t('admin.plans.form.interval')}>
              <select
                className="field"
                value={form.billing_interval_months}
                onChange={(e) => setForm({ ...form, billing_interval_months: e.target.value })}
              >
                {INTERVALS.map((m) => (
                  <option key={m} value={m}>
                    {periodLabel(m)}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label={t('admin.plans.form.price')}>
              <input
                type="number"
                min="0"
                step="0.01"
                className="field field-no-icon"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </Labeled>
            <Labeled label={t('admin.plans.form.currency')}>
              <input className="field field-no-icon" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </Labeled>
            <Labeled label={t('admin.plans.form.sortOrder')} hint={t('admin.plans.form.sortOrderHint')}>
              <input
                type="number"
                min="1"
                step="1"
                className="field field-no-icon"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
            </Labeled>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Labeled label={t('admin.plans.form.nameAr')}>
              <input className="field field-no-icon" dir="rtl" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
            </Labeled>
            <Labeled label={t('admin.plans.form.nameEn')}>
              <input className="field field-no-icon" dir="ltr" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
            </Labeled>
            <Labeled label={t('admin.plans.form.descAr')}>
              <textarea
                className="field"
                dir="rtl"
                rows={2}
                value={form.description_ar}
                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                style={{ padding: '10px 12px', resize: 'vertical' }}
              />
            </Labeled>
            <Labeled label={t('admin.plans.form.descEn')}>
              <textarea
                className="field"
                dir="ltr"
                rows={2}
                value={form.description_en}
                onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                style={{ padding: '10px 12px', resize: 'vertical' }}
              />
            </Labeled>
          </div>

          <Labeled label={t('admin.plans.form.features')} hint={t('admin.plans.form.featuresHint')}>
            <FeatureChecklist
              catalog={featureCatalog}
              loading={catalogLoading}
              value={form.features}
              onChange={(next) => setForm({ ...form, features: next })}
              lang={lang}
              t={t}
            />
          </Labeled>

          <Toggle label={t('admin.plans.form.isActive')} checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />

          {actionError && <ErrorBox>{actionError}</ErrorBox>}
        </div>
      </Modal>

      {/* ---------- Deactivate ---------- */}
      <Modal
        open={modal === 'deactivate'}
        onClose={closeModal}
        title={t('admin.plans.deactivate.title')}
        footer={
          <>
            <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '10px 18px' }} onClick={closeModal} disabled={busy}>
              {t('admin.common.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{
                width: 'auto',
                padding: '10px 18px',
                background: '#b8862a',
                borderColor: '#b8862a',
                boxShadow: '0 6px 14px rgba(184,134,42,0.20)',
              }}
              onClick={handleDeactivate}
              disabled={busy}
            >
              {busy ? '…' : t('admin.plans.deactivate.confirm')}
            </button>
          </>
        }
      >
        <p className="m-0" style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}>
          {t('admin.plans.deactivate.description')}
        </p>
        {actionError && <ErrorBox>{actionError}</ErrorBox>}
      </Modal>

      {/* ---------- Delete (super-admin) ---------- */}
      <Modal
        open={modal === 'remove'}
        onClose={closeModal}
        title={t('admin.plans.remove.title')}
        footer={
          <>
            <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '10px 18px' }} onClick={closeModal} disabled={busy}>
              {t('admin.common.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{
                width: 'auto',
                padding: '10px 18px',
                background: '#b91c1c',
                borderColor: '#b91c1c',
                boxShadow: '0 6px 14px rgba(185,28,28,0.20)',
              }}
              onClick={handleRemove}
              disabled={busy}
            >
              {busy ? '…' : t('admin.plans.remove.confirm')}
            </button>
          </>
        }
      >
        <p className="m-0 mb-4" style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}>
          {t('admin.plans.remove.description')}
        </p>
        <Labeled label={t('admin.plans.remove.reason')}>
          <textarea
            className="field"
            rows={3}
            placeholder={t('admin.plans.remove.reasonPlaceholder')}
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
            style={{ padding: '12px 14px', resize: 'vertical' }}
          />
        </Labeled>
        {actionError && <ErrorBox>{actionError}</ErrorBox>}
      </Modal>
    </div>
  );
}

/* ============================================================
 *  Local helpers
 * ============================================================ */

const ICON_ACTION_TONES = {
  neutral: { color: 'var(--text-ink-soft)', hbg: 'rgba(44,47,124,0.10)', hcolor: 'var(--accent-primary)' },
  success: { color: '#136d4a', hbg: 'rgba(19,109,74,0.12)', hcolor: '#136d4a' },
  warning: { color: '#b8862a', hbg: 'rgba(184,134,42,0.16)', hcolor: '#9a701f' },
  danger: { color: 'var(--accent-danger)', hbg: 'rgba(185,28,28,0.12)', hcolor: 'var(--accent-danger)' },
};

function IconAction({ icon: Icon, label, onClick, tone = 'neutral' }) {
  const tn = ICON_ACTION_TONES[tone] || ICON_ACTION_TONES.neutral;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex items-center justify-center"
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: tn.color,
        fontFamily: 'inherit',
        transition: 'background 0.15s ease, color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = tn.hbg;
        e.currentTarget.style.color = tn.hcolor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = tn.color;
      }}
    >
      <Icon size={15} strokeWidth={1.85} />
    </button>
  );
}

function ViewField({ label, children, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <div
        style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--text-ink)', wordBreak: 'break-word', lineHeight: 1.5 }}>
        {children || <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </div>
    </div>
  );
}

function Labeled({ label, hint, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

/* Feature picker — a checklist driven by the catalog (codes → labels).
 * The plan stores codes; this toggles codes in/out of the array. Any
 * code already on the plan but missing from the catalog is still shown
 * (labelled by its code) so editing never silently drops it. */
function FeatureChecklist({ catalog, loading, value, onChange, lang, t }) {
  const selected = Array.isArray(value) ? value : [];
  const selectedSet = new Set(selected);

  const toggle = (code) => {
    if (selectedSet.has(code)) onChange(selected.filter((c) => c !== code));
    else onChange([...selected, code]);
  };

  if (loading) {
    return <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('admin.plans.form.featuresLoading')}</div>;
  }

  const catalogCodes = new Set(catalog.map((c) => c.code));
  const extras = selected.filter((c) => !catalogCodes.has(c)).map((c) => ({ code: c, en: c, ar: c, unknown: true }));
  const items = [...catalog, ...extras];

  if (!items.length) {
    return <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('admin.plans.form.featuresEmpty')}</div>;
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-1.5"
      style={{
        maxHeight: 220,
        overflowY: 'auto',
        padding: 4,
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        background: 'var(--bg-canvas)',
      }}
    >
      {items.map((item) => {
        const checked = selectedSet.has(item.code);
        const label = (lang === 'ar' ? item.ar : item.en) || item.en || item.ar || item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => toggle(item.code)}
            className="flex items-center gap-2.5 text-start"
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: 'none',
              background: checked ? 'rgba(44,47,124,0.07)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (!checked) e.currentTarget.style.background = 'var(--bg-surface)';
            }}
            onMouseLeave={(e) => {
              if (!checked) e.currentTarget.style.background = 'transparent';
            }}
          >
            <span
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                border: `1.5px solid ${checked ? 'var(--accent-primary)' : 'var(--border-strong)'}`,
                background: checked ? 'var(--accent-primary)' : 'transparent',
              }}
            >
              {checked && <Check size={12} color="white" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span
                className="block truncate"
                style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-ink)' }}
              >
                {label}
              </span>
              {item.unknown && (
                <span className="block truncate" style={{ fontSize: 10.5, color: 'var(--accent-danger)', fontFamily: 'monospace' }}>
                  {item.code}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 text-start"
      style={{
        padding: '10px 12px',
        background: checked ? 'rgba(44,47,124,0.06)' : 'var(--bg-canvas)',
        border: `1px solid ${checked ? 'rgba(44,47,124,0.30)' : 'var(--border-default)'}`,
        borderRadius: 10,
        cursor: 'pointer',
        fontFamily: 'inherit',
        width: '100%',
      }}
    >
      <span
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          background: checked ? 'var(--accent-primary)' : 'var(--border-strong)',
          position: 'relative',
          flexShrink: 0,
          transition: 'background 0.15s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            insetInlineStart: checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'white',
            transition: 'inset-inline-start 0.15s ease',
          }}
        />
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-ink)' }}>{label}</span>
    </button>
  );
}

function ErrorBox({ children }) {
  return (
    <div
      className="p-3 rounded-[10px] mt-1"
      style={{
        background: 'rgba(185,28,28,0.06)',
        border: '1px solid rgba(185,28,28,0.18)',
        color: 'var(--accent-danger)',
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}
