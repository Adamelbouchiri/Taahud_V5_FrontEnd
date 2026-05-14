import React from 'react';
import {
  Calendar,
  MapPin,
  Wallet,
  ArrowLeft,
  Tag,
  Clock,
  Users,
  CheckCircle2,
} from 'lucide-react';

/**
 * Card used in the browse feed. Always opens the project details
 * page when clicked — the apply flow happens from there, after
 * the user has read the full project info.
 */
export default function OpenProjectCard({ project, onView }) {
  const applied = project.has_applied;

  return (
    <article
      className="group relative flex flex-col p-6 rounded-[16px] h-full"
      style={{
        background: 'white',
        border: applied ? '1.5px solid rgba(19,109,74,0.35)' : '1px solid #e5e3dc',
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
          e.currentTarget.style.borderColor = '#e5e3dc';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {/* Top row: owner + relative date */}
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
            {project.owner?.name?.[0] || '؟'}
          </div>
          <div className="min-w-0">
            <div
              className="font-semibold truncate"
              style={{ fontSize: 12.5, color: '#0f1129' }}
            >
              {project.owner?.name || 'عميل'}
            </div>
            <div style={{ fontSize: 11, color: '#7a7a8c' }}>
              {ownerTypeLabel(project.owner?.account_type)}
            </div>
          </div>
        </div>
        <span
          className="text-muted whitespace-nowrap"
          style={{ fontSize: 11.5, fontWeight: 500 }}
        >
          {formatRelativeDate(project.created_at)}
        </span>
      </div>

      {/* Title — clickable to view details */}
      <h3
        className="font-display text-ink m-0 mb-2"
        style={{
          fontSize: 17,
          fontWeight: 700,
          lineHeight: 1.3,
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
            className="text-right p-0 m-0 transition-colors hover:text-primary"
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

      {/* Meta row */}
      <div
        className="flex items-center gap-3 flex-wrap mb-4"
        style={{ fontSize: 12.5, color: '#7a7a8c' }}
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

      {/* Description */}
      {project.description && (
        <p
          className="text-ink-soft m-0 mb-4"
          style={{
            fontSize: 13.5,
            lineHeight: 1.65,
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

      {/* Stats row: budget + applicants */}
      <div
        className="flex items-center justify-between gap-3 pt-4 mb-4"
        style={{ borderTop: '1px solid #efece4' }}
      >
        <div className="min-w-0">
          {project.budget ? (
            <>
              <div
                className="font-semibold uppercase mb-0.5"
                style={{ fontSize: 10, letterSpacing: '0.08em', color: '#7a7a8c' }}
              >
                الميزانية
              </div>
              <div
                className="font-bold inline-flex items-center gap-1"
                style={{ fontSize: 14, color: '#0f1129' }}
              >
                <Wallet size={13} strokeWidth={1.7} className="text-secondary" />
                {formatNumber(project.budget)}{' '}
                <span style={{ fontSize: 11, color: '#7a7a8c' }}>ر.س</span>
              </div>
            </>
          ) : (
            <span style={{ fontSize: 12, color: '#7a7a8c' }}>
              ميزانية غير محدّدة
            </span>
          )}
        </div>

        {/* Applications count */}
        <div className="text-end">
          <div
            className="font-semibold uppercase mb-0.5"
            style={{ fontSize: 10, letterSpacing: '0.08em', color: '#7a7a8c' }}
          >
            متقدّمون
          </div>
          <div
            className="font-bold inline-flex items-center gap-1"
            style={{ fontSize: 13.5, color: '#3a3a52' }}
          >
            <Users size={12} strokeWidth={1.8} />
            {project.applications_count ?? 0}
          </div>
        </div>
      </div>

      {/* CTA — always opens project details. The apply button
          lives on the details page, after the user has reviewed
          the project. */}
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
            تم تقديم طلبك — عرض التفاصيل
          </>
        ) : (
          <>
            <ArrowLeft size={14} />
            عرض التفاصيل
          </>
        )}
      </button>
    </article>
  );
}

/* ---------- Helpers ---------- */

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

function ownerTypeLabel(t) {
  if (t === 'developer') return 'مطوّر عقاري';
  if (t === 'individual') return 'عميل';
  return 'صاحب المشروع';
}

function formatNumber(n) {
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return n;
  return new Intl.NumberFormat('ar-SA').format(num);
}

function formatRelativeDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return 'اليوم';
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
  if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;
  return `منذ ${Math.floor(diffDays / 365)} سنوات`;
}
