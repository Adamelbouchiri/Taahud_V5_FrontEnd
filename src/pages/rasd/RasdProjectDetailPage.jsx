import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  Map as MapIcon,
  CalendarDays,
  CalendarClock,
  Layers,
  ClipboardList,
} from 'lucide-react';
import Ltr from '../../components/Ltr';
import { Card, PageHeader, Badge, EmptyState } from '../../components/admin/AdminUI';
import RasdAccessNotice from '../../components/rasd/RasdAccessNotice';
import ContactsSection from '../../components/rasd/ContactsSection';
import { PartiesSection, OpenRolesSection } from '../../components/rasd/RoleSections';
import { rasd, readAccessDenial } from '../../services/rasd';
import { useTranslation } from '../../i18n/LanguageContext';
import { rasdLabels } from '../../i18n/rasdLabel';
import { cityLabel, regionLabel } from '../../config/cityTranslations';
import { formatDate } from '../../utils/date';
import { formatNumber } from '../../utils/money';
import {
  RASD_STAGE_TONE,
  RASD_CONFIDENCE_TONE,
  RASD_LATE_STAGE_MONTHS,
  monthsUntil,
  showContactSection,
} from '../../config/rasdConstants';

/* ============================================================
 *  RasdProjectDetailPage — /rasd/projects/:id
 *  ----------------------------------------------------------------
 *  The profile: everything on the list row, plus the description,
 *  the collection date, the expected schedule (v1.2), and the two
 *  role arrays.
 *
 *  Layout puts OPEN ROLES first and PARTIES second. That's not the
 *  order the payload uses — it's the order the user came for. The
 *  open roles are where they can get in; the parties are context.
 *
 *  A 404 arrives with Laravel's default English message. It isn't
 *  shown: an Arabic-first product does not hand a user "No query
 *  results for model [Project] 9999". Our own empty state instead.
 * ============================================================ */
