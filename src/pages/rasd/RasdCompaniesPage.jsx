import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, MapPin, Phone, ChevronLeft, AlertTriangle } from 'lucide-react';
import Ltr from '../../components/Ltr';
import { rasd, readAccessDenial, isRasdValidationError } from '../../services/rasd';
import { useTranslation } from '../../i18n/LanguageContext';
import { rasdLabels } from '../../i18n/rasdLabel';
import { cityLabel } from '../../config/cityTranslations';
import useRasdSummary from '../../hooks/useRasdSummary';
import RasdAccessNotice from '../../components/rasd/RasdAccessNotice';
import {
  PageHeader,
  Card,
  Badge,
  EmptyState,
  FilterBar,
  FilterSelect,
  Pagination,
} from '../../components/admin/AdminUI';
import {
  RASD_PARTY_ROLES,
  RASD_COMPANY_CATEGORIES,
  RASD_CONFIDENCE_TONE,
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
  const { t, lang } = useTranslation();
  const labels = useMemo(() => rasdLabels(t), [t]);
  const [params, setParams] = useSearchParams();
  const { summary } = useRasdSummary();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [denial, setDenial] = useState(null);
  const [invalid, setInvalid] = useState(false);

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
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="shimmer" style={{ height: 82, borderRadius: 14 }} />
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
        <div className="flex flex-col gap-3">
          {rows.map((company) => (
            <CompanyRow
              key={company.id}
              company={company}
              t={t}
              lang={lang}
              labels={labels}
              onOpen={() => navigate(`/rasd/companies/${company.id}`)}
            />
          ))}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <Card padded={false}>
          <Pagination meta={meta} onPage={(p) => setFilter('page', p)} t={t} />
        </Card>
      )}
    </div>
  );
}

function CompanyRow({ company, t, lang, labels, onOpen }) {
  return (
    <Card padded={false}>
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-start flex items-center gap-4 px-5 py-4"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: 'rgba(44,47,124,0.07)',
            color: 'var(--accent-primary)',
          }}
        >
          <Building2 size={18} strokeWidth={1.7} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-semibold truncate"
              style={{ fontSize: 14.5, color: 'var(--text-ink)' }}
            >
              {company.name}
            </span>
            {/* `unclassified` is mostly audit firms awaiting a later
                pass — shown muted, the row stays. */}
            {company.category && (
              <Badge tone={company.category === 'unclassified' ? 'muted' : 'primary'}>
                {labels.category(company.category, company.category_label)}
              </Badge>
            )}
            {company.confidence && (
              <Badge tone={RASD_CONFIDENCE_TONE[company.confidence] || 'default'}>
                {labels.confidence(company.confidence, company.confidence_label)}
              </Badge>
            )}
          </div>

          <div
            className="flex items-center gap-x-4 gap-y-1 flex-wrap"
            style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}
          >
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} strokeWidth={1.8} />
              {company.city ? cityLabel(company.city, lang) : t('rasd.companies.noCity')}
            </span>
            {/* The company switchboard — commercial information the
                company publishes itself, not a person's mobile, so it
                isn't masked. Mobiles are normalized to +9665…,
                landlines are stored as typed: expect both shapes. */}
            {company.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone size={13} strokeWidth={1.8} />
                <Ltr>{company.phone}</Ltr>
              </span>
            )}
            <span>
              {t('rasd.companies.projectsCount', {
                count: company.projects_count ?? 0,
              })}
            </span>
          </div>

          {/* Roles come back as Arabic labels only — no enum value
              attached — so they're rendered as sent. */}
          {(company.roles || []).length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap" style={{ marginTop: 6 }}>
              {company.roles.map((r, i) => (
                <Badge key={`${r}-${i}`} tone="muted">
                  {r}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <ChevronLeft
          size={18}
          strokeWidth={1.8}
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            transform: lang === 'ar' || lang === 'ur' ? 'none' : 'rotate(180deg)',
          }}
        />
      </button>
    </Card>
  );
}
