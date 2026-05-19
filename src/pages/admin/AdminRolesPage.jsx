import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
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
  Modal,
  ConfirmDialog,
} from '../../components/admin/AdminUI';

/* ============================================================
 *  AdminRolesPage — /admin/roles (super-admin only)
 *
 *  Lists every user with admin / super-admin roles and exposes
 *  grant + revoke flows. Grant takes a user_id + reason; revoke
 *  is wired per-row from the list.
 *
 *  Note: super-admin demotion isn't exposed here — the BE
 *  rejects role.revoke on the super-admin role and the docs
 *  call that out explicitly.
 * ============================================================ */

const ROLE_OPTIONS = ['admin', 'super-admin'];

/* The /admin/roles/users endpoint returns role entries as objects:
 *   { name: 'admin', display_name: 'Administrator' }
 * but other admin endpoints (and the login/register response) emit
 * roles as plain strings:
 *   ['admin']
 * Normalize both shapes to a flat array of role-name strings so the
 * downstream membership checks and badge rendering don't have to
 * branch. Defensive against malformed entries (returns []).
 */
function normalizeRoles(roles) {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((r) => (typeof r === 'string' ? r : r?.name))
    .filter(Boolean);
}

export default function AdminRolesPage() {
  const { t } = useTranslation();
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], meta: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal state
  const [openGrant, setOpenGrant] = useState(false);
  const [openRevoke, setOpenRevoke] = useState(null); // user object or null
  const [grantUserId, setGrantUserId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState('');

  /* The BE currently omits the `roles` array on rows from
   * /admin/roles/users — see the FE workaround in the badge cell.
   * To recover the per-row role info without an N+1 burst of
   * /admin/users/:id requests, we issue ONE request per role we
   * care about (`?role=admin` then `?role=super-admin`) and tag
   * each row client-side based on which response it came from.
   * Both requests fire in parallel; results are merged into a
   * single rows array. Pagination metadata is dropped here since
   * we may be combining pages from two queries — admin counts are
   * small in practice and the BE caps per_page at 25.
   *
   * When the user picks a specific role in the filter we only
   * issue that one request, preserving the meta for pagination.
   */
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (roleFilter) {
        const res = await admin.roles.listUsers(roleFilter);
        const tagged = res.data.map((row) => ({
          ...row,
          _resolvedRoles: normalizeRoles(row.roles).length
            ? normalizeRoles(row.roles)
            : [roleFilter],
        }));
        setData({ rows: tagged, meta: res.meta });
        return;
      }

      // No filter → fetch both role pools in parallel and merge.
      const [adminsRes, supersRes] = await Promise.all([
        admin.roles.listUsers('admin'),
        admin.roles.listUsers('super-admin'),
      ]);
      const byId = new Map();
      // Order matters: super-admins last so dual-role users end
      // up tagged with both `admin` AND `super-admin`.
      adminsRes.data.forEach((row) => {
        const baseRoles = normalizeRoles(row.roles);
        byId.set(row.id, {
          ...row,
          _resolvedRoles: baseRoles.length ? baseRoles : ['admin'],
        });
      });
      supersRes.data.forEach((row) => {
        const baseRoles = normalizeRoles(row.roles);
        const existing = byId.get(row.id);
        if (existing) {
          const merged = new Set([
            ...(existing._resolvedRoles || []),
            ...(baseRoles.length ? baseRoles : ['super-admin']),
          ]);
          byId.set(row.id, { ...existing, _resolvedRoles: [...merged] });
        } else {
          byId.set(row.id, {
            ...row,
            _resolvedRoles: baseRoles.length ? baseRoles : ['super-admin'],
          });
        }
      });
      setData({ rows: [...byId.values()], meta: null });
    } catch (err) {
      setError(err.message || t('admin.common.loadError'));
      setData({ rows: [], meta: null });
    } finally {
      setLoading(false);
    }
  }, [roleFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleGrant = async () => {
    setBusy(true);
    setActionError('');
    try {
      await admin.roles.grant(parseInt(grantUserId, 10), reason);
      showToast(t('admin.roles.grant.done'));
      setOpenGrant(false);
      setGrantUserId('');
      setReason('');
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!openRevoke) return;
    setBusy(true);
    setActionError('');
    try {
      await admin.roles.revoke(openRevoke.id, reason);
      showToast(t('admin.roles.revoke.done'));
      setOpenRevoke(null);
      setReason('');
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'user',
        label: t('admin.roles.columns.user'),
        render: (row) => (
          <div className="min-w-0">
            <div className="font-semibold" style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>
              {row.name || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              #{row.id}
            </div>
          </div>
        ),
      },
      {
        key: 'email',
        label: t('admin.roles.columns.email'),
        render: (row) => <span style={{ fontSize: 13 }}>{row.email || '—'}</span>,
      },
      {
        key: 'roles',
        label: t('admin.roles.columns.roles'),
        render: (row) => {
          // Three sources, in priority order:
          //   1. Real `roles` array from the BE (currently missing
          //      due to BE bug, but works once they ship the fix).
          //   2. `_resolvedRoles` injected by load() from filtered
          //      requests — reliable workaround.
          //   3. Fallback to the active filter / neutral chip.
          const roles =
            normalizeRoles(row.roles).length
              ? normalizeRoles(row.roles)
              : Array.isArray(row._resolvedRoles)
              ? row._resolvedRoles
              : [];
          if (roles.length > 0) {
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
          }
          if (roleFilter) {
            return (
              <Badge tone={roleFilter === 'super-admin' ? 'warning' : 'primary'}>
                {t(`admin.roles.roleNames.${roleFilter}`) || roleFilter}
              </Badge>
            );
          }
          return <Badge tone="muted">{t('admin.roles.hasRole')}</Badge>;
        },
      },
      {
        key: 'actions',
        label: t('admin.roles.columns.actions'),
        headerStyle: { textAlign: 'end' },
        cellStyle: { textAlign: 'end' },
        render: (row) => {
          // Hide Revoke when we know the user is super-admin-only —
          // the API rejects revoking that role anyway. We trust
          // either the BE-provided `roles` field or the
          // _resolvedRoles tag from our paired-request fallback.
          const roles =
            normalizeRoles(row.roles).length
              ? normalizeRoles(row.roles)
              : Array.isArray(row._resolvedRoles)
              ? row._resolvedRoles
              : [];
          const isKnownSuperAdmin =
            roles.includes('super-admin') && !roles.includes('admin');
          if (isKnownSuperAdmin) return null;
          return (
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '6px 12px', fontSize: 12.5 }}
              onClick={(e) => {
                e.stopPropagation();
                setOpenRevoke(row);
              }}
            >
              {t('admin.roles.revokeAction')}
            </button>
          );
        },
      },
    ],
    [t]
  );

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.roles.eyebrow')}
        title={t('admin.roles.title')}
        subtitle={t('admin.roles.subtitle')}
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
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 16px' }}
              onClick={() => setOpenGrant(true)}
            >
              <Plus size={14} />
              {t('admin.roles.grantCta')}
            </button>
          </>
        }
      />

      {toast && (
        <div
          className="mb-4 p-3 rounded-[10px]"
          style={{
            background: 'rgba(19,109,74,0.10)',
            border: '1px solid rgba(19,109,74,0.22)',
            color: '#136d4a',
            fontSize: 13,
          }}
        >
          {toast}
        </div>
      )}

      <FilterBar
        title={t('admin.common.filtersTitle')}
        activeCount={roleFilter ? 1 : 0}
        onReset={() => setRoleFilter('')}
        resetLabel={t('admin.common.reset')}
      >
        <FilterSelect
          label={t('admin.roles.filters.role')}
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: '', label: t('admin.common.anyRole') },
            ...ROLE_OPTIONS.map((r) => ({
              value: r,
              label: t(`admin.roles.roleNames.${r}`) || r,
            })),
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
            emptyTitle={t('admin.common.noRows')}
          />
          <Pagination meta={data.meta} onPage={(p) => setPage(p)} t={t} />
        </Card>
      </div>

      {/* Grant modal */}
      <Modal
        open={openGrant}
        onClose={() => {
          if (busy) return;
          setOpenGrant(false);
          setGrantUserId('');
          setReason('');
          setActionError('');
        }}
        title={t('admin.roles.grant.title')}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={() => {
                if (busy) return;
                setOpenGrant(false);
                setGrantUserId('');
                setReason('');
                setActionError('');
              }}
              disabled={busy}
            >
              {t('admin.common.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={handleGrant}
              disabled={
                busy ||
                !grantUserId ||
                Number.isNaN(parseInt(grantUserId, 10)) ||
                (reason || '').trim().length < 10
              }
            >
              {busy ? '…' : t('admin.roles.grant.confirm')}
            </button>
          </>
        }
      >
        <p className="m-0 mb-3" style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}>
          {t('admin.roles.grant.description')}
        </p>
        <label className="field-label">{t('admin.roles.grant.userIdLabel')}</label>
        <input
          type="number"
          className="field field-no-icon"
          value={grantUserId}
          onChange={(e) => setGrantUserId(e.target.value)}
        />
        <div className="mt-3">
          <label className="field-label">{t('admin.common.reasonLabel')}</label>
          <textarea
            className="field"
            rows={3}
            placeholder={t('admin.common.reasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ padding: '12px 14px', resize: 'vertical' }}
          />
        </div>
        {actionError && (
          <div
            className="mt-3 p-3 rounded-[10px]"
            style={{
              background: 'rgba(185,28,28,0.06)',
              border: '1px solid rgba(185,28,28,0.18)',
              color: 'var(--accent-danger)',
              fontSize: 13,
            }}
          >
            {actionError}
          </div>
        )}
      </Modal>

      {/* Revoke modal */}
      <ConfirmDialog
        open={!!openRevoke}
        onClose={() => {
          if (busy) return;
          setOpenRevoke(null);
          setReason('');
          setActionError('');
        }}
        onConfirm={handleRevoke}
        title={t('admin.roles.revoke.title')}
        description={
          openRevoke
            ? `${t('admin.roles.revoke.description')}  (${openRevoke.name || '—'} · #${openRevoke.id})`
            : t('admin.roles.revoke.description')
        }
        reason={reason}
        setReason={setReason}
        reasonLabel={t('admin.common.reasonLabel')}
        reasonPlaceholder={t('admin.common.reasonPlaceholder')}
        confirmLabel={t('admin.roles.revoke.confirm')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="danger"
        busy={busy}
        error={actionError}
      />
    </div>
  );
}
