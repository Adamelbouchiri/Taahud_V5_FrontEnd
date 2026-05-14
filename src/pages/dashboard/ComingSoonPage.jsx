import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  BarChart3,
  FileText,
  MessageSquare,
  Bell,
  Wrench,
  Check,
  ArrowLeft,
  BellRing,
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  ComingSoonPage — generic placeholder for queued dashboard
 *  features. The `variant` prop picks an icon + color + the
 *  dictionary subtree that supplies title, description, eyebrow,
 *  and bullet features.
 * ============================================================ */

const VARIANTS = {
  ai: {
    icon: Sparkles,
    color: '#2c2f7c',
    accent: 'rgba(44,47,124,0.10)',
  },
  analytics: {
    icon: BarChart3,
    color: '#136d4a',
    accent: 'rgba(19,109,74,0.10)',
  },
  reports: {
    icon: FileText,
    color: '#b8862a',
    accent: 'rgba(184,134,42,0.12)',
  },
  messages: {
    icon: MessageSquare,
    color: '#3a3d99',
    accent: 'rgba(58,61,153,0.10)',
  },
  notifications: {
    icon: Bell,
    color: '#b91c1c',
    accent: 'rgba(185,28,28,0.08)',
  },
};

export default function ComingSoonPage({ variant = 'ai' }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const config = VARIANTS[variant] || VARIANTS.ai;
  const [notified, setNotified] = useState(false);
  const Icon = config.icon;
  const k = `dashboard.comingSoon.${variant}`;

  const featureKeys = [0, 1, 2, 3];

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px]">
      <div
        className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full animate-fade-up"
        style={{
          background: config.accent,
          color: config.color,
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}
      >
        <Wrench size={12} strokeWidth={2} />
        {t(`${k}.eyebrow`)} · {t('dashboard.comingSoon.pill')}
      </div>

      <div className="flex items-start gap-5 flex-wrap mb-8 animate-fade-up">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
            color: 'white',
            boxShadow: `0 14px 30px ${config.color}40`,
          }}
        >
          <Icon size={32} strokeWidth={1.7} />
        </div>
        <div className="min-w-0 flex-1">
          <h1
            className="font-display m-0 mb-2"
            style={{
              fontSize: 'clamp(24px, 3.2vw, 34px)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              color: 'var(--text-ink)',
            }}
          >
            {t(`${k}.title`)}
          </h1>
          <p
            className="m-0"
            style={{
              fontSize: 15,
              lineHeight: 1.7,
              maxWidth: 620,
              color: 'var(--text-ink-soft)',
            }}
          >
            {t(`${k}.description`)}
          </p>
        </div>
      </div>

      <div
        className="relative overflow-hidden mb-8 animate-fade-up"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 18,
          padding: '28px 26px',
          animationDelay: '0.05s',
        }}
      >
        <PreviewMock variant={variant} color={config.color} accent={config.accent} />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, transparent 35%, var(--bg-surface) 95%)',
            pointerEvents: 'none',
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: 18,
            insetInlineStart: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            padding: '6px 14px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 700,
            color: 'var(--text-muted)',
            boxShadow: '0 8px 18px rgba(15,17,41,0.06)',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          {t('dashboard.comingSoon.previewLabel')}
        </div>
      </div>

      <div
        className="grid gap-4 sm:grid-cols-2 mb-8 animate-fade-up"
        style={{ animationDelay: '0.1s' }}
      >
        {featureKeys.map((i) => (
          <div
            key={i}
            className="flex items-start gap-3"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 14,
              padding: '16px 18px',
            }}
          >
            <span
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 28,
                height: 28,
                borderRadius: 9,
                background: config.accent,
                color: config.color,
              }}
            >
              <Check size={15} strokeWidth={2.4} />
            </span>
            <span
              style={{
                fontSize: 13.5,
                lineHeight: 1.6,
                color: 'var(--text-ink-soft)',
                fontWeight: 500,
              }}
            >
              {t(`${k}.features.${i}`)}
            </span>
          </div>
        ))}
      </div>

      <div
        className="flex items-center gap-3 flex-wrap animate-fade-up"
        style={{ animationDelay: '0.15s' }}
      >
        <button
          type="button"
          onClick={() => setNotified(true)}
          disabled={notified}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-[12px] text-white font-semibold transition-all"
          style={{
            fontSize: 13.5,
            background: notified ? '#136d4a' : config.color,
            border: `1px solid ${notified ? '#136d4a' : config.color}`,
            cursor: notified ? 'default' : 'pointer',
            boxShadow: notified
              ? '0 6px 14px rgba(19,109,74,0.22)'
              : `0 6px 14px ${config.color}40`,
            opacity: notified ? 0.95 : 1,
          }}
          onMouseEnter={(e) => {
            if (notified) return;
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {notified ? (
            <>
              <Check size={15} strokeWidth={2.2} />
              {t('dashboard.comingSoon.notifyDone')}
            </>
          ) : (
            <>
              <BellRing size={15} strokeWidth={1.9} />
              {t('dashboard.comingSoon.notify')}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-[12px] font-semibold transition-all"
          style={{
            fontSize: 13.5,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-ink-soft)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-strong)';
            e.currentTarget.style.background = 'var(--bg-canvas)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-default)';
            e.currentTarget.style.background = 'var(--bg-surface)';
          }}
        >
          <ArrowLeft size={14} strokeWidth={1.9} />
          {t('dashboard.comingSoon.backToDashboard')}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 *  PreviewMock — visual hint, pure CSS shapes, no copy.
 * ============================================================ */
function PreviewMock({ variant, color, accent }) {
  if (variant === 'analytics' || variant === 'reports') {
    const bars = [55, 78, 42, 88, 64, 92, 70];
    return (
      <div>
        <MockHeader color={color} accent={accent} />
        <div className="flex items-end gap-2.5 mt-6" style={{ height: 140 }}>
          {bars.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                borderRadius: 8,
                background: `linear-gradient(180deg, ${color}, ${color}80)`,
                opacity: 0.4 + (h / 100) * 0.6,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'messages') {
    return (
      <div>
        <MockHeader color={color} accent={accent} />
        <div className="flex flex-col gap-2.5 mt-6">
          <MockBubble width="58%" side="start" color={accent} text="var(--text-ink-soft)" />
          <MockBubble width="42%" side="end" color={color} text="white" />
          <MockBubble width="64%" side="start" color={accent} text="var(--text-ink-soft)" />
          <MockBubble width="38%" side="end" color={color} text="white" />
        </div>
      </div>
    );
  }

  if (variant === 'notifications') {
    return (
      <div>
        <MockHeader color={color} accent={accent} />
        <div className="flex flex-col gap-2 mt-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3"
              style={{
                padding: '12px 14px',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-soft)',
                borderRadius: 10,
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: accent,
                  flexShrink: 0,
                }}
              />
              <div className="flex-1 flex flex-col gap-1.5">
                <span
                  style={{
                    height: 8,
                    width: '60%',
                    background: 'var(--border-default)',
                    borderRadius: 4,
                  }}
                />
                <span
                  style={{
                    height: 6,
                    width: '40%',
                    background: 'var(--border-soft)',
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <MockHeader color={color} accent={accent} />
      <div className="flex items-center gap-6 mt-6">
        <div className="relative" style={{ width: 110, height: 110, flexShrink: 0 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                inset: i * 14,
                borderRadius: '50%',
                border: `2px solid ${color}`,
                opacity: 0.18 + i * 0.18,
              }}
            />
          ))}
          <div
            className="absolute flex items-center justify-center"
            style={{
              inset: 38,
              borderRadius: '50%',
              background: color,
              color: 'white',
            }}
          >
            <Sparkles size={18} strokeWidth={1.9} />
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2.5">
          {[80, 65, 90, 55].map((w, i) => (
            <span
              key={i}
              style={{
                height: 9,
                width: `${w}%`,
                background: i === 0 ? color : 'var(--border-default)',
                opacity: i === 0 ? 0.5 : 1,
                borderRadius: 5,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MockHeader({ color, accent }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: color,
            opacity: 0.7,
          }}
        />
        <span
          style={{
            height: 10,
            width: 120,
            background: 'var(--border-default)',
            borderRadius: 5,
          }}
        />
      </div>
      <span
        style={{
          height: 22,
          width: 70,
          borderRadius: 8,
          background: accent,
        }}
      />
    </div>
  );
}

function MockBubble({ width, side, color, text }) {
  return (
    <div
      style={{
        alignSelf: side === 'end' ? 'flex-end' : 'flex-start',
        width,
        background: color,
        color: text,
        borderRadius: 12,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span style={{ height: 7, width: '80%', background: text, opacity: 0.5, borderRadius: 4 }} />
      <span style={{ height: 7, width: '55%', background: text, opacity: 0.35, borderRadius: 4 }} />
    </div>
  );
}
