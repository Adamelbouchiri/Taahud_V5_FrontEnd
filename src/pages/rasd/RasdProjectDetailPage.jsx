import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flag, FileText, Clock, LayoutList, Check } from 'lucide-react';
import Ltr from '../../components/Ltr';
import IdentifierChip from '../../components/IdentifierChip';
import { Card, EmptyState } from '../../components/admin/AdminUI';
import RasdAccessNotice from '../../components/rasd/RasdAccessNotice';
import ContactsSection from '../../components/rasd/ContactsSection';
import { PartiesSection, OpenRolesSection } from '../../components/rasd/RoleSections';
import RasdProgressBar from '../../components/rasd/RasdProgressBar';
import {
  RasdDashStyles,
  RasdDash,
  Crumbs,
  Band,
  OvwGroup,
  STAGE_CHIP,
  CONFIDENCE_CHIP,
} from '../../components/rasd/RasdDashKit';
import { rasd, readAccessDenial } from '../../services/rasd';
import { useTranslation } from '../../i18n/LanguageContext';
import { rasdLabels } from '../../i18n/rasdLabel';
import { cityLabel, regionLabel } from '../../config/cityTranslations';
import { formatDate } from '../../utils/date';
import { formatNumber } from '../../utils/money';
import {
  RASD_LATE_STAGE_MONTHS,
  RASD_LIFECYCLE,
  RASD_KEY_PARTIES,
  partyFor,
  scheduleElapsed,
  monthsUntil,
  showContactSection,
  showProgress,
  progressValue,
  progressPhase,
} from '../../config/rasdConstants';

/* ============================================================
 *  RasdProjectDetailPage — /rasd/projects/:taid
 *  ----------------------------------------------------------------
 *  Laid out as the design's project profile: breadcrumb and page
 *  head, the four key stakeholders, completion and schedule meters,
 *  the lifecycle stepper, a grouped overview, then two columns —
 *  open roles and contacts beside the parties and the timeline.
 *
 *  Everything shown comes from the profile payload. The design's
 *  permit, fit score, change log and related projects have no
 *  backing data and are left out rather than faked.
 *
 *  A 404 arrives with Laravel's default English message. It isn't
 *  shown: an Arabic-first product does not hand a user "No query
 *  results for model [Project] 9999". Our own empty state instead.
 * ============================================================ */
export default function RasdProjectDetailPage() {
  const { taid } = useParams();
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
      .get(taid)
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
  }, [taid]);

  if (denial) {
    return <RasdAccessNotice message={denial} onBack={() => navigate('/rasd/projects')} />;
  }

  const back = () => navigate('/rasd/projects');

  return (
    <RasdDash className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1180px] flex flex-col gap-4">
      <RasdDashStyles />
      <Crumbs
        items={[
          { label: t('rasd.nav.projects'), onClick: back },
          { label: project?.name || '…' },
        ]}
      />

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="shimmer" style={{ height: 90, borderRadius: 14 }} />
          <div className="shimmer" style={{ height: 80, borderRadius: 14 }} />
          <div className="shimmer" style={{ height: 220, borderRadius: 14 }} />
        </div>
      ) : missing ? (
        <Card>
          <EmptyState
            title={t('rasd.project.notFound.title')}
            description={t('rasd.project.notFound.description')}
            action={
              <button type="button" className="btn-secondary" style={{ width: 'auto' }} onClick={back}>
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
        <ProjectProfile project={project} t={t} lang={lang} labels={labels} navigate={navigate} />
      ) : null}
    </RasdDash>
  );
}

