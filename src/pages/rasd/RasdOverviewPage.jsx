import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DoorOpen,
  Layers,
  Building2,
  Target,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import Ltr from '../../components/Ltr';
import { Card, PageHeader } from '../../components/admin/AdminUI';
import RasdAccessNotice from '../../components/rasd/RasdAccessNotice';
import RasdBreakdown from '../../components/rasd/RasdBreakdown';
import useRasdSummary from '../../hooks/useRasdSummary';
import { useTranslation } from '../../i18n/LanguageContext';
import { rasdLabels } from '../../i18n/rasdLabel';
import { cityLabel } from '../../config/cityTranslations';
import { formatNumber, localeFor } from '../../utils/money';
import { hasValueData } from '../../config/rasdConstants';

/* `last_updated_at` is a full ISO timestamp with offset, not a date —
   the time of day is part of the freshness signal, so it's kept. */
function formatTimestamp(iso, lang) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(localeFor(lang), {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

/* ============================================================
 *  RasdOverviewPage — /rasd
 *  ----------------------------------------------------------------
 *  GET /rasd/summary, which describes the whole dataset and takes no
 *  parameters.
 *
 *  The hero is the OPPORTUNITY COUNT — «318 فرصة متاحة في 50 مشروعًا».
 *  That is the product's actual claim and it's backed by real rows.
 *  Total estimated value is deliberately NOT the hero: the column is
 *  null on every project today, so its tile only appears once the
 *  total is non-zero (hasValueData). A confident «0 ريال» hero would
 *  be a lie told in a large font.
 *
 *  Every bar in the three breakdowns is a filter: clicking one sends
 *  its `value` (never its Arabic label) to the projects feed as a
 *  query parameter.
 *
 *  `last_updated_at` is shown rather than tucked away. A market-data
 *  product that can't say when it was last updated isn't one.
 * ============================================================ */
export default function RasdOverviewPage() {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { summary, loading, error, denial, refresh } = useRasdSummary();
  const labels = useMemo(() => rasdLabels(t), [t]);

  if (denial) {
    return (
      <RasdAccessNotice message={denial} onBack={() => navigate('/dashboard')} />
    );
  }

  const totals = summary.totals || {};
  const showValue = hasValueData(totals);

  const goToProjects = (param, value) => {
    if (!value) {
      navigate('/rasd/projects');
      return;
    }
    navigate(`/rasd/projects?${param}=${encodeURIComponent(value)}`);
  };

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px] flex flex-col gap-5">
      <PageHeader
        eyebrow={t('rasd.brand')}
        title={t('rasd.overview.title')}
        subtitle={t('rasd.overview.subtitle')}
        actions={
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }}
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={14} strokeWidth={2} />
            {t('rasd.overview.refresh')}
          </button>
        }
      />

      {error && !denial && (
        <Card>
          <p className="m-0" style={{ fontSize: 13.5, color: 'var(--accent-danger)' }}>
            {t('rasd.overview.loadError')}
          </p>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col gap-5">
          <div className="shimmer" style={{ height: 150, borderRadius: 16 }} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="shimmer" style={{ height: 96, borderRadius: 14 }} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ---------- Hero: the opportunity count ---------- */}
          <HeroOpportunities
            openRoles={totals.open_roles ?? 0}
            projects={totals.projects_with_open_roles ?? 0}
            t={t}
            lang={lang}
            onClick={() => navigate('/rasd/projects?has_gap=1')}
          />

          {/* ---------- Totals ---------- */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatTile
              icon={Layers}
              label={t('rasd.overview.totals.projects')}
              value={formatNumber(totals.projects ?? 0, lang, 0)}
              onClick={() => navigate('/rasd/projects')}
            />
            <StatTile
              icon={Building2}
              label={t('rasd.overview.totals.companies')}
              value={formatNumber(totals.companies ?? 0, lang, 0)}
              onClick={() => navigate('/rasd/companies')}
            />
            {/* Only once there is value data to show — see the note
                at the top of this file. */}
            {showValue && (
              <StatTile
                icon={Wallet}
                label={t('rasd.overview.totals.value')}
                value={
                  <>
                    <Ltr>{formatNumber(totals.estimated_value_total, lang, 0)}</Ltr>{' '}
                    {t('common.currency')}
                  </>
                }
              />
            )}
          </div>

          {/* ---------- Breakdowns ---------- */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <BreakdownHeading
                title={t('rasd.overview.breakdown.stage')}
                hint={t('rasd.overview.breakdown.hint')}
              />
              <RasdBreakdown
                rows={summary.by_stage}
                labelFor={labels.stage}
                lang={lang}
                onSelect={(v) => goToProjects('stage', v)}
                emptyLabel={t('rasd.overview.breakdown.empty')}
              />
            </Card>

            <Card>
              <BreakdownHeading
                title={t('rasd.overview.breakdown.sector')}
                hint={t('rasd.overview.breakdown.hint')}
              />
              <RasdBreakdown
                rows={summary.by_sector}
                labelFor={labels.sector}
                lang={lang}
                onSelect={(v) => goToProjects('sector', v)}
                emptyLabel={t('rasd.overview.breakdown.empty')}
              />
            </Card>

            <Card style={{ gridColumn: '1 / -1' }}>
              <BreakdownHeading
                title={t('rasd.overview.breakdown.city')}
                hint={t('rasd.overview.breakdown.hint')}
              />
              <RasdBreakdown
                rows={summary.by_city}
                // City values ARE Arabic strings — the filter sends the
                // Arabic name. cityLabel only swaps the DISPLAY to a
                // transliteration outside Arabic; the value is untouched.
                labelFor={(value, apiLabel) => cityLabel(value || apiLabel, lang)}
                lang={lang}
                onSelect={(v) => goToProjects('city', v)}
                emptyLabel={t('rasd.overview.breakdown.empty')}
              />
            </Card>
          </div>

          {summary.last_updated_at && (
            <div
              style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}
            >
              {t('rasd.overview.lastUpdated', {
                date: formatTimestamp(summary.last_updated_at, lang),
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Hero ----------
 *  «318 فرصة متاحة في 50 مشروعًا» — the whole product claim in one
 *  line, and a link straight into `?has_gap=1`, which is the only
 *  filter most users will ever need. */
function HeroOpportunities({ openRoles, projects, t, lang, onClick }) {
  const accent = '#136d4a';
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-start"
      style={{
        background: `linear-gradient(135deg, ${accent}12, ${accent}04)`,
        border: `1px solid ${accent}33`,
        borderRadius: 16,
        padding: '26px 24px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = `0 10px 24px ${accent}1f`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="flex items-center gap-4">
        <span
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: `${accent}1a`,
            color: accent,
          }}
        >
          <Target size={26} strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <div
            className="font-display"
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--text-ink)',
              lineHeight: 1.35,
            }}
          >
            {t('rasd.overview.hero', {
              roles: formatNumber(openRoles, lang, 0),
              projects: formatNumber(projects, lang, 0),
            })}
          </div>
          <div
            className="inline-flex items-center gap-1.5 mt-1"
            style={{ fontSize: 13, fontWeight: 600, color: accent }}
          >
            <DoorOpen size={14} strokeWidth={2} />
            {t('rasd.overview.heroCta')}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ---------- Stat tile ---------- */
function StatTile({ icon: Icon, label, value, onClick }) {
  const clickable = Boolean(onClick);
  return (
    <Card
      onClick={onClick}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: 'rgba(44,47,124,0.07)',
            color: 'var(--accent-primary)',
          }}
        >
          <Icon size={17} strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
            {label}
          </div>
          <div
            className="font-display"
            style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-ink)' }}
          >
            {typeof value === 'string' ? <Ltr>{value}</Ltr> : value}
          </div>
        </div>
      </div>
    </Card>
  );
}

function BreakdownHeading({ title, hint }) {
  return (
    <div className="mb-3">
      <div className="font-semibold" style={{ fontSize: 14, color: 'var(--text-ink)' }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
        {hint}
      </div>
    </div>
  );
}
