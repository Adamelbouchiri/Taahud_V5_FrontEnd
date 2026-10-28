import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layers, Activity, Briefcase, UsersRound, CalendarClock, Building2 } from 'lucide-react';
import Ltr from '../../components/Ltr';
import { Card, EmptyState } from '../../components/admin/AdminUI';
import RasdAccessNotice from '../../components/rasd/RasdAccessNotice';
import ContactsSection from '../../components/rasd/ContactsSection';
import { ProjectQuickPreview } from '../../components/rasd/RasdQuickPreview';
import {
  RasdDashStyles,
  RasdDash,
  Crumbs,
  Band,
  OvwGroup,
  InvCards,
  InvCard,
  DataTable,
  LinkRow,
  RowGo,
  STAGE_CHIP,
  CONFIDENCE_CHIP,
} from '../../components/rasd/RasdDashKit';
import { rasd, readAccessDenial } from '../../services/rasd';
import { useTranslation } from '../../i18n/LanguageContext';
import { rasdLabels } from '../../i18n/rasdLabel';
import { cityLabel, regionLabel } from '../../config/cityTranslations';
import { formatDate } from '../../utils/date';
import { RASD_ACTIVE_STAGES } from '../../config/rasdConstants';

/* ============================================================
 *  RasdCompanyDetailPage — /rasd/companies/:id
 *  ----------------------------------------------------------------
 *  Laid out as the design's company profile: breadcrumb and page
 *  head, four quick-fact cards, the company details, then key people
 *  beside the company's projects.
 *
 *  A company can appear TWICE in `projects` with the same project
 *  under different roles — owner on one line, developer on the next.
 *  That is valid data, not a duplicate: rows are keyed on the
 *  (project, role) pair and nothing de-duplicates them.
 *
 *  A project row opens the quick-preview drawer, as in the design;
 *  «open full project» inside it navigates.
 * ============================================================ */
const TABS = ['all', 'active', 'awarded', 'completed'];

const inTab = (tab, p) => {
  if (tab === 'active') return RASD_ACTIVE_STAGES.includes(p.stage);
  if (tab === 'awarded') return p.stage === 'awarded';
  if (tab === 'completed') return p.stage === 'completed';
  return true;
};