function ProjectProfile({ project: p, t, lang, labels, navigate }) {
  const date = (d) => (d ? formatDate(d, lang, { latin: true }) : null);
  const notSet = <span className="rd-muted">{t('common.notSpecified')}</span>;
  const place = [
    p.city ? cityLabel(p.city, lang) : null,
    p.region && p.region !== p.city ? regionLabel(p.region, lang) : null,
  ]
    .filter(Boolean)
    .join('، ');
  const value =
    p.estimated_value != null ? (
      <>
        <Ltr>{formatNumber(p.estimated_value, lang, 0, { latin: true })}</Ltr> {t('common.currency')}
      </>
    ) : null;
  const stageChip = p.stage ? (
    <span className={`rd-chip ${STAGE_CHIP[p.stage] || 'muted'}`}>
      {labels.stage(p.stage, p.stage_label)}
    </span>
  ) : null;
  const confidenceChip = p.confidence ? (
    <span className={`rd-chip ${CONFIDENCE_CHIP[p.confidence] || 'muted'}`}>
      {labels.confidence(p.confidence, p.confidence_label)}
    </span>
  ) : null;

  const companyLink = (party) =>
    party ? (
      <button
        type="button"
        className="lnk"
        onClick={() => navigate(`/rasd/companies/${party.company.id}`)}
      >
        {party.company.name}
      </button>
    ) : (
      <span className="rd-muted">{t('rasd.detail.notAppointed')}</span>
    );

  const keyParties = RASD_KEY_PARTIES.map((x) => ({ ...x, party: partyFor(p.parties, x.roles) }));

  return (
    <>
      {/* ---------- page head ---------- */}
      <div className="rd-phead">
        <div>
          <div className="rd-eyebrow">{labels.sector(p.sector, p.sector_label) || t('rasd.brand')}</div>
          <h1 className="font-display">{p.name}</h1>
          <p className="rd-sub m-0">
            {[place, value, p.updated_at && t('rasd.project.updatedAt', { date: date(p.updated_at) })]
              .filter(Boolean)
              .map((part, i) => (
                <React.Fragment key={i}>
                  {i > 0 && ' · '}
                  {part}
                </React.Fragment>
              ))}
          </p>
        </div>
        <div className="rd-phead-acts">
          {stageChip}
          {confidenceChip}
          {p.is_internal && <span className="rd-chip navy">{t('rasd.projects.internal')}</span>}
          {/* v1.5 — permanent and safe to quote, so it gets a copy button. */}
          <IdentifierChip identifier={p.taid} label={t('rasd.project.taid')} />
        </div>
      </div>

      {/* ---------- key stakeholders ---------- */}
      <Band>
        <div className="rd-strip">
          {keyParties.map(({ key, party }) => (
            <div key={key}>
              <div className="rd-strip-k">{t(`rasd.detail.parties.${key}`)}</div>
              {party ? (
                <button
                  type="button"
                  className="rd-strip-v"
                  onClick={() => navigate(`/rasd/companies/${party.company.id}`)}
                >
                  {party.company.name}
                </button>
              ) : (
                <div className="rd-strip-none">{t('rasd.detail.notAppointed')}</div>
              )}
            </div>
          ))}
        </div>
      </Band>

      {/* ---------- meters ---------- */}
      <div className="rd-pm-grid">
        <CompletionMeter p={p} t={t} lang={lang} />
        <ScheduleMeter p={p} t={t} lang={lang} date={date} />
      </div>

      {/* ---------- lifecycle ---------- */}
      <Band icon={Flag} title={t('rasd.detail.lifecycle')}>
        <Lifecycle p={p} t={t} labels={labels} />
      </Band>

      {/* ---------- overview ---------- */}
      <Band icon={LayoutList} title={t('rasd.detail.overview')}>
        <div className="rd-ovw">
          <OvwGroup
            title={t('rasd.detail.groups.identity')}
            rows={[
              [t('rasd.detail.location'), place || notSet],
              [t('rasd.table.stage'), stageChip || notSet],
              [t('rasd.projects.filters.sector'), labels.sector(p.sector, p.sector_label) || notSet],
              [
                t('rasd.project.facts.value'),
                value || <span className="rd-muted">{t('rasd.projects.valueUndisclosed')}</span>,
              ],
            ]}
          />
          <OvwGroup
            title={t('rasd.detail.groups.parties')}
            rows={keyParties.map(({ key, party }) => [
              t(`rasd.detail.parties.${key}`),
              companyLink(party),
            ])}
          />
          <OvwGroup
            title={t('rasd.detail.groups.schedule')}
            rows={[
              [t('rasd.project.timing.startAt'), date(p.expected_start_at) || notSet],
              [t('rasd.project.timing.endAt'), date(p.expected_end_at) || notSet],
              [
                t('rasd.detail.completion'),
                showProgress(p) ? <Ltr>{progressValue(p)}%</Ltr> : '—',
              ],
            ]}
          />
          <OvwGroup
            title={t('rasd.detail.groups.record')}
            rows={[
              [t('rasd.project.taid'), <Ltr key="id">{p.taid}</Ltr>],
              [
                t('rasd.project.facts.announcedAt'),
                date(p.announced_at) || (
                  <span className="rd-muted">{t('rasd.projects.notAnnounced')}</span>
                ),
              ],
              [t('rasd.project.facts.collectedAt'), date(p.collected_at) || notSet],
              [t('rasd.table.updated'), date(p.updated_at) || '—'],
              [t('rasd.table.confidence'), confidenceChip || '—'],
            ]}
          />
        </div>
      </Band>

      {p.description && (
        <Band icon={FileText} title={t('rasd.detail.scope')}>
          <p className="m-0" style={{ fontSize: 13.5, lineHeight: 1.8, color: 'var(--text-ink-soft)' }}>
            {p.description}
          </p>
        </Band>
      )}

      {/* ---------- two columns ---------- */}
      <div className="rd-cols">
        <div className="rd-col">
          {/* Where there's a way in — what the product is for. */}
          <Band>
            <OpenRolesSection
              openRoles={p.open_roles}
              notes={p.notes}
              confidence={p.confidence}
              confidenceLabel={labels.confidence(p.confidence, p.confidence_label)}
              t={t}
              roleLabel={labels.role}
            />
          </Band>
          {/* Always empty on a project — people belong to companies, so
              the empty state points at the parties. Absent entirely for
              internal projects. */}
          {showContactSection(p) && (
            <Band>
              <ContactsSection
                contacts={p.contacts}
                subtitle={t('rasd.project.contacts.subtitle')}
                emptyBody={t('rasd.project.contacts.onCompanies')}
                t={t}
                labels={labels}
              />
            </Band>
          )}
        </div>
        <div className="rd-col">
          <Band>
            <PartiesSection parties={p.parties} t={t} lang={lang} roleLabel={labels.role} />
          </Band>
          <Band icon={Clock} title={t('rasd.detail.timeline.title')}>
            <Timeline p={p} t={t} labels={labels} date={date} />
          </Band>
        </div>
      </div>
    </>
  );
}

