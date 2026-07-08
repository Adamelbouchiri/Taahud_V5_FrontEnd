import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge, Infinity as InfinityIcon, Info, AlertTriangle, Crown } from 'lucide-react';
import useFeatures from '../../hooks/useFeatures';
import { useTranslation } from '../../i18n/LanguageContext';
import { featureLabel } from '../../i18n/featureLabel';

/* ============================================================
 *  PlanUsage — dashboard plan entitlements panel.
 *  ----------------------------------------------------------------
 *  Surfaces the user's feature quotas (counters + lifetime) as usage
 *  cards, and a subscription banner distinguishing trial / expired /
 *  active (see FEATURE_GATING_INTEGRATION.md).
 *
 *  Renders nothing while loading fails silently — a dashboard should
 *  never break because the features endpoint hiccuped. Boolean access
 *  flags are omitted here (they have no usage to meter).
 *
 *  Intended for subscription-bearing account types (entrepreneur /
 *  engineering / developer); free individuals never subscribe, so the
 *  caller gates on account_type.
 * ============================================================ */
export default function PlanUsage() {
  const { features, meta, loading, error } = useFeatures();
  const { t } = useTranslation();

  if (loading) return <PlanUsageSkeleton />;
  // Fail silent — don't nag or show a broken panel on API failure.
  if (error) return null;

  const hasActive = meta?.has_active_subscription === true;
  const onTrial = meta?.is_on_trial === true;

  // Only counters and lifetime quotas have meaningful usage to meter.
  const quotas = Object.entries(features)
    .filter(([, f]) => f?.type === 'counter' || f?.type === 'lifetime')
    .map(([code, f]) => ({ code, ...f }));

  // Nothing worth showing and the subscription is healthy → render nothing.
  if (quotas.length === 0 && hasActive) return null;

  return (
    <section className="animate-fade-up mb-9">
      <div className="flex items-center gap-2 mb-4">
        <Gauge size={16} strokeWidth={1.7} style={{ color: 'var(--text-muted)' }} />
        <h2
          className="font-display m-0"
          style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-ink)' }}
        >
          {t('features.usage.title')}
        </h2>
      </div>

      {!hasActive && <SubscriptionBanner onTrial={onTrial} />}

      {quotas.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          {quotas.map((q) => (
            <QuotaCard key={q.code} feature={q} />
          ))}
        </div>
      )}
    </section>
  );
}

/* Trial / expired banner. Active subs render no banner (caller only
   mounts the banner when has_active_subscription is false). */
function SubscriptionBanner({ onTrial }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const info = onTrial
    ? {
        icon: Info,
        color: '#2c2f7c',
        title: t('features.banner.trialTitle'),
        body: t('features.banner.trialBody'),
      }
    : {
        icon: AlertTriangle,
        color: '#9c4221',
        title: t('features.banner.expiredTitle'),
        body: t('features.banner.expiredBody'),
      };
  const Icon = info.icon;

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-[14px]"
      style={{ background: `${info.color}0d`, border: `1px solid ${info.color}2e` }}
    >
      <Icon size={19} strokeWidth={1.8} style={{ color: info.color, flexShrink: 0, marginTop: 2 }} />
      <div className="min-w-0 flex-1">
        <div
          className="font-semibold mb-0.5"
          style={{ fontSize: 14, color: 'var(--text-ink)' }}
        >
          {info.title}
        </div>
        <p
          className="m-0"
          style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-muted)' }}
        >
          {info.body}
        </p>
      </div>
      <button
        onClick={() => navigate('/subscribe')}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] text-white font-semibold transition-all flex-shrink-0"
        style={{
          fontSize: 12.5,
          background: info.color,
          border: `1px solid ${info.color}`,
          cursor: 'pointer',
        }}
      >
        <Crown size={13} strokeWidth={2} />
        {t('features.banner.cta')}
      </button>
    </div>
  );
}

function QuotaCard({ feature }) {
  const { t, lang } = useTranslation();
  const label = featureLabel(feature, lang, t);
  const unlimited = feature.limit == null;
  const used = feature.used ?? 0;
  const percent = unlimited ? 0 : Math.min(100, Math.round((used / feature.limit) * 100));
  const barColor = percent >= 90 ? '#b91c1c' : percent >= 70 ? '#9c4221' : '#136d4a';

  return (
    <div
      className="p-4 rounded-[14px]"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className="font-semibold"
          style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--text-ink)' }}
        >
          {label}
        </div>
        {unlimited && (
          <span
            className="inline-flex items-center gap-1 rounded-full font-bold flex-shrink-0"
            style={{
              fontSize: 10,
              padding: '2px 8px',
              background: 'rgba(19,109,74,0.1)',
              color: '#0d5538',
            }}
          >
            <InfinityIcon size={11} strokeWidth={2.2} />
            {t('features.usage.unlimited')}
          </span>
        )}
      </div>

      {unlimited ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {t('features.usage.usedCount', { used: formatNumber(used, lang) })}
        </div>
      ) : (
        <>
          <div
            style={{
              width: '100%',
              height: 6,
              borderRadius: 4,
              background: 'var(--border-soft)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${percent}%`,
                background: barColor,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-ink-soft)' }}>
              {t('features.usage.usedOfLimit', {
                used: formatNumber(used, lang),
                limit: formatNumber(feature.limit, lang),
              })}
            </span>
            {feature.type === 'counter' && feature.resets_at && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {t('features.usage.resets', { date: formatShortDate(feature.resets_at, lang) })}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PlanUsageSkeleton() {
  return (
    <div className="mb-9 animate-pulse">
      <div
        style={{ height: 16, width: 160, background: 'var(--border-soft)', borderRadius: 6, marginBottom: 16 }}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 92,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 14,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function localeFor(lang) {
  if (lang === 'en') return 'en-US';
  if (lang === 'zh') return 'zh-CN';
  if (lang === 'ur') return 'ur-PK';
  return 'ar-SA';
}

function formatNumber(n, lang) {
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return n;
  return new Intl.NumberFormat(localeFor(lang)).format(num);
}

function formatShortDate(d, lang) {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat(localeFor(lang), {
      month: 'short',
      day: 'numeric',
    }).format(new Date(d));
  } catch {
    return d;
  }
}
