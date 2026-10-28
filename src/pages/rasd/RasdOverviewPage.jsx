import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Layers,
  Building2,
  DoorOpen,
  Wallet,
  Gavel,
  Award,
  HardHat,
  Compass,
  Flag,
  Target,
  Tag,
  MapPin,
  Clock,
  RefreshCw,
  List,
  Map as MapIcon,
} from 'lucide-react';
import Ltr from '../../components/Ltr';
import { Card, PageHeader } from '../../components/admin/AdminUI';
import RasdAccessNotice from '../../components/rasd/RasdAccessNotice';
import RasdBreakdown from '../../components/rasd/RasdBreakdown';
import RasdCityMap from '../../components/rasd/RasdCityMap';
import {
  RasdDashStyles,
  RasdDash,
  DashSection,
  OppBanner,
  InvCard,
  InvCards,
  Widget,
  StackedBar,
  MeterStat,
  WidgetLink,
} from '../../components/rasd/RasdDashKit';
import useRasdSummary from '../../hooks/useRasdSummary';
import { rasd } from '../../services/rasd';
import { useTranslation } from '../../i18n/LanguageContext';
import { rasdLabels } from '../../i18n/rasdLabel';
import { cityLabel } from '../../config/cityTranslations';
import { formatNumber, latinDigits, localeFor } from '../../utils/money';
import { RASD_STAGES, hasValueData } from '../../config/rasdConstants';

/* The city breakdown's list / map choice is a per-viewer convenience,
   remembered in localStorage. */
const CITY_VIEW_KEY = 'rasd.overview.cityView';

function readCityView() {
  try {
    return localStorage.getItem(CITY_VIEW_KEY) === 'map' ? 'map' : 'list';
  } catch {
    return 'list';
  }
}

/* `last_updated_at` is a full ISO timestamp with offset, not a date —
   the time of day is part of the freshness signal, so it's kept. */