/* ---------- Completion ----------
 *  progress_percent is null unless known, and only meaningful under
 *  construction (see showProgress). A completed project reads 100%;
 *  anything before construction says so instead of drawing a 0. */
function CompletionMeter({ p, t, lang }) {
  let pct = null;
  let note;
  if (showProgress(p)) {
    pct = progressValue(p);
    note = t(`rasd.project.timing.phase.${progressPhase(pct)}`);
  } else if (p.stage === 'completed') {
    pct = 100;
    note = t('rasd.stage.completed');
  } else if (p.stage === 'under_construction') {
    note = t('rasd.detail.completionUnknown');
  } else {
    note = t('rasd.detail.notStarted');
  }
  return (
    <div className="rd-band">
      <div className="rd-pm-head">
        <span className="rd-pm-k">{t('rasd.detail.completion')}</span>
        <span className="rd-pm-v font-display">
          <Ltr>{pct != null ? `${formatNumber(pct, lang, 0, { latin: true })}%` : '—'}</Ltr>
        </span>
      </div>
      <RasdProgressBar
        percent={pct ?? 0}
        height={8}
        accent="var(--rasd-gold)"
        label={t('rasd.detail.completion')}
      />
      <div className="rd-pm-note">{note}</div>
    </div>
  );
}

/* ---------- Schedule ----------
 *  expected_end_at is the strongest timing signal in the data: a
 *  project eighteen months out is still buying, two months out isn't. */
