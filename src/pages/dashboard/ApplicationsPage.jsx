import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Inbox,
  Send,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  Calendar,
  ExternalLink,
  User,
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { applications as applicationsApi } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import {
  canApplyAnyArena,
  canPostAnyArena,
  canSeeApplicantName,
} from '../../config/projectConstants';

/* ============================================================
 *  ApplicationsPage — /dashboard/applications
 *  ----------------------------------------------------------------
 *  Lists every application the current user is involved in:
 *    - Submitted   → bids I sent (applicant)
 *    - Received    → bids on my projects (project owner)
 *
 *  The BE returns the union via GET /api/applications. We split
 *  client-side using applicant.id vs user.id so we don't fire
 *  two requests.
 *
 *  Role-aware tabs (FRONTEND_INTEGRATION.md §3):
 *    - "Submitted" tab is shown only when the user can bid in at
 *      least one arena (entrepreneur, engineering, developer).
 *      Individuals and suppliers never see it.
 *    - "Received" tab is shown only when the user can post in at
 *      least one arena (individual, entrepreneur, developer).
 *      Engineering offices never see it.
 *
 *  When only one perspective applies, we drop the tab switcher
 *  entirely and just show that list — no fake "0 / 0" toggle.
 * ============================================================ */

const STATUSES = ['all', 'pending', 'accepted', 'rejected'];