export default function RasdProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const labels = useMemo(() => rasdLabels(t), [t]);

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [denial, setDenial] = useState(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    rasd.projects
      .get(id)
      .then((data) => {
        if (cancelled) return;
        setProject(data);
        setDenial(null);
        setMissing(false);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setProject(null);
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
    return <RasdAccessNotice message={denial} onBack={() => navigate('/rasd/projects')} />;
  }

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[900px] flex flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate('/rasd/projects')}
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
        {t('rasd.project.back')}
      </button>

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="shimmer" style={{ height: 120, borderRadius: 14 }} />
          <div className="shimmer" style={{ height: 220, borderRadius: 14 }} />
          <div className="shimmer" style={{ height: 160, borderRadius: 14 }} />
        </div>
      ) : missing ? (
        <Card>
          <EmptyState
            title={t('rasd.project.notFound.title')}
            description={t('rasd.project.notFound.description')}
            action={
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto' }}
                onClick={() => navigate('/rasd/projects')}
              >
                {t('rasd.project.notFound.cta')}
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
      ) : project ? (
        <>
          <PageHeader
            eyebrow={t('rasd.brand')}
            title={project.name}
            subtitle={project.description || undefined}
          />

          {/* ---------- Facts ---------- */}
          <Card>
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <Badge tone={RASD_STAGE_TONE[project.stage] || 'default'}>
                {labels.stage(project.stage, project.stage_label)}
              </Badge>
              <Badge tone="default">
                {labels.sector(project.sector, project.sector_label)}
              </Badge>
              {project.confidence && (
                <Badge tone={RASD_CONFIDENCE_TONE[project.confidence] || 'default'}>
                  {labels.confidence(project.confidence, project.confidence_label)}
                </Badge>
              )}
              {project.is_internal && (
                <Badge tone="primary">{t('rasd.projects.internal')}</Badge>
              )}
            </div>

            <TimingStrip
              startAt={project.expected_start_at}
              endAt={project.expected_end_at}
              t={t}
              lang={lang}
            />

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <Fact
                icon={MapPin}
                label={t('rasd.project.facts.city')}
                value={project.city ? cityLabel(project.city, lang) : t('common.notSpecified')}
              />
              {project.region && (
                <Fact
                  icon={MapIcon}
                  label={t('rasd.project.facts.region')}
                  value={regionLabel(project.region, lang)}
                />
              )}
              <Fact
                icon={Layers}
                label={t('rasd.project.facts.value')}
                value={
                  project.estimated_value != null ? (
                    <>
                      <Ltr>{formatNumber(project.estimated_value, lang, 0)}</Ltr>{' '}
                      {t('common.currency')}
                    </>
                  ) : (
                    t('rasd.projects.valueUndisclosed')
                  )
                }
              />
              <Fact
                icon={CalendarDays}
                label={t('rasd.project.facts.announcedAt')}
                value={
                  project.announced_at
                    ? formatDate(project.announced_at, lang)
                    : t('rasd.projects.notAnnounced')
                }
              />
              <Fact
                icon={ClipboardList}
                label={t('rasd.project.facts.collectedAt')}
                value={
                  project.collected_at
                    ? formatDate(project.collected_at, lang)
                    : t('common.notSpecified')
                }
              />
            </div>
          </Card>

          {/* ---------- Where there's a way in ----------
              First on the page: it's what the product is for. */}
          <Card>
            <OpenRolesSection
              openRoles={project.open_roles}
              notes={project.notes}
              confidence={project.confidence}
              confidenceLabel={labels.confidence(
                project.confidence,
                project.confidence_label
              )}
              t={t}
              roleLabel={labels.role}
            />
          </Card>

          {/* ---------- Who is already in ---------- */}
          <Card>
            <PartiesSection
              parties={project.parties}
              t={t}
              lang={lang}
              roleLabel={labels.role}
            />
          </Card>

          {/* ---------- Contacts ----------
              Always empty on a project — people belong to companies,
              so the empty state sends the user to the parties above.
              Absent entirely for internal projects: a project
              mirrored in from our own arena has no market contacts. */}
          {showContactSection(project) && (
            <Card>
              <ContactsSection
                contacts={project.contacts}
                subtitle={t('rasd.project.contacts.subtitle')}
                emptyBody={t('rasd.project.contacts.onCompanies')}
                t={t}
                labels={labels}
              />
            </Card>
          )}

          {project.updated_at && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              {t('rasd.project.updatedAt', {
                date: formatDate(project.updated_at, lang),
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

/* ---------- Expected schedule ----------
 *  `expected_end_at` (v1.2) is the strongest timing signal in the
 *  data — a project eighteen months from done is still buying, one
 *  two months out isn't — so it gets a strip of its own above the
 *  facts rather than a cell among them. Present on every project;
 *  `expected_start_at` is missing on about twenty. */
function TimingStrip({ startAt, endAt, t, lang }) {
  if (!endAt && !startAt) return null;
  const months = monthsUntil(endAt);

  let tone = 'default';
  let remaining = null;
  if (months != null) {
    if (months < 0) {
      tone = 'muted';
      remaining = t('rasd.project.timing.passed');
    } else if (months === 0) {
      tone = 'warning';
      remaining = t('rasd.project.timing.underMonth');
    } else {
      tone = months >= RASD_LATE_STAGE_MONTHS ? 'success' : 'warning';
      remaining = t('rasd.project.timing.monthsLeft', {
        months: formatNumber(months, lang, 0),
      });
    }
  }

  return (
    <div
      className="flex items-center gap-3 flex-wrap mb-4"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-soft)',
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <CalendarClock
        size={18}
        strokeWidth={1.8}
        style={{ color: 'var(--accent-primary)', flexShrink: 0 }}
      />
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
          {t('rasd.project.timing.endAt')}
        </div>
        <div
          className="flex items-center gap-2 flex-wrap"
          style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-ink)', marginTop: 2 }}
        >
          {endAt ? formatDate(endAt, lang) : t('common.notSpecified')}
          {remaining && <Badge tone={tone}>{remaining}</Badge>}
        </div>
      </div>
      <div className="min-w-0">
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
          {t('rasd.project.timing.startAt')}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-ink)', marginTop: 2 }}>
          {startAt ? formatDate(startAt, lang) : t('common.notSpecified')}
        </div>
      </div>
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
          style={{
            fontSize: 13.5,
            color: 'var(--text-ink)',
            fontWeight: 600,
            marginTop: 2,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
