import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Filter, Layers, DoorOpen } from 'lucide-react';
import Ltr from '../../components/Ltr';
import { rasd, readAccessDenial, isRasdValidationError } from '../../services/rasd';
import { useTranslation } from '../../i18n/LanguageContext';
import { rasdLabels } from '../../i18n/rasdLabel';
import { cityLabel } from '../../config/cityTranslations';
import useRasdSummary from '../../hooks/useRasdSummary';
import RasdAccessNotice from '../../components/rasd/RasdAccessNotice';
import { CompanyQuickPreview, ProjectQuickPreview } from '../../components/rasd/RasdQuickPreview';
import {
  RasdDashStyles,
  RasdDash,
  InvCard,
  InvCards,
  DataTable,
  LinkRow,
  RowGo,
} from '../../components/rasd/RasdDashKit';
import { formatNumber } from '../../utils/money';
import {
  PageHeader,
  Card,
  EmptyState,
  FilterBar,
  FilterSelect,
  Pagination,
} from '../../components/admin/AdminUI';
import {
  RASD_PARTY_ROLES,
  RASD_COMPANY_CATEGORIES,
  RASD_PER_PAGE,
} from '../../config/rasdConstants';

/* ============================================================
 *  RasdCompaniesPage — /rasd/companies
 *  ----------------------------------------------------------------
 *  The company directory, sorted by name. The `role` filter answers
 *  the question people actually arrive with: "who are the main
 *  contractors in Jeddah?"
 *
 *  Two things this page must not pretend:
 *
 *  - `city` is nullable and often null — companies picked up from a
 *    supplier column frequently have none. Rows say so rather than
 *    leaving a gap that reads as a rendering bug.
 *
 *  - Company names are NOT unique. Name matching folds hamza forms,
 *    ة/ه, ى/ي and strips «شركة»/«مؤسسة», so it catches spelling
 *    variants — but not «شركة البناء المتقدم» vs «… للمقاولات»,
 *    which are two rows today. Fuzzy matching is post-launch. So
 *    nothing here keys off the name: rows link by id and the count
 *    is never presented as "this company's total footprint".
 * ============================================================ */
export default function RasdCompaniesPage() {
  const navigate = useNavigate();
  const { t, lang, dir } = useTranslation();
  const labels = useMemo(() => rasdLabels(t), [t]);
  const [params, setParams] = useSearchParams();
  const { summary } = useRasdSummary();
  const totals = summary.totals || {};
  const num = (n) => formatNumber(n ?? 0, lang, 0, { latin: true });

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [denial, setDenial] = useState(null);
  const [invalid, setInvalid] = useState(false);
  // Quick preview: a company row opens its drawer; a project listed in
  // that drawer swaps it for the project's own preview.
  const [preview, setPreview] = useState(null);
  const closePreview = useCallback(() => setPreview(null), []);

  const q = params.get('q') || '';
  const city = params.get('city') || '';
  const role = params.get('role') || '';
  const category = params.get('category') || '';
  const page = Number(params.get('page') || 1);

  const setFilter = useCallback(
    (key, value) => {
      const next = new URLSearchParams(params);
      if (value === '' || value == null) next.delete(key);
      else next.set(key, String(value));
      if (key !== 'page') next.delete('page');
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const resetFilters = useCallback(() => setParams({}, { replace: true }), [setParams]);

  /* Debounced search — see the same pattern on the projects feed. */
  const [qInput, setQInput] = useState(q);
  useEffect(() => setQInput(q), [q]);
  useEffect(() => {
    if (qInput === q) return;
    const id = setTimeout(() => setFilter('q', qInput.trim()), 350);
    return () => clearTimeout(id);
  }, [qInput, q, setFilter]);

  const queryKey = params.toString();
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    rasd.companies
      .list({ q, city, role, category, page, per_page: RASD_PER_PAGE })
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
        setError(access || malformed ? '' : err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  if (denial) {
    return <RasdAccessNotice message={denial} onBack={() => navigate('/rasd')} />;
  }

  const roleOptions = [
    { value: '', label: t('rasd.companies.filters.allRoles') },
    ...RASD_PARTY_ROLES.map((r) => ({ value: r, label: labels.role(r) })),
  ];
  const categoryOptions = [
    { value: '', label: t('rasd.companies.filters.allCategories') },
    ...RASD_COMPANY_CATEGORIES.map((c) => ({ value: c, label: labels.category(c) })),
  ];
  const cityOptions = [
    { value: '', label: t('rasd.companies.filters.allCities') },
    ...(summary.by_city || []).map((c) => ({
      value: c.value,
      label: cityLabel(c.value, lang),
    })),
  ];

  const activeCount = [q, city, role, category].filter(Boolean).length;

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px] flex flex-col gap-5">
      <PageHeader
        eyebrow={t('rasd.brand')}
        title={t('rasd.companies.title')}
        subtitle={t('rasd.companies.subtitle')}
      />

      {/* Summary cards — the directory below is unchanged. The first
          card counts the CURRENT filtered result (meta.total); the rest
          are whole-dataset totals from /rasd/summary. */}
      <RasdDash>
        <RasdDashStyles />
        <InvCards cols={3}>
          <InvCard
            icon={Filter}
            tone="navy"
            lang={lang}
            value={loading || meta?.total == null ? '—' : meta.total}
            label={t('rasd.dash.matching')}
            note={
              totals.companies != null
                ? t('rasd.dash.matchingCompaniesNote', { total: num(totals.companies) })
                : null
            }
          />
          <InvCard
            icon={Layers}
            tone="green"
            lang={lang}
            value={totals.projects ?? '—'}
            label={t('rasd.overview.totals.projects')}
            note={t('rasd.dash.projectsNote', { count: num(totals.projects_with_open_roles) })}
            onClick={() => navigate('/rasd/projects')}
          />
          <InvCard
            icon={DoorOpen}
            tone="gold"
            goldValue
            lang={lang}
            value={totals.open_roles ?? '—'}
            label={t('rasd.dash.openRoles')}
            note={t('rasd.dash.openRolesNote')}
            onClick={() => navigate('/rasd/projects?has_gap=1')}
          />
        </InvCards>
      </RasdDash>

      <FilterBar
        title={t('rasd.companies.filters.title')}
        activeCount={activeCount}
        onReset={resetFilters}
        resetLabel={t('admin.common.reset')}
        searchValue={qInput}
        onSearchChange={setQInput}
        searchPlaceholder={t('rasd.companies.filters.searchPlaceholder')}
      >
        <FilterSelect
          label={t('rasd.companies.filters.role')}
          value={role}
          onChange={(v) => setFilter('role', v)}
          options={roleOptions}
          minWidth={180}
        />
        <FilterSelect
          label={t('rasd.companies.filters.category')}
          value={category}
          onChange={(v) => setFilter('category', v)}
          options={categoryOptions}
          minWidth={200}
        />
        <FilterSelect
          label={t('rasd.companies.filters.city')}
          value={city}
          onChange={(v) => setFilter('city', v)}
          options={cityOptions}
          minWidth={180}
        />
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
            title={t('rasd.companies.empty.title')}
            description={t('rasd.companies.empty.description')}
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
              t('rasd.table.company'),
              t('rasd.table.category'),
              t('rasd.table.city'),
              t('rasd.table.projects'),
              t('rasd.table.roles'),
              t('rasd.table.phone'),
              t('rasd.table.confidence'),
              '',
            ]}
          >
            {rows.map((company) => (
              <CompanyRow
                key={company.id}
                company={company}
                t={t}
                lang={lang}
                rtl={dir === 'rtl'}
                labels={labels}
                onOpen={() => setPreview({ kind: 'company', item: company })}
              />
            ))}
          </DataTable>
        </RasdDash>
      )}

      {meta && meta.last_page > 1 && (
        <Card padded={false}>
          <Pagination meta={meta} onPage={(p) => setFilter('page', p)} t={t} />
        </Card>
      )}

      {preview?.kind === 'company' && (
        <CompanyQuickPreview
          id={preview.item.id}
          seed={preview.item}
          onClose={closePreview}
          onOpenProject={(p) => setPreview({ kind: 'project', item: p })}
        />
      )}
      {preview?.kind === 'project' && (
        <ProjectQuickPreview taid={preview.item.taid} seed={preview.item} onClose={closePreview} />
      )}
    </div>
  );
}