export default function ApplicationsPage() {
  const { user } = useUser();
  const { t } = useTranslation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [acting, setActing] = useState(null); // application id currently being accepted/rejected

  const accountType = user?.account_type;
  const canSubmit = canApplyAnyArena(accountType);
  const canReceive = canPostAnyArena(accountType);

  // If both perspectives apply, start on whatever the user is more
  // likely to act on — applicants think of "my bids" first; pure
  // owners (individual) only have "received" anyway.
  const [tab, setTab] = useState(canSubmit ? 'submitted' : 'received');

  // Keep the active tab valid if the user data resolves after first
  // render (e.g. an individual loaded → no submitted tab → flip).
  useEffect(() => {
    if (tab === 'submitted' && !canSubmit) setTab('received');
    if (tab === 'received' && !canReceive) setTab('submitted');
  }, [tab, canSubmit, canReceive]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await applicationsApi.list();
      setItems(data);
    } catch (err) {
      setError(err.message || t('dashboard.applications.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { submitted, received } = useMemo(() => {
    const submittedList = [];
    const receivedList = [];
    for (const a of items) {
      if (a.applicant?.id && user?.id && a.applicant.id === user.id) {
        submittedList.push(a);
      } else {
        receivedList.push(a);
      }
    }
    return { submitted: submittedList, received: receivedList };
  }, [items, user?.id]);

  const visible = useMemo(() => {
    const source = tab === 'submitted' ? submitted : received;
    if (statusFilter === 'all') return source;
    return source.filter((a) => a.status === statusFilter);
  }, [tab, submitted, received, statusFilter]);

  const handleAccept = async (id) => {
    setActing(id);
    try {
      await applicationsApi.accept(id);
      await load();
    } catch (err) {
      setError(err.message || t('dashboard.applications.actionError'));
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (id) => {
    setActing(id);
    try {
      await applicationsApi.reject(id);
      await load();
    } catch (err) {
      setError(err.message || t('dashboard.applications.actionError'));
    } finally {
      setActing(null);
    }
  };

  // Only render the switcher when both perspectives are valid for
  // this role. Individuals only see "Received"; engineering offices
  // only see "Submitted" — for them, the tab strip would just be a
  // single inert button.
  const showTabs = canSubmit && canReceive;

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px]">
      <Header tab={tab} showTabs={showTabs} t={t} />

      {showTabs && (
        <Tabs
          tab={tab}
          setTab={setTab}
          submittedCount={submitted.length}
          receivedCount={received.length}
          t={t}
        />
      )}

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
          {visible.map((a) => (
            <li key={a.id} className="list-none">
              <ApplicationRow
                application={a}
                perspective={tab}
                acting={acting === a.id}
                onAccept={() => handleAccept(a.id)}
                onReject={() => handleReject(a.id)}
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
function Header({ tab, showTabs, t }) {
  // Title + subtitle reflect what the user can actually do:
  //   - both perspectives  → generic "manage applications" copy
  //   - submitted only     → engineering offices, etc.
  //   - received only      → individuals (the case Adam flagged)
  const titleKey = showTabs
    ? 'dashboard.applications.title'
    : tab === 'received'
      ? 'dashboard.applications.titleReceivedOnly'
      : 'dashboard.applications.titleSubmittedOnly';
  const subtitleKey = showTabs
    ? 'dashboard.applications.subtitle'
    : tab === 'received'
      ? 'dashboard.applications.subtitleReceivedOnly'
      : 'dashboard.applications.subtitleSubmittedOnly';

  return (
    <div className="mb-6 animate-fade-up">
      <div
        className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(44,47,124,0.08)',
          color: 'var(--text-brand)',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}
      >
        <Briefcase size={12} />
        {t('dashboard.applications.eyebrow')}
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
        {t(titleKey)}
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
        {t(subtitleKey)}
      </p>
    </div>
  );
}

/* ============================================================
 *  Tabs (submitted vs received)
 * ============================================================ */
function Tabs({ tab, setTab, submittedCount, receivedCount, t }) {
  const tabs = [
    {
      key: 'submitted',
      label: t('dashboard.applications.tabs.submitted'),
      icon: Send,
      count: submittedCount,
    },
    {
      key: 'received',
      label: t('dashboard.applications.tabs.received'),
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
              background: active ? '#2c2f7c' : 'transparent',
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
        const label =
          s === 'all'
            ? t('common.all')
            : t(`status.application.${s}`);
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className="inline-flex items-center px-3 py-1.5 rounded-full font-semibold transition-all"
            style={{
              fontSize: 12,
              background: active ? '#136d4a' : 'var(--bg-surface)',
              color: active ? 'white' : 'var(--text-ink-soft)',
              border: active
                ? '1px solid #136d4a'
                : '1px solid var(--border-default)',
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
 *  Application row
 * ============================================================ */
function ApplicationRow({
  application: a,
  perspective,
  acting,
  onAccept,
  onReject,
  t,
}) {
  const navigate = useNavigate();
  const { lang } = useTranslation();
  const isOwnerView = perspective === 'received';
  const projectId = a.project?.id ?? a.project_id;
  const canAct = isOwnerView && a.status === 'pending';

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
              {a.project?.name || t('dashboard.applications.projectFallback', { id: projectId })}
            </h3>
          </button>

          <div
            className="flex items-center gap-3 flex-wrap"
            style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
          >
            {isOwnerView && (
              <span className="inline-flex items-center gap-1.5">
                <User size={12} strokeWidth={1.8} />
                {canSeeApplicantName(a) && a.applicant?.name
                  ? a.applicant.name
                  : t('projects.details.applications.applicant')}
              </span>
            )}
            {!isOwnerView && a.project?.arena && (
              <span className="inline-flex items-center gap-1.5">
                {t(`arena.${a.project.arena}.label`)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={12} strokeWidth={1.8} />
              {formatRelativeDate(a.created_at, t)}
            </span>
          </div>
        </div>

        <ApplicationStatusPill status={a.status} t={t} />
      </div>

      {a.cover_letter && (
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
          {a.cover_letter}
        </p>
      )}

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex gap-5 flex-wrap">
          <Fact
            icon={Wallet}
            label={t('dashboard.applications.fields.bid')}
            value={`${formatNumber(a.bid_amount, lang)} ${t('common.currency')}`}
          />
          {a.delivery_date && (
            <Fact
              icon={Clock}
              label={t('dashboard.applications.fields.delivery')}
              value={formatDate(a.delivery_date, lang)}
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
              {t('dashboard.applications.actions.openProject')}
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
                {t('dashboard.applications.actions.reject')}
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={onAccept}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-white font-semibold transition-all"
                style={{
                  fontSize: 12.5,
                  background: '#136d4a',
                  border: '1px solid #136d4a',
                  cursor: acting ? 'wait' : 'pointer',
                  opacity: acting ? 0.7 : 1,
                  boxShadow: '0 4px 10px rgba(19,109,74,0.22)',
                }}
              >
                <CheckCircle2 size={13} strokeWidth={1.8} />
                {t('dashboard.applications.actions.accept')}
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

function ApplicationStatusPill({ status, t }) {
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
      <span
        className="rounded-full"
        style={{ width: 6, height: 6, background: cfg.color }}
      />
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
          background: 'rgba(44,47,124,0.08)',
          color: 'var(--text-brand)',
        }}
      >
        {tab === 'submitted' ? (
          <Send size={22} strokeWidth={1.7} />
        ) : (
          <Inbox size={22} strokeWidth={1.7} />
        )}
      </div>
      <h3
        className="font-display m-0 mb-2"
        style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-ink)' }}
      >
        {tab === 'submitted'
          ? t('dashboard.applications.empty.submittedTitle')
          : t('dashboard.applications.empty.receivedTitle')}
      </h3>
      <p
        className="m-0 max-w-md"
        style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {tab === 'submitted'
          ? t('dashboard.applications.empty.submittedSubtitle')
          : t('dashboard.applications.empty.receivedSubtitle')}
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
function localeFor(lang) {
  if (lang === 'en') return 'en-US';
  if (lang === 'zh') return 'zh-CN';
  return 'ar-SA';
}

function formatNumber(n, lang) {
  const num = typeof n === 'string' ? Number(n) : n;
  if (n == null || Number.isNaN(num)) return n ?? '';
  return new Intl.NumberFormat(localeFor(lang)).format(num);
}

function formatDate(d, lang) {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat(localeFor(lang), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(d));
  } catch {
    return d;
  }
}

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
