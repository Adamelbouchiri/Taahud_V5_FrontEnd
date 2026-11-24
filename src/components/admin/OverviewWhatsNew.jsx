import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Users,
  FolderClock,
  ClipboardList,
  CreditCard,
  Store,
  Radar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { admin } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import { useAdminBadges } from '../../contexts/AdminBadgesContext';
import { formatNumber as baseFormatNumber, localeFor, latinDigits } from '../../utils/money';

// Every number on the overview renders in Western digits (0-9),
// including in Arabic.
const formatNumber = (n, lang) => baseFormatNumber(n, lang, 2, { latin: true });
const formatSar = (sar, lang, t) => `${formatNumber(sar, lang)} ${t('common.currency')}`;
import { Card, Badge } from './AdminUI';

/* ============================================================
 *  OverviewWhatsNew — the «الجديد» panel on /admin.
 *  ----------------------------------------------------------------
 *  GET /admin/overview?window=today|3d|7d (ADMIN_OVERVIEW_API.md).
 *
 *  Two kinds of card:
 *    activity (new users / offers / subscriptions / رصد) — scoped by
 *      the window tabs, newest first.
 *    queue (pending projects / partner requests) — everything still
 *      waiting regardless of the window, OLDEST first, so whoever works
 *      the queue starts with what has waited longest.
 *
 *  "Mark all as read" zeroes the activity badges only; the queue
 *  badges stay until the work is done. The hint under the button says
 *  so, because that's the first thing an admin will ask about.
 *
 *  waiting_since is turned into "submitted 2 hours ago" client-side
 *  and re-ticked every minute, so the phrase ages without a request.
 * ============================================================ */

const WINDOWS = ['today', '3d', '7d'];

const TONES = {
  users:         { fg: 'var(--accent-primary)', bg: 'rgba(44,47,124,0.10)' },
  projects:      { fg: '#b8862a',               bg: 'rgba(184,134,42,0.12)' },
  offers:        { fg: '#4f53b8',               bg: 'rgba(79,83,184,0.10)' },
  subscriptions: { fg: '#136d4a',               bg: 'rgba(19,109,74,0.10)' },
  partners:      { fg: '#b8862a',               bg: 'rgba(184,134,42,0.12)' },
  rasd:          { fg: '#0d5538',               bg: 'rgba(13,85,56,0.10)' },
};

/** "2 hours ago" / «قبل ساعتين» from an ISO date against `now`. */
function relTime(iso, now, lang) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const sec = Math.round((then - now) / 1000); // negative = past
  const abs = Math.abs(sec);
  const [value, unit] =
    abs < 60 ? [0, 'minute']
    : abs < 3600 ? [Math.round(sec / 60), 'minute']
    : abs < 86400 ? [Math.round(sec / 3600), 'hour']
    : [Math.round(sec / 86400), 'day'];
  try {
    return new Intl.RelativeTimeFormat(latinDigits(localeFor(lang)),{ numeric: 'auto' }).format(value, unit);
  } catch {
    return '';
  }
}

