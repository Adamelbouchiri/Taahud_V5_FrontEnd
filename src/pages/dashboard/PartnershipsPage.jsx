import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Handshake,
  Inbox,
  Send,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  ExternalLink,
  User,
  Layers,
  Percent,
  Trash2,
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { partnerships as partnershipsApi } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import { offeringTypeLabel } from '../../config/projectConstants';

/* ============================================================
 *  PartnershipsPage — /dashboard/partnerships
 *  ----------------------------------------------------------------
 *  The Solidarity-arena counterpart to ApplicationsPage. Lists every
 *  partnership offer the current user is involved in:
 *    - Sent      → offers I submitted on others' opportunities (partner)
 *    - Received  → offers on opportunities I own (project owner)
 *
 *  The BE returns the union via GET /api/partnership-requests. We
 *  split client-side using partner.id vs user.id so we fire a single
 *  request.
 *
 *  No-cascade lifecycle: an owner can accept multiple offers (one
 *  funder + one executor + one land provider), so there is no
 *  "winner" — every pending offer keeps its own accept/reject.
 *  A partner can withdraw their own offer while it's still pending.
 * ============================================================ */

const STATUSES = ['all', 'pending', 'accepted', 'rejected'];

export default function PartnershipsPage() {
  const { user } = useUser();
  const { t } = useTranslation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [acting, setActing] = useState(null); // offer id currently being acted on
  const [tab, setTab] = useState('sent');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await partnershipsApi.list();
      setItems(data);
    } catch (err) {
      setError(err.message || t('dashboard.partnerships.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { sent, received } = useMemo(() => {
    const sentList = [];
    const receivedList = [];
    for (const o of items) {
      if (o.partner?.id && user?.id && o.partner.id === user.id) {
        sentList.push(o);
      } else {
        receivedList.push(o);
      }
    }
    return { sent: sentList, received: receivedList };
  }, [items, user?.id]);

  const visible = useMemo(() => {
    const source = tab === 'sent' ? sent : received;
    if (statusFilter === 'all') return source;
    return source.filter((o) => o.status === statusFilter);
  }, [tab, sent, received, statusFilter]);

  const handleAccept = async (id) => {
    setActing(id);
    try {
      await partnershipsApi.accept(id);
      await load();
    } catch (err) {
      setError(err.message || t('dashboard.partnerships.actionError'));
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (id) => {
    setActing(id);
    try {
      await partnershipsApi.reject(id);
      await load();
    } catch (err) {
      setError(err.message || t('dashboard.partnerships.actionError'));
    } finally {
      setActing(null);
    }
  };

  const handleWithdraw = async (id) => {
    setActing(id);
    try {
      await partnershipsApi.withdraw(id);
      await load();
    } catch (err) {
      setError(err.message || t('dashboard.partnerships.actionError'));
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px]">
      <Header t={t} />

      <Tabs
        tab={tab}
        setTab={setTab}
        sentCount={sent.length}
        receivedCount={received.length}
        t={t}
      />

      <StatusFilters value={statusFilter} onChange={setStatusFilter} t={t} />

      {error && (
        <div
          className="p-3.5 rounded-[11px] mb-5 flex items-start gap-2"
          style={{
            background: 'rgba(185,28,28,0.06)',
            border: '1px solid rgba(185,28,28,0.18)',
            color: 'var(--accent-danger)',
            fontSize: 13.5,
          }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <ListSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState tab={tab} t={t} />
      ) : (
        <ul className="m-0 p-0 space-y-3">
          {visible.map((o) => (
            <li key={o.id} className="list-none">
              <OfferRow
                offer={o}
                perspective={tab}
                acting={acting === o.id}
                onAccept={() => handleAccept(o.id)}
                onReject={() => handleReject(o.id)}
                onWithdraw={() => handleWithdraw(o.id)}
                t={t}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============================================================
 *  Header
 * ============================================================ */
function Header({ t }) {
  return (
    <div className="mb-6 animate-fade-up">
      <div
        className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(184,134,42,0.12)',
          color: '#8a6620',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}
      >
        <Handshake size={12} />
        {t('dashboard.partnerships.eyebrow')}
      </div>
      <h1
        className="font-display m-0 mb-2"
        style={{
          fontSize: 'clamp(24px, 3vw, 32px)',
          fontWeight: 700,
          lineHeight: 1.2,
          color: 'var(--text-ink)',
        }}
      >
        {t('dashboard.partnerships.title')}
      </h1>
      <p
        className="m-0"
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: 'var(--text-muted)',
          maxWidth: 620,
        }}
      >
        {t('dashboard.partnerships.subtitle')}
      </p>
    </div>
  );
}

/* ============================================================
 *  Tabs (sent vs received)
 * ============================================================ */
function Tabs({ tab, setTab, sentCount, receivedCount, t }) {
  const tabs = [
    {
      key: 'sent',
      label: t('dashboard.partnerships.tabs.sent'),
      icon: Send,
      count: sentCount,
    },
    {
      key: 'received',
      label: t('dashboard.partnerships.tabs.received'),
      icon: Inbox,
      count: receivedCount,
    },
  ];

  return (
    <div
      className="flex gap-1 mb-5 p-1 rounded-[12px] w-fit"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      {tabs.map((tb) => {
        const active = tb.key === tab;
        return (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] font-semibold transition-all"
            style={{
              fontSize: 13,
              background: active ? '#8a6620' : 'transparent',
              color: active ? 'white' : 'var(--text-ink-soft)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <tb.icon size={14} strokeWidth={1.8} />
            <span>{tb.label}</span>
            <span
              className="font-bold"
              style={{
                fontSize: 11,
                padding: '1px 7px',
                borderRadius: 999,
                background: active ? 'rgba(255,255,255,0.18)' : 'var(--bg-canvas)',
                color: active ? 'white' : 'var(--text-muted)',
              }}
            >
              {tb.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
 *  Status filter chips
 * ============================================================ */
function StatusFilters({ value, onChange, t }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {STATUSES.map((s) => {
        const active = s === value;
        const label = s === 'all' ? t('common.all') : t(`status.application.${s}`);
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className="inline-flex items-center px-3 py-1.5 rounded-full font-semibold transition-all"
            style={{
              fontSize: 12,
              background: active ? '#8a6620' : 'var(--bg-surface)',
              color: active ? 'white' : 'var(--text-ink-soft)',
              border: active ? '1px solid #8a6620' : '1px solid var(--border-default)',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
 *  Offer row
 * ============================================================ */
function OfferRow({ offer: o, perspective, acting, onAccept, onReject, onWithdraw, t }) {
  const navigate = useNavigate();
  const isOwnerView = perspective === 'received';
  const projectId = o.project?.id ?? o.project_id;
  const canAct = isOwnerView && o.status === 'pending';
  const canWithdraw = !isOwnerView && o.status === 'pending';
  const offeringLabel = o.offering_label || offeringTypeLabel(o.offering_type);

  return (
    <article
      className="p-5 rounded-[14px] animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => projectId && navigate(`/projects/${projectId}`)}
            className="bg-transparent border-0 p-0 cursor-pointer text-start"
            style={{ color: 'inherit' }}
          >
            <h3
              className="font-display m-0 mb-1.5"
              style={{
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.3,
                color: 'var(--text-ink)',
              }}
            >
              {o.project?.name ||
                t('dashboard.partnerships.projectFallback', { id: projectId })}
            </h3>
          </button>

          <div
            className="flex items-center gap-3 flex-wrap"
            style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
          >
            {isOwnerView && (
              <span className="inline-flex items-center gap-1.5">
                <User size={12} strokeWidth={1.8} />
                {o.firm_name || o.partner?.name || t('dashboard.partnerships.partner')}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={12} strokeWidth={1.8} />
              {formatRelativeDate(o.created_at, t)}
            </span>
          </div>
        </div>

        <StatusPill status={o.status} t={t} />
      </div>

      {o.message && (
        <p
          className="m-0 mb-4"
          style={{
            fontSize: 13.5,
            lineHeight: 1.7,
            color: 'var(--text-ink-soft)',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {o.message}
        </p>
      )}

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex gap-5 flex-wrap">
          <Fact
            icon={Layers}
            label={t('dashboard.partnerships.fields.offering')}
            value={offeringLabel}
          />
          {o.proposed_share && (
            <Fact
              icon={Percent}
              label={t('dashboard.partnerships.fields.share')}
              value={o.proposed_share}
            />
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {projectId && (
            <button
              type="button"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] font-semibold transition-all"
              style={{
                fontSize: 12.5,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
                cursor: 'pointer',
              }}
            >
              <ExternalLink size={13} strokeWidth={1.8} />
              {t('dashboard.partnerships.actions.openProject')}
            </button>
          )}

          {canWithdraw && (
            <button
              type="button"
              disabled={acting}
              onClick={onWithdraw}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] font-semibold transition-all"
              style={{
                fontSize: 12.5,
                background: 'var(--bg-surface)',
                border: '1px solid rgba(185,28,28,0.3)',
                color: '#b91c1c',
                cursor: acting ? 'wait' : 'pointer',
                opacity: acting ? 0.6 : 1,
              }}
            >
              <Trash2 size={13} strokeWidth={1.8} />
              {t('dashboard.partnerships.actions.withdraw')}
            </button>
          )}

          {canAct && (
            <>
              <button
                type="button"
                disabled={acting}
                onClick={onReject}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] font-semibold transition-all"
                style={{
                  fontSize: 12.5,
                  background: 'var(--bg-surface)',
                  border: '1px solid rgba(185,28,28,0.3)',
                  color: '#b91c1c',
                  cursor: acting ? 'wait' : 'pointer',
                  opacity: acting ? 0.6 : 1,
                }}
              >
                <XCircle size={13} strokeWidth={1.8} />
                {t('dashboard.partnerships.actions.reject')}
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={onAccept}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-white font-semibold transition-all"
                style={{
                  fontSize: 12.5,
                  background: '#8a6620',
                  border: '1px solid #8a6620',
                  cursor: acting ? 'wait' : 'pointer',
                  opacity: acting ? 0.7 : 1,
                  boxShadow: '0 4px 10px rgba(138,102,32,0.22)',
                }}
              >
                <CheckCircle2 size={13} strokeWidth={1.8} />
                {t('dashboard.partnerships.actions.accept')}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon
        size={14}
        strokeWidth={1.7}
        className="flex-shrink-0 mt-0.5"
        style={{ color: 'var(--text-muted)' }}
      />
      <div className="min-w-0">
        <div
          className="font-medium uppercase mb-0.5"
          style={{
            fontSize: 9.5,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </div>
        <div
          className="font-semibold"
          style={{ fontSize: 13, color: 'var(--text-ink)' }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status, t }) {
  const cfg = {
    pending: { bg: 'rgba(184,134,42,0.12)', color: '#8a6620', border: 'rgba(184,134,42,0.28)' },
    accepted: { bg: 'rgba(19,109,74,0.1)', color: '#0d5538', border: 'rgba(19,109,74,0.28)' },
    rejected: { bg: 'rgba(185,28,28,0.08)', color: '#b91c1c', border: 'rgba(185,28,28,0.24)' },
  }[status] || { bg: 'var(--bg-canvas)', color: 'var(--text-muted)', border: 'var(--border-default)' };

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap"
      style={{
        fontSize: 11.5,
        padding: '4px 10px',
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <span className="rounded-full" style={{ width: 6, height: 6, background: cfg.color }} />
      {t(`status.application.${status}`)}
    </span>
  );
}

/* ============================================================
 *  Empty / loading
 * ============================================================ */
function EmptyState({ tab, t }) {
  return (
    <div
      className="flex flex-col items-center text-center py-14 px-6 rounded-[14px]"
      style={{
        background: 'var(--bg-surface)',
        border: '1px dashed var(--border-default)',
      }}
    >
      <div
        className="mb-4 flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: 'rgba(184,134,42,0.12)',
          color: '#8a6620',
        }}
      >
        {tab === 'sent' ? (
          <Send size={22} strokeWidth={1.7} />
        ) : (
          <Inbox size={22} strokeWidth={1.7} />
        )}
      </div>
      <h3
        className="font-display m-0 mb-2"
        style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-ink)' }}
      >
        {tab === 'sent'
          ? t('dashboard.partnerships.empty.sentTitle')
          : t('dashboard.partnerships.empty.receivedTitle')}
      </h3>
      <p
        className="m-0 max-w-md"
        style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {tab === 'sent'
          ? t('dashboard.partnerships.empty.sentSubtitle')
          : t('dashboard.partnerships.empty.receivedSubtitle')}
      </p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 150,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 14,
          }}
        />
      ))}
    </div>
  );
}

/* ============================================================
 *  Helpers
 * ============================================================ */
function formatRelativeDate(d, t) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return t('common.relative.today');
  if (diffDays === 1) return t('common.relative.yesterday');
  if (diffDays < 7) return t('common.relative.daysAgo', { value: diffDays });
  if (diffDays < 30)
    return t('common.relative.weeksAgo', { value: Math.floor(diffDays / 7) });
  if (diffDays < 365)
    return t('common.relative.monthsAgo', { value: Math.floor(diffDays / 30) });
  return t('common.relative.yearsAgo', { value: Math.floor(diffDays / 365) });
}