export default function RasdCompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang, dir } = useTranslation();
  const labels = useMemo(() => rasdLabels(t), [t]);

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [denial, setDenial] = useState(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [preview, setPreview] = useState(null);
  const closePreview = useCallback(() => setPreview(null), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTab('all');
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

  const back = () => navigate('/rasd/companies');
  const c = company;
  const projects = c?.projects || [];
  const date = (d) => (d ? formatDate(d, lang, { latin: true }) : null);
  const notSet = <span className="rd-muted">{t('common.notSpecified')}</span>;

  const unique = new Set(projects.map((p) => p.taid)).size;
  const active = new Set(
    projects.filter((p) => RASD_ACTIVE_STAGES.includes(p.stage)).map((p) => p.taid)
  ).size;
  const roles = [...new Set(projects.map((p) => labels.role(p.role, p.role_label)).filter(Boolean))];
  const contacts = c?.contacts || [];
  const reachable = contacts.filter((x) => x.has_phone || x.has_email).length;
  const place = c
    ? [
        c.city ? cityLabel(c.city, lang) : null,
        c.region && c.region !== c.city ? regionLabel(c.region, lang) : null,
      ]
        .filter(Boolean)
        .join('، ')
    : '';
  const shown = projects.filter((p) => inTab(tab, p));
  const ext = (url) => (
    <a href={url} target="_blank" rel="noopener noreferrer" dir="ltr">
      {url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
    </a>
  );

  return (
    <RasdDash className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1180px] flex flex-col gap-4">
      <RasdDashStyles />
      <Crumbs
        items={[
          { label: t('rasd.nav.companies'), onClick: back },
          { label: c?.name || '…' },
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
            title={t('rasd.company.notFound.title')}
            description={t('rasd.company.notFound.description')}
            action={
              <button type="button" className="btn-secondary" style={{ width: 'auto' }} onClick={back}>
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
      ) : c ? (
        <>
          {/* ---------- page head ---------- */}
          <div className="rd-phead">
            <div>
              <div className="rd-eyebrow">
                {[c.category && labels.category(c.category, c.category_label), place]
                  .filter(Boolean)
                  .join(' · ') || t('rasd.brand')}
              </div>
              <h1 className="font-display">{c.name}</h1>
              {(c.name_en || c.updated_at) && (
                <p className="rd-sub m-0">
                  {c.name_en && <span dir="ltr">{c.name_en}</span>}
                  {c.name_en && c.updated_at && ' · '}
                  {c.updated_at && t('rasd.project.updatedAt', { date: date(c.updated_at) })}
                </p>
              )}
            </div>
            <div className="rd-phead-acts">
              {c.confidence && (
                <span className={`rd-chip ${CONFIDENCE_CHIP[c.confidence] || 'muted'}`}>
                  {labels.confidence(c.confidence, c.confidence_label)}
                </span>
              )}
            </div>
          </div>

          {/* ---------- quick facts ---------- */}
          <InvCards>
            <InvCard
              icon={Activity}
              tone="gold"
              goldValue
              value={active}
              label={t('rasd.detail.company.active')}
              note={t('rasd.detail.company.activeNote', { total: unique })}
              lang={lang}
            />
            <InvCard
              icon={Briefcase}
              tone="navy"
              value={roles.length}
              label={t('rasd.detail.company.roles')}
              note={roles.slice(0, 2).join('، ') || t('rasd.detail.company.rolesNone')}
              lang={lang}
            />
            <InvCard
              icon={UsersRound}
              tone="green"
              value={contacts.length}
              label={t('rasd.contacts.title')}
              note={t('rasd.detail.company.contactsNote', { count: reachable })}
              lang={lang}
            />
            <InvCard
              icon={CalendarClock}
              tone="navy"
              value={date(c.updated_at) || '—'}
              label={t('rasd.detail.company.lastActivity')}
              note={t('rasd.detail.company.lastActivityNote')}
              lang={lang}
            />
          </InvCards>

          {/* ---------- company details ---------- */}
          <Band icon={Building2} title={t('rasd.detail.company.details')}>
            <div className="rd-ovw">
              <OvwGroup
                title={t('rasd.detail.groups.identity')}
                rows={[
                  [
                    t('rasd.table.category'),
                    c.category ? labels.category(c.category, c.category_label) : notSet,
                  ],
                  [t('rasd.detail.location'), place || notSet],
                  c.size && [t('rasd.detail.company.size'), labels.size(c.size, c.size_label)],
                  c.cr_number && [t('rasd.detail.company.cr'), <Ltr key="cr">{c.cr_number}</Ltr>],
                ]}
              />
              <OvwGroup
                title={t('rasd.detail.groups.contact')}
                rows={[
                  [t('rasd.company.facts.phone'), c.phone ? <Ltr key="ph">{c.phone}</Ltr> : notSet],
                  c.email && [
                    t('rasd.detail.company.email'),
                    <a key="em" href={`mailto:${c.email}`} dir="ltr">
                      {c.email}
                    </a>,
                  ],
                  c.website && [t('rasd.detail.company.website'), ext(c.website)],
                  c.linkedin_url && [t('rasd.contacts.linkedin'), ext(c.linkedin_url)],
                ]}
              />
            </div>
          </Band>

          {/* ---------- two columns ---------- */}
          <div className="rd-cols">
            <div className="rd-col">
              <Band>
                <ContactsSection
                  contacts={c.contacts}
                  subtitle={t('rasd.company.contacts.subtitle')}
                  emptyBody={t('rasd.company.contacts.empty')}
                  t={t}
                  labels={labels}
                />
              </Band>
            </div>
            <div className="rd-col">
              <Band
                icon={Layers}
                title={t('rasd.company.projects.title')}
                count={projects.length}
                action={
                  projects.length > 0 && (
                    <div className="rd-tabs">
                      {TABS.map((k) => (
                        <button
                          key={k}
                          type="button"
                          className={`rd-tab${tab === k ? ' on' : ''}`}
                          onClick={() => setTab(k)}
                        >
                          {t(`rasd.detail.company.tabs.${k}`)}
                        </button>
                      ))}
                    </div>
                  )
                }
              >
                {projects.length === 0 ? (
                  <EmptyState title={t('rasd.company.projects.empty')} />
                ) : shown.length === 0 ? (
                  <EmptyState title={t('rasd.detail.company.tabEmpty')} />
                ) : (
                  <>
                    <DataTable
                      flat
                      head={[
                        t('rasd.table.project'),
                        t('rasd.table.city'),
                        t('rasd.detail.company.role'),
                        t('rasd.table.stage'),
                        '',
                      ]}
                    >
                      {shown.map((p, i) => (
                        // Keyed on project AND role: the same project can
                        // legitimately appear twice under two roles.
                        <LinkRow key={`${p.taid}-${p.role}-${i}`} onOpen={() => setPreview(p)}>
                          <td>
                            <div className="rd-cell-p">{p.name}</div>
                          </td>
                          <td>{p.city ? cityLabel(p.city, lang) : '—'}</td>
                          <td>
                            <span className="rd-chip muted">{labels.role(p.role, p.role_label)}</span>
                          </td>
                          <td>
                            {p.stage ? (
                              <span className={`rd-chip ${STAGE_CHIP[p.stage] || 'muted'}`}>
                                {labels.stage(p.stage, p.stage_label)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <RowGo rtl={dir === 'rtl'} />
                          </td>
                        </LinkRow>
                      ))}
                    </DataTable>
                    <p className="rd-foot">{t('rasd.company.projects.subtitle')}</p>
                  </>
                )}
              </Band>
            </div>
          </div>
        </>
      ) : null}

      {preview && (
        <ProjectQuickPreview taid={preview.taid} seed={preview} onClose={closePreview} />
      )}
    </RasdDash>
  );
}