export default function OverviewWhatsNew({ refreshKey = 0 }) {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { markRead } = useAdminBadges();

  const [win, setWin] = useState('today');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const res = await admin.overview.cards(win);
      if (id === reqId.current) setData(res);
    } catch (err) {
      if (id === reqId.current) setError(err.message || t('admin.common.loadError'));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Keep relative phrases fresh without hitting the API.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleMarkAll = async () => {
    setMarking(true);
    setMarkError('');
    try {
      await markRead(); // context repaints the sidebar from the response
    } catch (err) {
      setMarkError(err.message || t('admin.common.loadError'));
    } finally {
      setMarking(false);
    }
  };

  const cards = data?.cards || {};
  const pending = cards.projects_pending;
  const sar = (v) => formatSar(v, lang, t);
  const ago = (iso) => relTime(iso, now, lang);
  const arenaLabel = (a) => (a ? t(`arena.${a}.label`) : '');
  const join = (...parts) => parts.filter(Boolean).join(' · ');
  // t() echoes the key on a miss — fall back to the raw status then.
  const subStatusLabel = (s) => {
    const key = `admin.overview.whatsNew.subStatus.${s}`;
    const label = t(key);
    return label === key ? s : label;
  };

  return (
    <section className="mb-7">
      {/* ------- Header: title, window tabs, mark-all ------- */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center"
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(44,47,124,0.10)', color: 'var(--accent-primary)',
            }}
          >
            <Bell size={17} />
          </div>
          <div>
            <h2
              className="font-display m-0"
              style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-ink)' }}
            >
              {t('admin.overview.whatsNew.title')}
            </h2>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              {t('admin.overview.whatsNew.subtitle')}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-stretch sm:items-end gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div
              role="tablist"
              className="inline-flex p-1"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 999,
              }}
            >
              {WINDOWS.map((w) => {
                const active = w === win;
                return (
                  <button
                    key={w}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setWin(w)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 999,
                      border: 0,
                      fontSize: 12.5,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      background: active ? 'var(--accent-primary)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-ink-soft)',
                      transition: 'background 0.15s ease, color 0.15s ease',
                    }}
                  >
                    {t(`admin.overview.whatsNew.windows.${w}`)}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '8px 14px' }}
              onClick={handleMarkAll}
              disabled={marking}
            >
              <CheckCheck size={14} />
              {marking ? '…' : t('admin.overview.whatsNew.markAllRead')}
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {markError || t('admin.overview.whatsNew.markAllHint')}
          </div>
        </div>
      </div>

      {/* ------- Oldest pending project ------- */}
      {pending?.waiting_since && (
        <button
          type="button"
          onClick={() => navigate('/admin/projects?status=pending_review')}
          className="w-full flex items-center gap-3 text-start mb-4"
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(184,134,42,0.10)',
            border: '1px solid rgba(184,134,42,0.30)',
            color: '#8a6418',
            fontSize: 13.5,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <AlertTriangle size={17} style={{ flexShrink: 0 }} />
          <span className="flex-1">
            {t('admin.overview.whatsNew.oldestWaiting', {
              ago: ago(pending.waiting_since),
              count: formatNumber(pending.count, lang),
            })}
          </span>
          <span style={{ fontSize: 12.5, textDecoration: 'underline' }}>
            {t('admin.overview.whatsNew.review')}
          </span>
        </button>
      )}

      {error && !loading && (
        <Card style={{ marginBottom: 16 }}>
          <div
            className="flex items-center justify-between gap-4"
            style={{ color: 'var(--accent-danger)', fontSize: 13.5 }}
          >
            <span>{error}</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '8px 14px' }}
              onClick={load}
            >
              {t('admin.overview.stats.retry')}
            </button>
          </div>
        </Card>
      )}

      {/* ------- Six cards ------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <OverviewCard
          icon={Users}
          tone={TONES.users}
          title={t('admin.overview.whatsNew.cards.newUsers')}
          count={cards.new_users?.count}
          loading={loading && !data}
          lang={lang}
          t={t}
          viewAllTo="/admin/users"
          items={cards.new_users?.items}
          emptyText={t('admin.overview.whatsNew.empty.activity')}
          renderItem={(u) => ({
            key: u.id ?? u.identifier,
            primary: u.name,
            secondary: join(u.type_label, u.city),
            trailing: ago(u.created_at),
            to: u.id ? `/admin/users/${u.id}` : null,
          })}
        />

        <OverviewCard
          icon={FolderClock}
          tone={TONES.projects}
          queue
          title={t('admin.overview.whatsNew.cards.projectsPending')}
          count={pending?.count}
          loading={loading && !data}
          lang={lang}
          t={t}
          viewAllTo="/admin/projects?status=pending_review"
          items={pending?.items}
          emptyText={t('admin.overview.whatsNew.empty.queue')}
          renderItem={(p) => ({
            key: p.id,
            primary: p.name,
            secondary: join(p.owner, arenaLabel(p.arena), p.city),
            trailing: p.budget != null ? sar(p.budget) : '',
            to: p.id ? `/admin/projects/${p.id}` : null,
          })}
        />

        <OverviewCard
          icon={ClipboardList}
          tone={TONES.offers}
          title={t('admin.overview.whatsNew.cards.newOffers')}
          count={cards.new_offers?.count}
          loading={loading && !data}
          lang={lang}
          t={t}
          viewAllTo="/admin/applications"
          items={cards.new_offers?.items}
          emptyText={t('admin.overview.whatsNew.empty.activity')}
          renderItem={(o) => ({
            key: o.id,
            primary: o.applicant,
            secondary: o.project,
            trailing: o.bid_amount != null ? sar(o.bid_amount) : '',
          })}
        />

        <OverviewCard
          icon={CreditCard}
          tone={TONES.subscriptions}
          title={t('admin.overview.whatsNew.cards.newSubscriptions')}
          count={cards.new_subscriptions?.count}
          extra={
            cards.new_subscriptions
              ? t('admin.overview.whatsNew.revenue', {
                  amount: sar(cards.new_subscriptions.revenue ?? 0),
                })
              : null
          }
          loading={loading && !data}
          lang={lang}
          t={t}
          viewAllTo="/admin/subscriptions"
          items={cards.new_subscriptions?.items}
          emptyText={t('admin.overview.whatsNew.empty.activity')}
          renderItem={(s) => ({
            key: s.id,
            primary: s.user,
            secondary: s.plan,
            trailing: s.price != null ? sar(s.price) : '',
            // Trials carry a price snapshot nobody paid — flag them so
            // the row doesn't read as revenue (it isn't counted in it).
            badge:
              s.status && s.status !== 'active' ? (
                <Badge tone="warning">{subStatusLabel(s.status)}</Badge>
              ) : null,
          })}
        />

        <OverviewCard
          icon={Store}
          tone={TONES.partners}
          queue
          title={t('admin.overview.whatsNew.cards.partnerRequests')}
          count={cards.partner_requests?.count}
          loading={loading && !data}
          lang={lang}
          t={t}
          viewAllTo="/admin/partner-applications?status=pending"
          items={cards.partner_requests?.items}
          emptyText={t('admin.overview.whatsNew.empty.queue')}
          renderItem={(r) => ({
            key: r.id,
            primary: r.company,
            secondary: join(r.sector, r.applicant ?? t('admin.overview.whatsNew.guestApplicant')),
            trailing: ago(r.created_at),
          })}
        />

        <RasdCard
          tone={TONES.rasd}
          data={cards.rasd}
          loading={loading && !data}
          lang={lang}
          t={t}
          onOpen={() => navigate('/admin/rasd')}
        />
      </div>
    </section>
  );
}


/* ---------- card shell ---------- */

function CardHead({ icon: Icon, tone, title, count, queue, extra, lang, t }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 34, height: 34, borderRadius: 10, background: tone.bg, color: tone.fg }}
        >
          <Icon size={17} strokeWidth={1.9} />
        </div>
        <div className="min-w-0">
          <div
            className="font-display truncate"
            style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-ink)' }}
          >
            {title}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {queue
              ? t('admin.overview.whatsNew.queueNote')
              : extra || t('admin.overview.whatsNew.activityNote')}
          </div>
        </div>
      </div>
      <div
        className="font-display flex-shrink-0"
        style={{
          fontSize: 26,
          fontWeight: 700,
          lineHeight: 1,
          color: count ? tone.fg : 'var(--text-muted)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatNumber(count ?? 0, lang)}
      </div>
    </div>
  );
}

