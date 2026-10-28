import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Filter, Sparkles, DoorOpen, Building2 } from 'lucide-react';
import { rasd, readAccessDenial, isRasdValidationError } from '../../services/rasd';
import { useTranslation } from '../../i18n/LanguageContext';
import { rasdLabels } from '../../i18n/rasdLabel';
import { cityLabel } from '../../config/cityTranslations';
import useRasdSummary from '../../hooks/useRasdSummary';
import RasdAccessNotice from '../../components/rasd/RasdAccessNotice';
import IdentifierChip from '../../components/IdentifierChip';
import { ProjectQuickPreview } from '../../components/rasd/RasdQuickPreview';
import Ltr from '../../components/Ltr';
import {
  RasdDashStyles,
  RasdDash,
  InvCard,
  InvCards,
  DataTable,
  LinkRow,
  RowGo,
  STAGE_CHIP,
} from '../../components/rasd/RasdDashKit';
import { formatNumber } from '../../utils/money';
import { formatDate } from '../../utils/date';
import { regionLabel } from '../../config/cityTranslations';
import {
  PageHeader,
  Card,
  EmptyState,
  FilterBar,
  FilterSelect,
  FilterCheckbox,
  FilterText,
  Pagination,
} from '../../components/admin/AdminUI';
import {
  RASD_STAGES,
  RASD_SECTORS,
  RASD_CONFIDENCE,
  RASD_SORTS,
  RASD_PER_PAGE,
  hasValueData,
  showProgress,
  progressValue,
} from '../../config/rasdConstants';

const CONFIDENCE_CHIP = { high: 'green', medium: 'gold', needs_verification: 'muted' };

/* At most this many open-role chips per row; the rest fold into «+N»
   so one busy project can't stretch the whole table. */
const MAX_ROLE_CHIPS = 2;

/* ---------- one table row ----------
 *  Same nullable rules as the old card: `estimated_value` and
 *  `announced_at` render their own «not announced» copy, never a zero
 *  or a blank cell. Open roles are flat Arabic strings in the list
 *  shape, so they're rendered as sent. */
function ProjectRow({ project, t, lang, rtl, labels, onOpen }) {
  const roles = project.open_roles || [];
  const extra = roles.length - MAX_ROLE_CHIPS;
  const region =
    project.region && project.region !== project.city ? regionLabel(project.region, lang) : '';

  return (
    <LinkRow onOpen={onOpen}>
      <td style={{ minWidth: 220 }}>
        <div className="rd-cell-p">{project.name}</div>
        <div className="rd-cell-s flex items-center gap-1.5 flex-wrap">
          <span>{labels.sector(project.sector, project.sector_label)}</span>
          {project.is_internal && (
            <span className="rd-chip navy">{t('rasd.projects.internal')}</span>
          )}
          <IdentifierChip identifier={project.taid} />
        </div>
      </td>
      <td>
        <div>{project.city ? cityLabel(project.city, lang) : '—'}</div>
        {region && <div className="rd-cell-s">{region}</div>}
      </td>
      <td>
        {project.stage ? (
          <span className={`rd-chip ${STAGE_CHIP[project.stage] || 'muted'}`}>
            {labels.stage(project.stage, project.stage_label)}
          </span>
        ) : (
          <span className="rd-muted">—</span>
        )}
        {showProgress(project) && (
          <div className="rd-cell-s">
            {t('rasd.projects.progressDone', { percent: `${progressValue(project)}%` })}
          </div>
        )}
      </td>
      <td>
        {roles.length ? (
          <div className="rd-chips">
            {roles.slice(0, MAX_ROLE_CHIPS).map((r, i) => (
              <span key={`${r}-${i}`} className="rd-chip gold">
                {r}
              </span>
            ))}
            {extra > 0 && (
              <span className="rd-chip gold" title={roles.slice(MAX_ROLE_CHIPS).join('، ')}>
                <Ltr>+{extra}</Ltr>
              </span>
            )}
          </div>
        ) : (
          <span className="rd-muted">—</span>
        )}
      </td>
      <td>
        {project.confidence ? (
          <span className={`rd-chip ${CONFIDENCE_CHIP[project.confidence] || 'muted'}`}>
            {labels.confidence(project.confidence, project.confidence_label)}
          </span>
        ) : (
          <span className="rd-muted">—</span>
        )}
      </td>
      <td className="rd-num">
        {project.estimated_value != null ? (
          <>
            <Ltr>{formatNumber(project.estimated_value, lang, 0, { latin: true })}</Ltr>{' '}
            {t('common.currency')}
          </>
        ) : (
          <span className="rd-muted">{t('rasd.projects.valueUndisclosed')}</span>
        )}
      </td>
      <td className="rd-num">
        {project.announced_at ? (
          formatDate(project.announced_at, lang, { latin: true })
        ) : (
          <span className="rd-muted">{t('rasd.projects.notAnnounced')}</span>
        )}
      </td>
      <td className="rd-num">
        {project.updated_at ? formatDate(project.updated_at, lang, { latin: true }) : '—'}
      </td>
      <td>
        <RowGo rtl={rtl} />
      </td>
    </LinkRow>
  );
}