const CONFIDENCE_CHIP = { high: 'green', medium: 'gold', needs_verification: 'muted' };
const MAX_ROLE_CHIPS = 2;

function CompanyRow({ company, t, lang, rtl, labels, onOpen }) {
  const roles = company.roles || [];
  const extra = roles.length - MAX_ROLE_CHIPS;
  const count = company.projects_count ?? 0;

  return (
    <LinkRow onOpen={onOpen}>
      <td style={{ minWidth: 220 }}>
        <div className="rd-cell-p">{company.name}</div>
        {company.name_en && (
          <div className="rd-cell-s" dir="ltr" style={{ textAlign: 'start' }}>
            {company.name_en}
          </div>
        )}
      </td>
      <td>
        {/* `unclassified` is mostly audit firms awaiting a later pass —
            shown muted, the row stays. */}
        {company.category ? (
          <span className={`rd-chip ${company.category === 'unclassified' ? 'muted' : 'navy'}`}>
            {labels.category(company.category, company.category_label)}
          </span>
        ) : (
          <span className="rd-muted">—</span>
        )}
      </td>
      <td>
        {company.city ? (
          cityLabel(company.city, lang)
        ) : (
          <span className="rd-muted">{t('rasd.companies.noCity')}</span>
        )}
      </td>
      <td className="rd-num">
        <b style={{ color: count > 0 ? 'var(--rasd-gold)' : 'var(--text-muted)' }}>
          <Ltr>{formatNumber(count, lang, 0, { latin: true })}</Ltr>
        </b>
      </td>
      <td>
        {/* Roles come back as Arabic labels only — no enum value
            attached — so they're rendered as sent. */}
        {roles.length ? (
          <div className="rd-chips">
            {roles.slice(0, MAX_ROLE_CHIPS).map((r, i) => (
              <span key={`${r}-${i}`} className="rd-chip muted">
                {r}
              </span>
            ))}
            {extra > 0 && (
              <span className="rd-chip muted" title={roles.slice(MAX_ROLE_CHIPS).join('، ')}>
                <Ltr>+{extra}</Ltr>
              </span>
            )}
          </div>
        ) : (
          <span className="rd-muted">—</span>
        )}
      </td>
      <td className="rd-num">
        {/* The company switchboard — commercial information the company
            publishes itself, not a person's mobile, so it isn't masked.
            Mobiles are normalized to +9665…, landlines are stored as
            typed: expect both shapes. */}
        {company.phone ? <Ltr>{company.phone}</Ltr> : <span className="rd-muted">—</span>}
      </td>
      <td>
        {company.confidence ? (
          <span className={`rd-chip ${CONFIDENCE_CHIP[company.confidence] || 'muted'}`}>
            {labels.confidence(company.confidence, company.confidence_label)}
          </span>
        ) : (
          <span className="rd-muted">—</span>
        )}
      </td>
      <td>
        <RowGo rtl={rtl} />
      </td>
    </LinkRow>
  );
}
