import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RefreshCw, Upload, FolderKanban, Building2, Users, Trash2, PhoneOff, ArrowLeft } from 'lucide-react';
import { admin } from '../../../services';
import { useTranslation } from '../../../i18n/LanguageContext';
import { PageHeader, Card } from '../../../components/admin/AdminUI';
import {
  RasdAdminNav,
  Notice,
  BatchStatusBadge,
  num,
  date,
} from '../../../components/admin/rasd/RasdAdminKit';

/* ============================================================
 *  AdminRasdSummaryPage — /admin/rasd
 *  ----------------------------------------------------------------
 *  The landing screen of رصد maintenance (GET /admin/rasd/summary).
 *
 *  Contacts arithmetic: with_phone and with_email OVERLAP. Their union
 *  is `reachable`, and that is the headline number. Both = phone +
 *  email − reachable; no channel = total − reachable. The no-channel
 *  count is a work queue, not missing data to hide — it's a clickable
 *  card into `contacts?reachable=none`.
 * ============================================================ */

export default function AdminRasdSummaryPage() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await admin.rasd.summary());
    } catch (err) {
      setError(err.message || t('admin.common.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const c = data?.contacts || {};
  const both = Math.max(0, (c.with_phone ?? 0) + (c.with_email ?? 0) - (c.reachable ?? 0));
  const unreachable = Math.max(0, (c.total ?? 0) - (c.reachable ?? 0));

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.rasd.eyebrow')}
        title={t('admin.rasd.summary.title')}
        subtitle={t('admin.rasd.summary.subtitle')}
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
            <Link to="/admin/rasd/imports" className="btn-primary" style={{ width: 'auto', padding: '10px 16px' }}>
              <Upload size={14} />
              {t('admin.rasd.summary.importCta')}
            </Link>
          </>
        }
      />

      <RasdAdminNav />

      <Notice tone="error">{error}</Notice>

      {!data && loading && <div className="shimmer" style={{ height: 120, borderRadius: 14 }} />}

      {data && (
        <div className="flex flex-col gap-5">
          {/* Entity totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <EntityCard
              icon={FolderKanban}
              label={t('admin.rasd.tabs.projects')}
              total={data.projects?.total}
              trashed={data.projects?.trashed}
              to="/admin/rasd/projects"
            />
            <EntityCard
              icon={Building2}
              label={t('admin.rasd.tabs.companies')}
              total={data.companies?.total}
              trashed={data.companies?.trashed}
              to="/admin/rasd/companies"
            />
            <EntityCard
              icon={Users}
              label={t('admin.rasd.tabs.contacts')}
              total={c.total}
              trashed={c.trashed}
              to="/admin/rasd/contacts"
            />
          </div>

          {/* Reachability */}
          <Card>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {t('admin.rasd.summary.reachable')}
                </div>
                <div className="font-display" style={{ fontSize: 34, fontWeight: 700, color: 'var(--text-ink)', lineHeight: 1.15 }}>
                  {num(c.reachable ?? 0, lang)}
                  <span style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 500 }}>
                    {' '}
                    / {num(c.total ?? 0, lang)}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{t('admin.rasd.summary.reachableHint')}</div>
              </div>
              <div className="grid grid-cols-3 gap-3" style={{ minWidth: 280 }}>
                <MiniStat label={t('admin.rasd.summary.phone')} value={num(c.with_phone ?? 0, lang)} to="/admin/rasd/contacts?reachable=mobile" />
                <MiniStat label={t('admin.rasd.summary.email')} value={num(c.with_email ?? 0, lang)} to="/admin/rasd/contacts?reachable=email" />
                <MiniStat label={t('admin.rasd.summary.both')} value={num(both, lang)} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/admin/rasd/contacts?reachable=none')}
              className="w-full mt-4 flex items-center justify-between gap-3 text-start"
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(184,134,42,0.08)',
                border: '1px solid rgba(184,134,42,0.28)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span className="flex items-center gap-3">
                <PhoneOff size={18} style={{ color: '#b8862a' }} />
                <span>
                  <span className="block" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-ink)' }}>
                    {t('admin.rasd.summary.unreachable')} {num(unreachable, lang)}
                  </span>
                  <span className="block" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                    {t('admin.rasd.summary.unreachableHint')}
                  </span>
                </span>
              </span>
              <ArrowLeft
                size={16}
                style={{
                  color: 'var(--text-muted)',
                  transform: lang === 'ar' || lang === 'ur' ? 'none' : 'rotate(180deg)',
                }}
              />
            </button>
          </Card>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                {t('admin.rasd.summary.partiesAssigned')}
              </div>
              <div className="font-display" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-ink)' }}>
                {num(data.parties?.assigned ?? 0, lang)}
              </div>
            </Card>
            <Link to="/admin/rasd/projects?has_open_roles=1" style={{ textDecoration: 'none' }}>
              <Card>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {t('admin.rasd.summary.partiesOpen')}
                </div>
                <div className="font-display" style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {num(data.parties?.open ?? 0, lang)}
                </div>
              </Card>
            </Link>
          </div>

          {/* Recent batches */}
          <Card padded={false}>
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border-soft)' }}
            >
              <div className="font-semibold" style={{ fontSize: 14.5, color: 'var(--text-ink)' }}>
                {t('admin.rasd.summary.recentBatches')}
              </div>
              <Link to="/admin/rasd/imports" style={{ fontSize: 13, color: 'var(--accent-primary)' }}>
                {t('admin.rasd.summary.allBatches')}
              </Link>
            </div>
            {(data.recent_batches || []).length === 0 ? (
              <div className="p-6 text-center" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {t('admin.rasd.imports.empty')}
              </div>
            ) : (
              <ul className="m-0 p-0" style={{ listStyle: 'none' }}>
                {data.recent_batches.map((b) => (
                  <li key={b.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <Link
                      to={`/admin/rasd/imports?batch=${b.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 flex-wrap"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-ink)' }}>
                          #{b.id} · {b.filename}
                        </span>
                        <span className="block" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {t(`admin.rasd.imports.types.${b.type}`)} · {date(b.created_at, lang)}
                          {b.rows_total != null && (
                            <>
                              {' '}
                              · {num(b.rows_accepted, lang)} / {num(b.rows_total, lang)}
                            </>
                          )}
                        </span>
                      </span>
                      <BatchStatusBadge batch={b} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function EntityCard({ icon: Icon, label, total, trashed, to }) {
  const { t, lang } = useTranslation();
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Link to={to} className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'var(--text-ink-soft)' }}>
          <Icon size={16} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        </Link>
        {trashed > 0 && (
          <Link
            to={`${to}?trashed=only`}
            className="flex items-center gap-1"
            style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
            title={t('admin.rasd.common.trashOnly')}
          >
            <Trash2 size={12} />
            {num(trashed, lang)}
          </Link>
        )}
      </div>
      <Link to={to} style={{ textDecoration: 'none' }}>
        <div className="font-display mt-2" style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-ink)' }}>
          {num(total ?? 0, lang)}
        </div>
      </Link>
    </Card>
  );
}

function MiniStat({ label, value, to }) {
  const body = (
    <div
      className="p-3 rounded-[10px] text-center"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-soft)' }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-ink)' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
  return to ? (
    <Link to={to} style={{ textDecoration: 'none' }}>
      {body}
    </Link>
  ) : (
    body
  );
}
