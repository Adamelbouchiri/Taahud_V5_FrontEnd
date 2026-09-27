import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  Map as MapIcon,
  Phone,
  Layers,
  ChevronLeft,
} from 'lucide-react';
import Ltr from '../../components/Ltr';
import { Card, PageHeader, Badge, EmptyState } from '../../components/admin/AdminUI';
import RasdAccessNotice from '../../components/rasd/RasdAccessNotice';
import ContactsSection from '../../components/rasd/ContactsSection';
import { rasd, readAccessDenial } from '../../services/rasd';
import { useTranslation } from '../../i18n/LanguageContext';
import { rasdLabels } from '../../i18n/rasdLabel';
import { cityLabel, regionLabel } from '../../config/cityTranslations';
import {
  RASD_STAGE_TONE,
  RASD_CONFIDENCE_TONE,
} from '../../config/rasdConstants';

/* ============================================================
 *  RasdCompanyDetailPage — /rasd/companies/:id
 *  ----------------------------------------------------------------
 *  One company and every project it touches, each with the role it
 *  holds there.
 *
 *  A company can appear TWICE in `projects` with the same project id
 *  under different roles — owner on one line, developer on the next.
 *  That is valid data, not a duplicate: the list is keyed on the
 *  (project, role) pair and nothing de-duplicates it.
 *
 *  This is where contacts live (v1.2) — a project's `contacts` is
 *  always empty and points here. Companies have no `is_internal`
 *  flag — every row in this directory was collected from the market.
 * ============================================================ */
export default function RasdCompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const labels = useMemo(() => rasdLabels(t), [t]);

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [denial, setDenial] = useState(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    rasd.companies
      .get(id)
      .then((data) => {
        if (cancelled) return;
        setCompany(data);
        setDenial(null);
        setMissing(false);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setCompany(null);
        const access = readAccessDenial(err);
        setDenial(access);
        setMissing(err?.status === 404);
        setError(access || err?.status === 404 ? '' : err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (denial) {
    return <RasdAccessNotice message={denial} onBack={() => navigate('/rasd/companies')} />;
  }

  const projects = company?.projects || [];

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[900px] flex flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate('/rasd/companies')}
        className="inline-flex items-center gap-2 self-start"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: 13,
          fontFamily: 'inherit',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <ArrowRight
          size={15}
          strokeWidth={2}
          style={{
            transform: lang === 'ar' || lang === 'ur' ? 'none' : 'rotate(180deg)',
          }}
        />
        {t('rasd.company.back')}
      </button>

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="shimmer" style={{ height: 120, borderRadius: 14 }} />
          <div className="shimmer" style={{ height: 200, borderRadius: 14 }} />
        </div>
      ) : missing ? (
        <Card>
          <EmptyState
            title={t('rasd.company.notFound.title')}
            description={t('rasd.company.notFound.description')}
            action={
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto' }}
                onClick={() => navigate('/rasd/companies')}
              >
                {t('rasd.company.notFound.cta')}
              </button>
            }
          />
        </Card>
      ) : error ? (
        <Card>
          <p className="m-0" style={{ fontSize: 13.5, color: 'var(--accent-danger)' }}>
            {error}
          </p>
        </Card>
      ) : company ? (
        <>
          <PageHeader
            eyebrow={t('rasd.brand')}
            title={company.name}
            subtitle={company.notes || undefined}
          />

          <Card>
            <div className="flex items-center gap-2 flex-wrap mb-4">
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
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <Fact
                icon={MapPin}
                label={t('rasd.company.facts.city')}
                value={
                  company.city ? cityLabel(company.city, lang) : t('rasd.companies.noCity')
                }
              />
              {company.region && (
                <Fact
                  icon={MapIcon}
                  label={t('rasd.project.facts.region')}
                  value={regionLabel(company.region, lang)}
                />
              )}
              <Fact
                icon={Phone}
                label={t('rasd.company.facts.phone')}
                value={
                  company.phone ? (
                    <Ltr>{company.phone}</Ltr>
                  ) : (
                    t('common.notSpecified')
                  )
                }
              />
            </div>
          </Card>

          {/* ---------- Every project this company touches ---------- */}
          <Card>
            <div className="flex items-center gap-2.5 mb-3">
              <span
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'rgba(44,47,124,0.08)',
                  color: 'var(--accent-primary)',
                }}
              >
                <Layers size={14} strokeWidth={1.9} />
              </span>
              <div>
                <div
                  className="font-semibold"
                  style={{ fontSize: 14, color: 'var(--text-ink)' }}
                >
                  {t('rasd.company.projects.title')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                  {t('rasd.company.projects.subtitle')}
                </div>
              </div>
            </div>

            {projects.length === 0 ? (
              <EmptyState title={t('rasd.company.projects.empty')} />
            ) : (
              <ul className="m-0 p-0 flex flex-col gap-2">
                {projects.map((p, i) => (
                  // Keyed on project AND role: the same project can
                  // legitimately appear twice under two roles.
                  <li key={`${p.id}-${p.role}-${i}`} className="list-none">
                    <button
                      type="button"
                      onClick={() => navigate(`/rasd/projects/${p.id}`)}
                      className="w-full text-start flex items-center gap-3"
                      style={{
                        background: 'var(--bg-canvas)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: 11,
                        padding: '11px 14px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate"
                          style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-ink)' }}
                        >
                          {p.name}
                        </div>
                        <div
                          className="flex items-center gap-2 flex-wrap"
                          style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}
                        >
                          {p.city && <span>{cityLabel(p.city, lang)}</span>}
                          <Badge tone={RASD_STAGE_TONE[p.stage] || 'default'}>
                            {labels.stage(p.stage, p.stage_label)}
                          </Badge>
                          <Badge tone="primary">{labels.role(p.role, p.role_label)}</Badge>
                        </div>
                      </div>
                      <ChevronLeft
                        size={16}
                        strokeWidth={1.8}
                        style={{
                          color: 'var(--text-muted)',
                          flexShrink: 0,
                          transform:
                            lang === 'ar' || lang === 'ur' ? 'none' : 'rotate(180deg)',
                        }}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <ContactsSection
              contacts={company.contacts}
              subtitle={t('rasd.company.contacts.subtitle')}
              emptyBody={t('rasd.company.contacts.empty')}
              t={t}
              labels={labels}
            />
          </Card>
        </>
      ) : null}
    </div>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <Icon
        size={15}
        strokeWidth={1.8}
        style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 3 }}
      />
      <div className="min-w-0">
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
          {label}
        </div>
        <div
          style={{ fontSize: 13.5, color: 'var(--text-ink)', fontWeight: 600, marginTop: 2 }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