/* ============================================================
 *  RasdProjectsPage — /rasd/projects
 *  ----------------------------------------------------------------
 *  The filterable market feed. Three decisions worth knowing:
 *
 *  1. FILTERS LIVE IN THE URL. The overview's breakdown bars link
 *     straight in here with `?stage=awarded`, and a filtered feed is
 *     the thing someone wants to paste to a colleague. One source of
 *     truth also means the back button behaves.
 *
 *  2. 422 IS NOT AN EMPTY LIST. A value outside the documented enums
 *     is rejected, not silently ignored, and the two states get
 *     different screens: "nothing matched your filters" vs "that
 *     request was malformed" (which is reachable by hand-editing the
 *     query string). Telling them apart is the difference between a
 *     user narrowing their search and a user staring at a list that
 *     seems broken.
 *
 *  3. THE VALUE CONTROLS ARE CONDITIONAL. `estimated_value` is null
 *     on all 737 rows today, so a range filter and a value sort would
 *     both operate on an empty column. They appear only once the
 *     summary reports a non-zero total — see hasValueData.
 * ============================================================ */
export default function RasdProjectsPage() {
  const navigate = useNavigate();
  const { t, lang, dir } = useTranslation();
  const labels = useMemo(() => rasdLabels(t), [t]);
  const [params, setParams] = useSearchParams();

  const { summary } = useRasdSummary();
  const showValueControls = hasValueData(summary.totals);
  const totals = summary.totals || {};
  const num = (n) => formatNumber(n ?? 0, lang, 0, { latin: true });

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [denial, setDenial] = useState(null);
  const [invalid, setInvalid] = useState(false);
  // Row click opens the quick-preview drawer; «open full project»
  // inside it navigates.
  const [preview, setPreview] = useState(null);
  const closePreview = useCallback(() => setPreview(null), []);

  /* ---------- filters, read straight off the URL ---------- */
  const q = params.get('q') || '';
  const city = params.get('city') || '';
  const sector = params.get('sector') || '';
  const stage = params.get('stage') || '';
  const confidence = params.get('confidence') || '';
  const hasGap = params.get('has_gap') === '1';
  const minValue = params.get('min_value') || '';
  const maxValue = params.get('max_value') || '';
  const sort = params.get('sort') || '';
  const page = Number(params.get('page') || 1);

  const setFilter = useCallback(
    (key, value) => {
      const next = new URLSearchParams(params);
      if (value === '' || value == null || value === false) next.delete(key);
      else next.set(key, value === true ? '1' : String(value));
      // Any filter change invalidates the current page number — page 3
      // of the old result set is meaningless against the new one.
      if (key !== 'page') next.delete('page');
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const resetFilters = useCallback(() => setParams({}, { replace: true }), [setParams]);

  /* ---------- free-text search, debounced ----------
     Typed into local state and pushed to the URL once the user
     pauses, so a five-letter word is one request, not five — and the
     history doesn't fill with half-typed queries. */
  const [qInput, setQInput] = useState(q);
  useEffect(() => {
    // Keep the box in step when the URL changes from elsewhere
    // (a reset, the back button, a link from the overview).
    setQInput(q);
  }, [q]);

  useEffect(() => {
    if (qInput === q) return;
    const id = setTimeout(() => setFilter('q', qInput.trim()), 350);
    return () => clearTimeout(id);
  }, [qInput, q, setFilter]);

  /* ---------- fetch ---------- */
  const queryKey = params.toString();
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    rasd.projects
      .list({
        q,
        city,
        sector,
        stage,
        confidence,
        has_gap: hasGap,
        min_value: minValue,
        max_value: maxValue,
        sort,
        page,
        per_page: RASD_PER_PAGE,
      })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data);
        setMeta(res.meta);
        setError('');
        setDenial(null);
        setInvalid(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setRows([]);
        setMeta(null);
        const access = readAccessDenial(err);
        const malformed = isRasdValidationError(err);
        setDenial(access);
        setInvalid(malformed);
        // Both of those have their own screen; the generic error line
        // is only for everything else (network, 500).
        setError(access || malformed ? '' : err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // queryKey covers every filter — they all live in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  if (denial) {
    return <RasdAccessNotice message={denial} onBack={() => navigate('/rasd')} />;
  }

  /* ---------- filter options ---------- */
  const anyOption = (label) => ({ value: '', label });

  const stageOptions = [
    anyOption(t('rasd.projects.filters.allStages')),
    ...RASD_STAGES.map((s) => ({ value: s, label: labels.stage(s) })),
  ];
  const sectorOptions = [
    anyOption(t('rasd.projects.filters.allSectors')),
    ...RASD_SECTORS.map((s) => ({ value: s, label: labels.sector(s) })),
  ];
  const confidenceOptions = [
    anyOption(t('rasd.projects.filters.allConfidence')),
    ...RASD_CONFIDENCE.map((c) => ({ value: c, label: labels.confidence(c) })),
  ];
  /* Built from summary.by_city, never from a hardcoded list: the
     city list grows whenever a new region appears in the data, and
     by_city only offers cities that actually have projects. */
  const cityOptions = [
    anyOption(t('rasd.projects.filters.allCities')),
    ...(summary.by_city || []).map((c) => ({
      value: c.value,
      label: `${cityLabel(c.value, lang)} (${c.count})`,
    })),
  ];
  const sortOptions = [
    { value: '', label: t('rasd.projects.sort.recent') },
    ...RASD_SORTS.filter((s) => s !== 'recent').map((s) => ({
      value: s,
      label: t(`rasd.projects.sort.${s}`),
    })),
  ];

  const activeCount = [
    q,
    city,
    sector,
    stage,
    confidence,
    hasGap ? '1' : '',
    minValue,
    maxValue,
    sort,
  ].filter(Boolean).length;

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px] flex flex-col gap-5">
      <PageHeader
        eyebrow={t('rasd.brand')}
        title={t('rasd.projects.title')}
        subtitle={t('rasd.projects.subtitle')}
      />

      {/* Summary cards — the table below is unchanged. The first card
          counts the CURRENT filtered result (meta.total); the rest are
          whole-dataset totals from /rasd/summary. */}
      <RasdDash>
        <RasdDashStyles />
        <InvCards>
          <InvCard
            icon={Filter}
            tone="navy"
            lang={lang}
            value={loading || meta?.total == null ? '—' : meta.total}
            label={t('rasd.dash.matching')}
            note={
              totals.projects != null
                ? t('rasd.dash.matchingProjectsNote', { total: num(totals.projects) })
                : null
            }
          />
          <InvCard
            icon={Sparkles}
            tone="gold"
            goldValue
            lang={lang}
            value={totals.projects_with_open_roles ?? '—'}
            label={t('rasd.dash.projectsWithRoles')}
            note={hasGap ? t('rasd.dash.filterOn') : t('rasd.dash.filterOff')}
            onClick={() => setFilter('has_gap', !hasGap)}
          />
          <InvCard
            icon={DoorOpen}
            tone="gold"
            lang={lang}
            value={totals.open_roles ?? '—'}
            label={t('rasd.dash.openRoles')}
            note={t('rasd.dash.openRolesNote')}
          />
          <InvCard
            icon={Building2}
            tone="green"
            lang={lang}
            value={totals.companies ?? '—'}
            label={t('rasd.overview.totals.companies')}
            note={t('rasd.dash.companiesNote')}
            onClick={() => navigate('/rasd/companies')}
          />
        </InvCards>
      </RasdDash>

      <FilterBar
        title={t('rasd.projects.filters.title')}
        activeCount={activeCount}
        onReset={resetFilters}
        resetLabel={t('admin.common.reset')}
        searchValue={qInput}
        onSearchChange={setQInput}
        searchPlaceholder={t('rasd.projects.filters.searchPlaceholder')}
      >
        {/* The filter that sells the product: 50 of 737 projects have
            a way in, and this is how you see only those. */}
        <FilterCheckbox
          label={t('rasd.projects.filters.hasGap')}
          checked={hasGap}
          onChange={(v) => setFilter('has_gap', v)}
        />
        <FilterSelect
          label={t('rasd.projects.filters.stage')}
          value={stage}
          onChange={(v) => setFilter('stage', v)}
          options={stageOptions}
        />
        <FilterSelect
          label={t('rasd.projects.filters.sector')}
          value={sector}
          onChange={(v) => setFilter('sector', v)}
          options={sectorOptions}
        />
        <FilterSelect
          label={t('rasd.projects.filters.city')}
          value={city}
          onChange={(v) => setFilter('city', v)}
          options={cityOptions}
          minWidth={180}
        />
        <FilterSelect
          label={t('rasd.projects.filters.confidence')}
          value={confidence}
          onChange={(v) => setFilter('confidence', v)}
          options={confidenceOptions}
        />
        {/* Hidden while every estimated_value in the dataset is null —
            a range over an empty column can only return nothing, and a
            sort by it can only be a no-op. */}
        {showValueControls && (
          <>
            <FilterText
              label={t('rasd.projects.filters.minValue')}
              value={minValue}
              onChange={(v) => setFilter('min_value', v)}
              type="number"
            />
            <FilterText
              label={t('rasd.projects.filters.maxValue')}
              value={maxValue}
              onChange={(v) => setFilter('max_value', v)}
              type="number"
            />
            <FilterSelect
              label={t('rasd.projects.filters.sort')}
              value={sort}
              onChange={(v) => setFilter('sort', v)}
              options={sortOptions}
            />
          </>
        )}
      </FilterBar>

      {error && (
        <Card>
          <p className="m-0" style={{ fontSize: 13.5, color: 'var(--accent-danger)' }}>
            {error}
          </p>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="shimmer" style={{ height: 48, borderRadius: 10 }} />
          ))}
        </div>
      ) : invalid ? (
        /* 422 — the request itself was malformed, which is a different
           thing from "no projects matched" and must not look like it. */
        <Card>
          <div className="flex flex-col items-center text-center py-10 px-6 gap-3">
            <span
              className="flex items-center justify-center"
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'rgba(184,134,42,0.12)',
                color: '#b8862a',
              }}
            >
              <AlertTriangle size={22} strokeWidth={1.8} />
            </span>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-ink)' }}>
              {t('rasd.projects.invalid.title')}
            </div>
            <p
              className="m-0 max-w-sm"
              style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-muted)' }}
            >
              {t('rasd.projects.invalid.description')}
            </p>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto' }}
              onClick={resetFilters}
            >
              {t('rasd.projects.invalid.reset')}
            </button>
          </div>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            title={t('rasd.projects.empty.title')}
            description={t('rasd.projects.empty.description')}
            action={
              activeCount > 0 ? (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: 'auto' }}
                  onClick={resetFilters}
                >
                  {t('rasd.projects.empty.reset')}
                </button>
              ) : null
            }
          />
        </Card>
      ) : (
        <RasdDash>
          <DataTable
            head={[
              t('rasd.table.project'),
              t('rasd.table.location'),
              t('rasd.table.stage'),
              t('rasd.table.openRoles'),
              t('rasd.table.confidence'),
              t('rasd.table.value'),
              t('rasd.table.announced'),
              t('rasd.table.updated'),
              '',
            ]}
          >
            {rows.map((project) => (
              <ProjectRow
                key={project.taid}
                project={project}
                t={t}
                lang={lang}
                rtl={dir === 'rtl'}
                labels={labels}
                onOpen={() => setPreview(project)}
              />
            ))}
          </DataTable>
          {/* The open-role chips are inferred; the old card said so on
              every opportunity, the table says it once. */}
          {rows.some((p) => (p.open_roles || []).length > 0) && (
            <p className="m-0 mt-2" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {t('rasd.projects.inferredCaution')}
            </p>
          )}
        </RasdDash>
      )}

      {meta && meta.last_page > 1 && (
        <Card padded={false}>
          <Pagination meta={meta} onPage={(p) => setFilter('page', p)} t={t} />
        </Card>
      )}

      {preview && (
        <ProjectQuickPreview taid={preview.taid} seed={preview} onClose={closePreview} />
      )}
    </div>
  );
}
