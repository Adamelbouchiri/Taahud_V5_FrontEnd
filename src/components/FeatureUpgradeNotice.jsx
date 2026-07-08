import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Gauge, Crown, ArrowRight } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { featureLabel } from '../i18n/featureLabel';

/* ============================================================
 *  FeatureUpgradeNotice
 *  ----------------------------------------------------------------
 *  Centered blocking state shown when a plan feature is unavailable —
 *  either the user's plan doesn't include it, or they've hit its
 *  quota. Used by the bid / partnership flows when the `submit_offers`
 *  quota gates the form, and reusable anywhere a feature is gated.
 *
 *  Props:
 *    info  — a check-shaped object (matches services/features
 *            deriveCheck() / the /check response / a normalized 403):
 *              { has_feature, can_use, type, limit, used, remaining,
 *                resets_at, label_ar, label_en }
 *    featureCode — the family code (e.g. 'submit_offers'); used to
 *                  resolve a localized label when the backend sent a
 *                  raw code / no label for the active language.
 *    onBack — optional secondary action (e.g. back to browse).
 *    accentColor — primary CTA color (defaults to brand green).
 *
 *  Two variants, keyed off `info`:
 *    has_feature = false  → "not in your plan"  → Subscribe CTA
 *    has_feature = true,
 *      can_use = false    → "quota reached"     → Upgrade CTA
 *                           (counters show the reset date)
 * ============================================================ */
export default function FeatureUpgradeNotice({
  info,
  featureCode,
  onBack,
  accentColor = '#136d4a',
}) {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();

  const hasFeature = info?.has_feature === true;
  const isCounter = info?.type === 'counter';
  // Always resolve a localized label — the backend may send the raw
  // family code (e.g. "submit_offers") when the user lacks the feature.
  const label = featureLabel(
    { code: featureCode, label_ar: info?.label_ar, label_en: info?.label_en },
    lang,
    t
  );

  const Icon = hasFeature ? Gauge : Lock;
  const title = hasFeature
    ? t('features.upgrade.exhaustedTitle')
    : t('features.upgrade.noFeatureTitle');
  const body = hasFeature
    ? isCounter
      ? t('features.upgrade.exhaustedCounterBody', {
          limit: info?.limit ?? '',
          label,
        })
      : t('features.upgrade.exhaustedLifetimeBody', { label })
    : t('features.upgrade.noFeatureBody', { label });

  const resetsText =
    hasFeature && isCounter && info?.resets_at
      ? t('features.upgrade.resetsOn', {
          date: formatDate(info.resets_at, lang),
        })
      : '';

  return (
    <div className="max-w-md mx-auto py-20 px-6 text-center animate-fade-up">
      <div
        className="mx-auto mb-6 flex items-center justify-center"
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          background: `${accentColor}14`,
          color: accentColor,
        }}
      >
        <Icon size={30} strokeWidth={1.7} />
      </div>

      <h2
        className="font-display m-0 mb-2"
        style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-ink)' }}
      >
        {title}
      </h2>
      <p
        className="m-0 mb-2"
        style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {body}
      </p>
      {resetsText && (
        <p
          className="m-0 mb-4"
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-ink-soft)' }}
        >
          {resetsText}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
        <button
          onClick={() => navigate('/subscribe')}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[10px] text-white font-semibold transition-all"
          style={{
            fontSize: 14,
            background: accentColor,
            border: `1px solid ${accentColor}`,
            cursor: 'pointer',
            boxShadow: `0 6px 14px ${accentColor}30`,
          }}
        >
          <Crown size={15} strokeWidth={2} />
          {t('features.upgrade.cta')}
        </button>
        {onBack && (
          <button onClick={onBack} className="btn-secondary" style={{ width: 'auto' }}>
            <ArrowRight size={15} />
            {t('features.upgrade.back')}
          </button>
        )}
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

function formatDate(d, lang) {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat(localeFor(lang), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(d));
  } catch {
    return d;
  }
}