function ScheduleMeter({ p, t, lang, date }) {
  const elapsed = scheduleElapsed(p);
  const months = monthsUntil(p.expected_end_at);
  let chip = null;
  if (months != null) {
    if (months < 0) chip = <span className="rd-chip muted">{t('rasd.project.timing.passed')}</span>;
    else if (months === 0)
      chip = <span className="rd-chip red">{t('rasd.project.timing.underMonth')}</span>;
    else
      chip = (
        <span className={`rd-chip ${months >= RASD_LATE_STAGE_MONTHS ? 'green' : 'gold'}`}>
          {t('rasd.project.timing.monthsLeft', {
            months: formatNumber(months, lang, 0, { latin: true }),
          })}
        </span>
      );
  }
  return (
    <div className="rd-band">
      <div className="rd-pm-head">
        <span className="rd-pm-k">{t('rasd.project.timing.endAt')}</span>
        <span className="rd-pm-v font-display" style={{ fontSize: 17 }}>
          {date(p.expected_end_at) || '—'}
        </span>
      </div>
      <RasdProgressBar
        percent={elapsed ?? 0}
        height={8}
        accent="var(--rasd-gold)"
        label={t('rasd.detail.scheduleElapsed')}
      />
      <div className="rd-pm-note">
        {chip}
        <span>
          {elapsed != null
            ? t('rasd.detail.scheduleNote', {
                percent: `${elapsed}%`,
                start: date(p.expected_start_at),
              })
            : t('rasd.detail.noSchedule')}
        </span>
      </div>
    </div>
  );
}

function Lifecycle({ p, t, labels }) {
  const index = p.stage === 'detected' ? 0 : RASD_LIFECYCLE.indexOf(p.stage);
  return (
    <>
      <div className="rd-steps">
        {RASD_LIFECYCLE.map((step, i) => {
          const cls = index < 0 ? '' : i < index ? 'done' : i === index ? 'cur' : '';
          return (
            <div key={step} className={`rd-step ${cls}`}>
              <div className="rd-step-c">
                <span className="rd-step-dot">
                  {cls === 'done' ? <Check size={11} strokeWidth={3} /> : <Ltr>{i + 1}</Ltr>}
                </span>
                <span className="rd-step-l">{labels.stage(step)}</span>
              </div>
              {i < RASD_LIFECYCLE.length - 1 && <span className="rd-step-line" />}
            </div>
          );
        })}
      </div>
      {index < 0 && p.stage && (
        <p className="m-0 mt-2" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
          {t('rasd.detail.lifecycleOff', { stage: labels.stage(p.stage, p.stage_label) })}
        </p>
      )}
    </>
  );
}

/* ---------- Timeline ----------
 *  Dated events in order, undated schedule points after them, and the
 *  record's last update always at the tail. */
function Timeline({ p, t, labels, date }) {
  const items = [
    { title: t('rasd.project.timing.startAt'), at: p.expected_start_at, always: true },
    { title: t('rasd.project.timing.endAt'), at: p.expected_end_at, always: true },
    { title: t('rasd.project.facts.announcedAt'), at: p.announced_at },
    { title: t('rasd.detail.timeline.added'), at: p.collected_at },
  ].filter((x) => x.at || x.always);
  const ms = (x) => new Date(x.at).getTime();
  const ordered = [
    ...items.filter((x) => x.at).sort((a, b) => ms(a) - ms(b)),
    ...items.filter((x) => !x.at),
  ];
  if (p.stage) {
    ordered.push({
      title: t('rasd.detail.timeline.current', { stage: labels.stage(p.stage, p.stage_label) }),
      note: t('rasd.detail.timeline.currentNote'),
    });
  }
  if (p.updated_at) ordered.push({ title: t('rasd.detail.timeline.updated'), at: p.updated_at });

  return (
    <div className="rd-tl">
      {ordered.map((x, i) => (
        <div key={i} className="rd-tl-i">
          <div className="rd-tl-t">{x.title}</div>
          <div className="rd-tl-d">
            {x.at ? date(x.at) : `— ${x.note || t('common.notSpecified')}`}
          </div>
        </div>
      ))}
    </div>
  );
}
