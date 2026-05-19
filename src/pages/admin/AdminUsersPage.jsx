import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { admin } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import {
  PageHeader,
  Card,
  FilterBar,
  FilterSelect,
  DataTable,
  Pagination,
  Badge,
} from '../../components/admin/AdminUI';

/* ============================================================
 *  AdminUsersPage — list view at /admin/users.
 *
 *  Search box (server-side, debounced), account-type and
 *  suspension filters, paginated results, click-through to
 *  detail page.
 *
 *  No bulk actions in V5 — each user action happens on the
 *  detail screen so the admin sees the surrounding context.
 * ============================================================ */

const ACCOUNT_TYPES = ['individual', 'entrepreneur', 'engineering', 'developer', 'supplier'];

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [accountType, setAccountType] = useState('');
  const [suspended, setSuspended] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], meta: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.users.list({
        search: search || undefined,
        account_type: accountType || undefined,
        suspended: suspended === '' ? undefined : suspended,
        role: role || undefined,
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
  }, [search, accountType, suspended, page, t]);

  // Debounce the search input so we don't spam the BE on every keystroke.
  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [load]);

  // Reset to page 1 whenever a filter changes — otherwise the user
  // could end up on an out-of-range page after narrowing the result set.
  useEffect(() => {
    setPage(1);
  }, [search, accountType, suspended, role]);

  const columns = useMemo(
    () => [
      {
        key: 'user',
        label: t('admin.users.columns.user'),
        render: (row) => (
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center font-display font-bold flex-shrink-0"
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: row.suspended_at ? 'var(--accent-danger)' : '#2c2f7c',
                color: 'white',
                fontSize: 13,
              }}
            >
              {(row.name || '·').trim().charAt(0)}
            </div>
            <div className="min-w-0">
              <div
                className="font-semibold truncate"
                style={{ fontSize: 13.5, color: 'var(--text-ink)' }}
              >
                {row.name || '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                ID #{row.id}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'contact',
        label: t('admin.users.columns.contact'),
        render: (row) => (
          <div className="flex flex-col min-w-0">
            <span className="truncate" style={{ fontSize: 13 }}>
              {row.email || '—'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {row.phone || '—'}
            </span>
          </div>
        ),
      },
      {
        key: 'account_type',
        label: t('admin.users.columns.accountType'),
        render: (row) =>
          row.account_type ? (
            <Badge tone="primary">{t(`accountType.${row.account_type}`)}</Badge>
          ) : (
            '—'
          ),
      },
      {
        key: 'status',
        label: t('admin.users.columns.status'),
        render: (row) => (
          <div className="flex flex-col gap-1">
            <Badge tone={row.suspended_at ? 'danger' : 'success'}>
              {row.suspended_at
                ? t('admin.users.status.suspended')
                : t('admin.users.status.active')}
            </Badge>
            {!row.is_phone_verified && (
              <Badge tone="warning">{t('admin.users.status.unverified')}</Badge>
            )}
          </div>
        ),
      },
      {
        key: 'roles',
        label: t('admin.users.columns.roles'),
        render: (row) => {
          const roles = Array.isArray(row.roles) ? row.roles : [];
          if (!roles.length) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {roles.map((r) => (
                <Badge
                  key={r}
                  tone={r === 'super-admin' ? 'warning' : 'primary'}
                >
                  {t(`admin.roles.roleNames.${r}`) || r}
                </Badge>
              ))}
            </div>
          );
        },
      },
    ],
    [t]
  );

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.users.eyebrow')}
        title={t('admin.users.title')}
        subtitle={t('admin.users.subtitle')}
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

      <FilterBar
        title={t('admin.common.filtersTitle')}
        activeCount={
          (search ? 1 : 0) +
          (accountType ? 1 : 0) +
          (suspended ? 1 : 0) +
          (role ? 1 : 0)
        }
        onReset={() => {
          setSearch('');
          setAccountType('');
          setSuspended('');
          setRole('');
        }}
        resetLabel={t('admin.common.reset')}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('admin.common.searchPlaceholder')}
      >
        <FilterSelect
          label={t('admin.users.filters.accountType')}
          value={accountType}
          onChange={setAccountType}
          options={[
            { value: '', label: t('admin.common.anyAccountType') },
            ...ACCOUNT_TYPES.map((tp) => ({
              value: tp,
              label: t(`accountType.${tp}`),
            })),
          ]}
        />
        <FilterSelect
          label={t('admin.users.columns.status')}
          value={suspended}
          onChange={setSuspended}
          options={[
            { value: '', label: t('admin.users.filters.suspendedAll') },
            { value: '0', label: t('admin.users.filters.suspendedActive') },
            { value: '1', label: t('admin.users.filters.suspendedSuspended') },
          ]}
        />
        <FilterSelect
          label={t('admin.users.filters.role')}
          value={role}
          onChange={setRole}
          options={[
            { value: '', label: t('admin.users.filters.roleAny') },
            { value: 'admin', label: t('admin.users.filters.roleAdmin') },
            {
              value: 'super-admin',
              label: t('admin.users.filters.roleSuperAdmin'),
            },
            { value: 'none', label: t('admin.users.filters.roleNone') },
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
            emptyTitle={t('admin.users.empty')}
            onRowClick={(row) => navigate(`/admin/users/${row.id}`)}
          />
          <Pagination
            meta={data.meta}
            onPage={(p) => setPage(p)}
            t={t}
          />
        </Card>
      </div>
    </div>
  );
}
