import React from 'react';
import { Calendar, MapPin, Wallet, ArrowLeft, Tag } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function ProjectCard({ project, onView }) {
  const showProgress =
    project.status === 'in_progress' || project.status === 'completed';

  return (
    <article
      onClick={() => onView?.(project)}
      className="group relative flex flex-col p-6 rounded-[16px] cursor-pointer transition-all"
      style={{
        background: 'white',
        border: '1px solid #e5e3dc',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#2c2f7c';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(15,17,41,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e3dc';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Top row: status + date */}
      <div className="flex items-center justify-between mb-4">
        <StatusBadge status={project.status} size="sm" />
        <span
          className="text-muted"
          style={{ fontSize: 11.5, fontWeight: 500 }}
        >
          {formatRelativeDate(project.created_at)}
        </span>
      </div>

      {/* Title */}
      <h3
        className="font-display text-ink m-0 mb-2"
        style={{
          fontSize: 17,
          fontWeight: 700,
          lineHeight: 1.3,
          // Clamp to 2 lines
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {project.name}
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
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbcec9' }} />
        <span className="inline-flex items-center gap-1">
          <MapPin size={12} strokeWidth={1.7} />
          {project.city}
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p
          className="text-ink-soft m-0 mb-5"
          style={{
            fontSize: 13.5,
            lineHeight: 1.65,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: 1,
          }}
        >
          {project.description}
        </p>
      )}

      {/* Progress bar (active/completed) */}
      {showProgress && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="font-semibold uppercase"
              style={{ fontSize: 10.5, letterSpacing: '0.08em', color: '#7a7a8c' }}
            >
              التقدّم
            </span>
            <span
              className="font-bold"
              style={{ fontSize: 12.5, color: '#136d4a' }}
            >
              {Math.round(project.progress)}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 5,
              borderRadius: 3,
              background: '#efece4',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${project.progress}%`,
                background:
                  project.progress >= 100
                    ? '#136d4a'
                    : 'linear-gradient(90deg, #2c2f7c, #136d4a)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom: budget + view */}
      <div
        className="flex items-center justify-between pt-4 mt-auto"
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
                style={{ fontSize: 14, color: 'var(--text-brand)' }}
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

        {/* Date hint */}
        {project.start_date && (
          <div className="text-end">
            <div
              className="font-semibold uppercase mb-0.5"
              style={{ fontSize: 10, letterSpacing: '0.08em', color: '#7a7a8c' }}
            >
              البداية
            </div>
            <div
              className="font-medium inline-flex items-center gap-1"
              style={{ fontSize: 12.5, color: '#3a3a52' }}
            >
              <Calendar size={11} strokeWidth={1.7} />
              {formatDate(project.start_date)}
            </div>
          </div>
        )}
      </div>

      {/* View hint that appears on hover */}
      <div
        className="absolute opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
        style={{
          bottom: 12,
          insetInlineStart: 12,
          fontSize: 11,
          color: 'var(--text-brand)',
          fontWeight: 600,
        }}
      >
        <span>عرض التفاصيل</span>
        <ArrowLeft size={11} />
      </div>
    </article>
  );
}

/* ---------- Formatting helpers ---------- */

function formatNumber(n) {
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return n;
  return new Intl.NumberFormat('ar-SA').format(num);
}

function formatDate(d) {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(d));
  } catch {
    return d;
  }
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