function OverviewCard({
  icon,
  tone,
  title,
  count,
  queue = false,
  extra,
  items,
  renderItem,
  emptyText,
  viewAllTo,
  loading,
  lang,
  t,
}) {
  const navigate = useNavigate();
  const { dir } = useTranslation();
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const rows = Array.isArray(items) ? items.map(renderItem) : [];

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', padding: 18 }}>
      <CardHead
        icon={icon}
        tone={tone}
        title={title}
        count={count}
        queue={queue}
        extra={extra}
        lang={lang}
        t={t}
      />

      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="shimmer" style={{ height: 38, borderRadius: 8 }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div
            className="flex items-center justify-center text-center"
            style={{
              minHeight: 90,
              fontSize: 12.5,
              color: 'var(--text-muted)',
              background: 'var(--bg-canvas)',
              borderRadius: 10,
            }}
          >
            {emptyText}
          </div>
        ) : (
          <ul className="m-0 p-0 flex flex-col" style={{ listStyle: 'none' }}>
            {rows.map((r, i) => (
              <li
                key={r.key ?? i}
                style={{ borderTop: i ? '1px solid var(--border-soft)' : 'none' }}
              >
                <ItemRow row={r} onClick={r.to ? () => navigate(r.to) : undefined} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate(viewAllTo)}
        className="flex items-center justify-center gap-1 mt-3"
        style={{
          padding: '8px 10px',
          borderRadius: 9,
          border: '1px solid var(--border-default)',
          background: 'transparent',
          color: 'var(--accent-primary)',
          fontSize: 12.5,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        {t('admin.overview.whatsNew.viewAll')}
        <Chevron size={14} />
      </button>
    </Card>
  );
}

function ItemRow({ row, onClick }) {
  const [hover, setHover] = useState(false);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="w-full flex items-center gap-3 text-start"
      style={{
        padding: '9px 6px',
        background: onClick && hover ? 'var(--bg-canvas)' : 'transparent',
        border: 0,
        borderRadius: 8,
        fontFamily: 'inherit',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div className="min-w-0 flex-1">
        <div
          className="truncate"
          style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-ink)' }}
        >
          {row.primary || '—'}
        </div>
        {row.secondary && (
          <div className="truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {row.secondary}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {row.trailing && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-ink-soft)',
              whiteSpace: 'nowrap',
            }}
          >
            {row.trailing}
          </span>
        )}
        {row.badge}
      </div>
    </Tag>
  );
}

function RasdCard({ tone, data, loading, lang, t, onOpen }) {
  const { dir } = useTranslation();
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const stat = (label, value, strong) => (
    <div
      className="flex-1"
      style={{ padding: '14px 12px', borderRadius: 10, background: 'var(--bg-canvas)' }}
    >
      <div
        className="font-display"
        style={{
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.1,
          color: strong ? tone.fg : 'var(--text-ink)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatNumber(value ?? 0, lang)}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', padding: 18 }}>
      <CardHead
        icon={Radar}
        tone={tone}
        title={t('admin.overview.whatsNew.cards.rasd')}
        count={data?.new}
        lang={lang}
        t={t}
      />
      <div className="flex-1">
        {loading ? (
          <div className="shimmer" style={{ height: 80, borderRadius: 10 }} />
        ) : (
          <div className="flex gap-3">
            {stat(t('admin.overview.whatsNew.rasdNew'), data?.new, true)}
            {stat(t('admin.overview.whatsNew.rasdActive'), data?.active)}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center justify-center gap-1 mt-3"
        style={{
          padding: '8px 10px',
          borderRadius: 9,
          border: '1px solid var(--border-default)',
          background: 'transparent',
          color: 'var(--accent-primary)',
          fontSize: 12.5,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        {t('admin.overview.whatsNew.viewAll')}
        <Chevron size={14} />
      </button>
    </Card>
  );
}
