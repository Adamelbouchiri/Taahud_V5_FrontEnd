import React from 'react';
import {
  MapPin,
  Wallet,
  Lock,
  ArrowLeft,
  Tag,
  Clock,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import { canSeeProjectBudget } from '../../config/projectConstants';

/**
 * Card used in the browse feed. Always opens the project details
 * page when clicked — the apply flow happens from there, after
 * the user has read the full project info.
 *
 * `currentUserId` is optional but required for budget visibility:
 * if it matches the project owner or partner, the budget number is
 * shown; otherwise a "sealed" placeholder appears. Browse feeds
 * usually display other people's projects, so the budget stays
 * hidden in practice.
 */
export default function OpenProjectCard({ project, onView, currentUserId }) {
  const { t, lang } = useTranslation();
  const applied = project.has_applied;
  const showBudget = canSeeProjectBudget(project, currentUserId);

  const ownerLabel = (() => {
    const at = project.owner?.account_type;
    if (at === 'developer') return t('accountType.developer');
    if (at === 'individual') return t('accountType.individual');
    return t('projects.list.ownerGeneric');
  })();

  return (
    <article
      className="group relative flex flex-col p-6 rounded-[16px] h-full"
      style={{
        background: 'var(--bg-surface)',
        border: applied
          ? '1.5px solid rgba(19,109,74,0.35)'
          : '1px solid var(--border-default)',
        boxShadow: applied ? '0 4px 16px rgba(19,109,74,0.08)' : 'none',
        transition:
          'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), ' +
          'box-shadow 280ms cubic-bezier(0.16, 1, 0.3, 1), ' +
          'border-color 200ms ease',
        willChange: 'transform',
      }}
      onMouseEnter={(e) => {
        if (!applied) {
          e.currentTarget.style.borderColor = '#2c2f7c';
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 16px 32px rgba(15,17,41,0.10)';
        }
      }}
      onMouseLeave={(e) => {
        if (!applied) {
          e.currentTarget.style.borderColor = 'var(--border-default)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex items-center justify-center font-display font-bold flex-shrink-0"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: 'rgba(44,47,124,0.08)',
              color: '#2c2f7c',
              fontSize: 13,
            }}
          >
            {project.owner?.name?.[0] || '·'}
          </div>
          <div className="min-w-0">
            <div
              className="font-semibold truncate"
              style={{ fontSize: 12.5, color: 'var(--text-ink)' }}
            >
              {project.owner?.name || t('projects.list.ownerFallback')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {ownerLabel}
            </div>
          </div>
        </div>
        <span
          className="whitespace-nowrap"
          style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-muted)' }}
        >
          {formatRelativeDate(project.created_at, t)}
        </span>
      </div>

      <h3
        className="font-display m-0 mb-2"
        style={{
          fontSize: 17,
          fontWeight: 700,
          lineHeight: 1.3,
          color: 'var(--text-ink)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {onView ? (
          <button
            type="button"
            onClick={() => onView(project)}
            className="text-start p-0 m-0 transition-colors hover:text-primary"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 'inherit',
              fontSize: 'inherit',
              color: 'inherit',
              lineHeight: 'inherit',
            }}
          >
            {project.name}
          </button>
        ) : (
          project.name
        )}
      </h3>

      <div
        className="flex items-center gap-3 flex-wrap mb-4"
        style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
      >
        <span className="inline-flex items-center gap-1">
          <Tag size={12} strokeWidth={1.7} />
          {project.type}
        </span>
        <Dot />
        <span className="inline-flex items-center gap-1">
          <MapPin size={12} strokeWidth={1.7} />
          {project.city}
        </span>
        {project.expected_duration && (
          <>
            <Dot />
            <span className="inline-flex items-center gap-1">
              <Clock size={12} strokeWidth={1.7} />
              {project.expected_duration}
            </span>
          </>
        )}
      </div>

      {project.description && (
        <p
          className="m-0 mb-4"
          style={{
            fontSize: 13.5,
            lineHeight: 1.65,
            color: 'var(--text-ink-soft)',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: 1,
          }}
        >
          {project.description}
        </p>
      )}

      <div
        className="flex items-center justify-between gap-3 pt-4 mb-4"
        style={{ borderTop: '1px solid var(--border-soft)' }}
      >
        <div className="min-w-0">
          {project.budget && showBudget ? (
            <>
              <div
                className="font-semibold uppercase mb-0.5"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                }}
              >
                {t('projects.list.budgetLabel')}
              </div>
              <div
                className="font-bold inline-flex items-center gap-1"
                style={{ fontSize: 14, color: 'var(--text-ink)' }}
              >
                <Wallet size={13} strokeWidth={1.7} className="text-secondary" />
                {formatNumber(project.budget, lang)}{' '}
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {t('common.currency')}
                </span>
              </div>
            </>
          ) : project.budget ? (
            // Budget exists but the viewer isn't the owner/partner —
            // sealed until acceptance.
            <>
              <div
                className="font-semibold uppercase mb-0.5"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                }}
              >
                {t('projects.list.budgetLabel')}
              </div>
              <div
                className="inline-flex items-center gap-1"
                style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}
              >
                <Lock size={11} strokeWidth={1.8} />
                {t('projects.list.budgetSealed')}
              </div>
            </>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t('projects.list.budgetUnspecified')}
            </span>
          )}
        </div>

        {/* BE returns applications_count on the project list response
            (alongside requirements_count + files_count). When present we
            render the bid count; if missing we render "—" so the column
            stays visible but doesn't lie about there being zero bids. */}
        <div className="text-end">
          <div
            className="font-semibold uppercase mb-0.5"
            style={{
              fontSize: 10,
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
            }}
          >
            {t('projects.list.applicants')}
          </div>
          <div
            className="font-bold inline-flex items-center gap-1"
            style={{ fontSize: 13.5, color: 'var(--text-ink-soft)' }}
          >
            <Users size={12} strokeWidth={1.8} />
            {typeof project.applications_count === 'number'
              ? project.applications_count
              : '—'}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onView?.(project)}
        className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-[10px] font-semibold transition-all"
        style={{
          fontSize: 13.5,
          background: applied ? 'rgba(19,109,74,0.08)' : '#2c2f7c',
          border: `1px solid ${applied ? 'rgba(19,109,74,0.22)' : '#2c2f7c'}`,
          color: applied ? '#0d5538' : 'white',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          if (applied) {
            e.currentTarget.style.background = 'rgba(19,109,74,0.12)';
          } else {
            e.currentTarget.style.background = '#1f2258';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = applied
            ? 'rgba(19,109,74,0.08)'
            : '#2c2f7c';
        }}
      >
        {applied ? (
          <>
            <CheckCircle2 size={15} />
            {t('projects.list.appliedAndView')}
          </>
        ) : (
          <>
            <ArrowLeft size={14} />
            {t('projects.list.viewDetails')}
          </>
        )}
      </button>
    </article>
  );
}

function Dot() {
  return (
    <span
      style={{
        width: 3,
        height: 3,
        borderRadius: '50%',
        background: '#cbcec9',
      }}
    />
  );
}

function localeFor(lang) {
  if (lang === 'en') return 'en-US';
  if (lang === 'zh') return 'zh-CN';
  return 'ar-SA';
}

function formatNumber(n, lang) {
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return n;
  return new Intl.NumberFormat(localeFor(lang)).format(num);
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