function formatTimestamp(iso, lang) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(latinDigits(localeFor(lang)), {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

/* Whole days since the last import — the headline of the freshness
   widget. Null when there's no timestamp. */
function daysSince(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

/* Stage colours for the stacked bar, as in the design: tendering is
   gold (the window that's open now), under construction navy,
   completed green, on hold red, the early stages fading greys. */
const STAGE_COLOR = {
  detected: '#b5b9cf',
  announced: '#8d97c2',
  planning: '#6f7bb8',
  design: '#5d6aa8',
  tendering: 'var(--rasd-gold)',
  awarded: '#4a56b8',
  under_construction: 'var(--rasd-navy)',
  on_hold: 'var(--rasd-red)',
  completed: 'var(--rasd-green)',
  unknown: '#9b9eae',
};

/* Value bands for «projects by value». The summary has no value
   breakdown, so each band is counted with the feed's own min_value /
   max_value filters (per_page=1, reading meta.total). Both bounds are
   inclusive on the BE, hence the .99 upper edges. */
const VALUE_BANDS = [
  { key: 'lt50m', min: null, max: 49_999_999.99 },
  { key: '50m_200m', min: 50_000_000, max: 199_999_999.99 },
  { key: '200m_1b', min: 200_000_000, max: 999_999_999.99 },
  { key: 'gt1b', min: 1_000_000_000, max: null },
];

function bandQuery(band) {
  const q = new URLSearchParams();
  if (band.min != null) q.set('min_value', String(band.min));
  if (band.max != null) q.set('max_value', String(band.max));
  return q.toString();
}

/* Counts per band, or null while loading / when there's nothing to
   count. Skipped entirely while every estimated_value is null — four
   requests to learn four zeros. */
function useValueBands(enabled) {
  const [bands, setBands] = useState(null);
  useEffect(() => {
    if (!enabled) {
      setBands(null);
      return undefined;
    }
    let cancelled = false;
    Promise.all(
      VALUE_BANDS.map((b) =>
        rasd.projects
          .list({ min_value: b.min ?? undefined, max_value: b.max ?? undefined, per_page: 1 })
          .then((res) => res.meta?.total ?? 0)
          .catch(() => 0)
      )
    ).then((counts) => {
      if (!cancelled) setBands(counts);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return bands;
}

/* Before a project is put out to tender — the time to build the
   relationship, not to bid. Summed into one card because no single
   one of these stages is big enough to say much on its own. */
const EARLY_STAGES = ['detected', 'announced', 'planning', 'design'];

/* ============================================================
 *  RasdOverviewPage — /rasd
 *  ----------------------------------------------------------------
 *  GET /rasd/summary, which describes the whole dataset and takes no
 *  parameters. Laid out after the «منصة تعاهد ورصد» design:
 *
 *    gold banner     open roles across N projects → ?has_gap=1
 *    رصد database    projects · companies · open roles · value
 *    stages now      tendering · awarded · under construction · early
 *    at a glance     stage mix, opportunity coverage, sector, cities
 *    the market      city list / map
 *
 *  Every number on the page comes from the summary; nothing the
 *  design shows that the BE can't back (matching-your-business,
 *  added this week, value bands) is drawn. Total estimated value
 *  stays conditional — the column is null on every project today,
 *  and a confident «0 ريال» is a lie told in a large font.
 *
 *  Every bar, segment and card that maps to a filter is one: clicking
 *  sends its `value` (never its Arabic label) to the projects feed.
 * ============================================================ */
export default function RasdOverviewPage() {
  const navigate = useNavigate();
  const { t, lang, dir } = useTranslation();
  const rtl = dir === 'rtl';
  const { summary, loading, error, denial, refresh } = useRasdSummary();
  const labels = useMemo(() => rasdLabels(t), [t]);
  const [cityView, setCityView] = useState(readCityView);
  const valueBands = useValueBands(!loading && !denial && hasValueData(summary.totals));

  const changeCityView = (v) => {
    setCityView(v);
    try {
      localStorage.setItem(CITY_VIEW_KEY, v);
    } catch {
      /* private mode — the choice just won't stick */
    }
  };

  if (denial) {
    return (
      <RasdAccessNotice message={denial} onBack={() => navigate('/dashboard')} />
    );
  }

  const totals = summary.totals || {};
  const showValue = hasValueData(totals);
  const num = (n) => formatNumber(n ?? 0, lang, 0, { latin: true });

  const goToProjects = (param, value) => {
    if (!value) {
      navigate('/rasd/projects');
      return;
    }
    navigate(`/rasd/projects?${param}=${encodeURIComponent(value)}`);
  };

  /* ---------- derived from by_stage ---------- */
  const stageCount = {};
  (summary.by_stage || []).forEach((r) => {
    stageCount[r.value] = r.count || 0;
  });
  const stageRows = RASD_STAGES.filter((s) => stageCount[s]).map((s) => ({
    value: s,
    label: labels.stage(s),
    count: stageCount[s],
    color: STAGE_COLOR[s] || '#9b9eae',
  }));
  const earlyCount = EARLY_STAGES.reduce((s, k) => s + (stageCount[k] || 0), 0);

  /* ---------- opportunity coverage ---------- */
  const projects = totals.projects ?? 0;
  const withRoles = totals.projects_with_open_roles ?? 0;
  const openRoles = totals.open_roles ?? 0;
  const coverage = projects ? (withRoles / projects) * 100 : 0;
  const coverageText = `${coverage > 0 && coverage < 1 ? coverage.toFixed(1) : Math.round(coverage)}%`;
  const rolesPerProject = withRoles ? (openRoles / withRoles).toFixed(1) : '0';

  /* ---------- projects by value ---------- */
  const valueRows = valueBands
    ? VALUE_BANDS.map((b, i) => ({
        value: b.key,
        label: t(`rasd.dash.valueBands.${b.key}`),
        count: valueBands[i],
      })).filter((r) => r.count > 0)
    : [];
  const valued = valueRows.reduce((s, r) => s + r.count, 0);
  const undisclosed = Math.max(0, projects - valued);

  const days = daysSince(summary.last_updated_at);
  const topCities = (summary.by_city || []).slice(0, 6);

  return (
    <RasdDash className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1180px] flex flex-col gap-4">
      <RasdDashStyles />
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
        <div className="flex flex-col gap-4">
          <div className="shimmer" style={{ height: 76, borderRadius: 14 }} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="shimmer" style={{ height: 92, borderRadius: 14 }} />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="shimmer" style={{ height: 200, borderRadius: 14 }} />
            <div className="shimmer" style={{ height: 200, borderRadius: 14 }} />
          </div>
        </div>
      ) : (
        <>
          {/* ---------- Gold banner: the opportunity count ---------- */}
          <OppBanner
            icon={Sparkles}
            rtl={rtl}
            title={t('rasd.overview.hero', { roles: num(openRoles), projects: num(withRoles) })}
            subtitle={t('rasd.overview.heroCta')}
            onClick={() => navigate('/rasd/projects?has_gap=1')}
          />

          {/* ---------- The رصد database ---------- */}
          <DashSection>{t('rasd.dash.sections.database')}</DashSection>
          <InvCards cols={showValue ? 4 : 3}>
            <InvCard
              icon={Layers}
              tone="navy"
              lang={lang}
              value={projects}
              label={t('rasd.overview.totals.projects')}
              note={t('rasd.dash.projectsNote', { count: num(withRoles) })}
              onClick={() => navigate('/rasd/projects')}
            />
            <InvCard
              icon={Building2}
              tone="green"
              lang={lang}
              value={totals.companies ?? 0}
              label={t('rasd.overview.totals.companies')}
              note={t('rasd.dash.companiesNote')}
              onClick={() => navigate('/rasd/companies')}
            />
            <InvCard
              icon={DoorOpen}
              tone="gold"
              goldValue
              lang={lang}
              value={openRoles}
              label={t('rasd.dash.openRoles')}
              note={t('rasd.dash.openRolesNote')}
              onClick={() => navigate('/rasd/projects?has_gap=1')}
            />
            {showValue && (
              <InvCard
                icon={Wallet}
                tone="red"
                lang={lang}
                value={
                  <>
                    <Ltr>{num(totals.estimated_value_total)}</Ltr>{' '}
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{t('common.currency')}</span>
                  </>
                }
                label={t('rasd.overview.totals.value')}
                note={t('rasd.dash.valueNote')}
              />
            )}
          </InvCards>

          {/* ---------- Where the projects are now ---------- */}
          <DashSection>{t('rasd.dash.sections.stagesNow')}</DashSection>
          <InvCards>
            <InvCard
              icon={Gavel}
              tone="gold"
              goldValue
              lang={lang}
              value={stageCount.tendering || 0}
              label={labels.stage('tendering')}
              note={t('rasd.dash.stageNotes.tendering')}
              onClick={() => goToProjects('stage', 'tendering')}
            />
            <InvCard
              icon={Award}
              tone="green"
              lang={lang}
              value={stageCount.awarded || 0}
              label={labels.stage('awarded')}
              note={t('rasd.dash.stageNotes.awarded')}
              onClick={() => goToProjects('stage', 'awarded')}
            />
            <InvCard
              icon={HardHat}
              tone="navy"
              lang={lang}
              value={stageCount.under_construction || 0}
              label={labels.stage('under_construction')}
              note={t('rasd.dash.stageNotes.under_construction')}
              onClick={() => goToProjects('stage', 'under_construction')}
            />
            <InvCard
              icon={Compass}
              tone="red"
              lang={lang}
              value={earlyCount}
              label={t('rasd.dash.early')}
              note={t('rasd.dash.stageNotes.early')}
            />
          </InvCards>

          {/* ---------- At a glance ---------- */}
          <DashSection>{t('rasd.dash.sections.glance')}</DashSection>
          <div className="rd-grid">
            <Widget
              span={7}
              icon={Flag}
              title={t('rasd.dash.stageMix')}
              footNote={t('rasd.overview.breakdown.hint')}
            >
              <StackedBar
                rows={stageRows}
                lang={lang}
                onSelect={(v) => goToProjects('stage', v)}
                emptyLabel={t('rasd.overview.breakdown.empty')}
              />
            </Widget>

            <Widget
              span={5}
              icon={Target}
              title={t('rasd.dash.coverage')}
              action={
                <WidgetLink rtl={rtl} onClick={() => navigate('/rasd/projects?has_gap=1')}>
                  {t('rasd.dash.viewAll')}
                </WidgetLink>
              }
              footNote={t('rasd.dash.coverageNote', {
                with: num(withRoles),
                total: num(projects),
                avg: rolesPerProject,
              })}
            >
              <MeterStat
                value={coverageText}
                label={t('rasd.dash.coverageStat')}
                percent={coverage}
              />
            </Widget>

            <Widget
              span={4}
              icon={Tag}
              title={t('rasd.overview.breakdown.sector')}
              footNote={t('rasd.overview.breakdown.hint')}
            >
              <RasdBreakdown
                rows={summary.by_sector}
                labelFor={labels.sector}
                lang={lang}
                accent="var(--rasd-gold)"
                onSelect={(v) => goToProjects('sector', v)}
                emptyLabel={t('rasd.overview.breakdown.empty')}
              />
            </Widget>

            <Widget
              span={4}
              icon={MapPin}
              title={t('rasd.dash.topCities')}
              footNote={t('rasd.overview.breakdown.hint')}
            >
              <RasdBreakdown
                rows={topCities}
                labelFor={(value, apiLabel) => cityLabel(value || apiLabel, lang)}
                lang={lang}
                onSelect={(v) => goToProjects('city', v)}
                emptyLabel={t('rasd.overview.breakdown.empty')}
              />
            </Widget>

            <Widget
              span={4}
              icon={Wallet}
              title={t('rasd.dash.byValue')}
              footNote={
                valueRows.length
                  ? t('rasd.dash.valueUndisclosed', { count: num(undisclosed) })
                  : null
              }
            >
              {showValue && !valueBands ? (
                <div className="shimmer" style={{ height: 110, borderRadius: 10 }} />
              ) : (
                <RasdBreakdown
                  rows={valueRows}
                  labelFor={(_, label) => label}
                  lang={lang}
                  accent="var(--rasd-navy)"
                  onSelect={(v) => {
                    const band = VALUE_BANDS.find((b) => b.key === v);
                    navigate(band ? `/rasd/projects?${bandQuery(band)}` : '/rasd/projects');
                  }}
                  emptyLabel={t('rasd.dash.noValueData')}
                />
              )}
            </Widget>
          </div>

          {/* ---------- Where the market is ---------- */}
          <DashSection>{t('rasd.dash.sections.market')}</DashSection>
          <div className="rd-grid">
            <Widget
              span={8}
              icon={MapPin}
              title={t('rasd.overview.breakdown.city')}
              action={
                <ViewToggle
                  value={cityView}
                  onChange={changeCityView}
                  options={[
                    { value: 'list', label: t('rasd.overview.breakdown.viewList'), icon: List },
                    { value: 'map', label: t('rasd.overview.breakdown.viewMap'), icon: MapIcon },
                  ]}
                />
              }
              footNote={
                cityView === 'map'
                  ? t('rasd.overview.breakdown.mapHint')
                  : t('rasd.overview.breakdown.hint')
              }
            >
              {cityView === 'map' ? (
                <RasdCityMap
                  rows={summary.by_city}
                  lang={lang}
                  t={t}
                  onSelect={(v) => goToProjects('city', v)}
                  emptyLabel={t('rasd.overview.breakdown.empty')}
                />
              ) : (
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
              )}
            </Widget>

            {/* Freshness. A market-data product that can't say when it
                was last updated isn't one. */}
            <Widget
              span={4}
              icon={Clock}
              title={t('rasd.dash.freshness')}
              footNote={
                summary.last_updated_at
                  ? t('rasd.overview.lastUpdated', {
                      date: formatTimestamp(summary.last_updated_at, lang),
                    })
                  : null
              }
            >
              <div className="rd-stat font-display">
                <Ltr>{days == null ? '—' : num(days)}</Ltr>
              </div>
              <div className="rd-stat-l" style={{ marginBottom: 0 }}>
                {days === 0 ? t('rasd.dash.updatedToday') : t('rasd.dash.daysSinceUpdate')}
              </div>
              <div
                className="flex flex-wrap gap-x-4 gap-y-1 mt-4"
                style={{ fontSize: 12, color: 'var(--text-ink-soft)' }}
              >
                <span>
                  {t('rasd.dash.citiesCovered')}{' '}
                  <b style={{ color: 'var(--text-ink)' }}>
                    <Ltr>{num((summary.by_city || []).length)}</Ltr>
                  </b>
                </span>
                <span>
                  {t('rasd.dash.sectorsCovered')}{' '}
                  <b style={{ color: 'var(--text-ink)' }}>
                    <Ltr>{num((summary.by_sector || []).length)}</Ltr>
                  </b>
                </span>
              </div>
            </Widget>
          </div>
        </>
      )}
    </RasdDash>
  );
}

/* ---------- Segmented list / map switch ---------- */
function ViewToggle({ value, onChange, options }) {
  return (
    <div
      role="group"
      className="inline-flex flex-shrink-0"
      style={{
        padding: 3,
        borderRadius: 10,
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-soft)',
      }}
    >
      {options.map(({ value: v, label, icon: Icon }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(v)}
            className="inline-flex items-center gap-1.5"
            style={{
              padding: '5px 10px',
              borderRadius: 7,
              border: 'none',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: active ? 'var(--bg-surface)' : 'transparent',
              color: active ? 'var(--rasd-gold)' : 'var(--text-muted)',
              boxShadow: active ? '0 1px 3px rgba(15,17,41,0.08)' : 'none',
            }}
          >
            <Icon size={13} strokeWidth={2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
