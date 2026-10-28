import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Eye, DoorOpen, Layers } from 'lucide-react';
import Ltr from '../Ltr';
import { rasd } from '../../services/rasd';
import { useTranslation } from '../../i18n/LanguageContext';
import { rasdLabels } from '../../i18n/rasdLabel';
import { cityLabel, regionLabel } from '../../config/cityTranslations';
import { formatDate } from '../../utils/date';
import { formatNumber } from '../../utils/money';
import {
  RASD_ACTIVE_STAGES,
  RASD_KEY_PARTIES,
  partyFor,
  showProgress,
  progressValue,
} from '../../config/rasdConstants';
import { STAGE_CHIP, CONFIDENCE_CHIP, initials } from './RasdDashKit';

/* ============================================================
 *  RasdQuickPreview — the design's «معاينة سريعة» side drawer.
 *  ----------------------------------------------------------------
 *  Row click → quick preview → full profile. A table row opens this
 *  drawer instead of navigating; «open full …» drills in.
 *
 *  The drawer paints immediately from the row it was opened from
 *  (`seed`), then fetches the profile for what the list shape lacks —
 *  a project's parties, a company's projects and contacts. Rows that
 *  depend on the profile shimmer until it lands.
 *
 *  Rendered through a portal so no transformed ancestor can trap the
 *  fixed positioning; it opens from the inline-end edge (left in RTL).
 * ============================================================ */

function useProfile(kind, id) {
  const [state, setState] = useState({ data: null, loading: true, error: false });
  useEffect(() => {
    if (id == null) return undefined;
    let cancelled = false;
    setState({ data: null, loading: true, error: false });
    rasd[kind]
      .get(id)
      .then((data) => !cancelled && setState({ data, loading: false, error: false }))
      .catch(() => !cancelled && setState({ data: null, loading: false, error: true }));
    return () => {
      cancelled = true;
    };
  }, [kind, id]);
  return state;
}

function Drawer({ onClose, mark, title, footer, children }) {
  const { t, dir } = useTranslation();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="rd" dir={dir}>
      <div className="rd-drawer-ov" onClick={onClose} />
      <aside className="rd-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="rd-drawer-head">
          <div className="flex gap-3 min-w-0 flex-1">
            <span className="rd-drawer-mark">{mark}</span>
            <div className="min-w-0" style={{ paddingTop: 1 }}>
              <div className="rd-drawer-sub">{t('rasd.qp.title')}</div>
              <h3 className="rd-drawer-title">{title}</h3>
            </div>
          </div>
          <button
            type="button"
            className="rd-drawer-x"
            onClick={onClose}
            aria-label={t('rasd.qp.close')}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>
        <div className="rd-drawer-body">{children}</div>
        {footer && <div className="rd-drawer-foot">{footer}</div>}
      </aside>
    </div>,
    document.body
  );
}

function Row({ k, v }) {
  return (
    <div className="rd-ovw-row">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

function Pending() {
  return <span className="shimmer inline-block" style={{ width: 90, height: 12, borderRadius: 6 }} />;
}

const num = (n, lang) => <Ltr>{formatNumber(n, lang, 0, { latin: true })}</Ltr>;

/* ---------- Project ---------- */
export function ProjectQuickPreview({ taid, seed, onClose }) {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const labels = useMemo(() => rasdLabels(t), [t]);
  const { data, loading } = useProfile('projects', taid);
  const p = data || seed || {};

  const place = [p.city && cityLabel(p.city, lang), p.region && p.region !== p.city && regionLabel(p.region, lang)]
    .filter(Boolean)
    .join('، ');

  // The list shape sends open roles as flat Arabic strings; the profile
  // sends objects. Either way it's a label to draw.
  const openRoles = (data?.open_roles || seed?.open_roles || []).map((r) =>
    typeof r === 'string' ? r : labels.role(r.role, r.role_label)
  );

  const partyRow = ({ key, roles }) => {
    let v;
    if (!data) v = loading ? <Pending /> : '—';
    else {
      const party = partyFor(data.parties, roles);
      v = party ? party.company.name : <span className="rd-muted">{t('rasd.detail.notAppointed')}</span>;
    }
    return <Row key={key} k={t(`rasd.detail.parties.${key}`)} v={v} />;
  };

  return (
    <Drawer
      onClose={onClose}
      mark={initials(p.name)}
      title={p.name || '—'}
      footer={
        <button
          type="button"
          className="rd-btn"
          onClick={() => {
            onClose();
            navigate(`/rasd/projects/${taid}`);
          }}
        >
          <Eye size={14} strokeWidth={2} /> {t('rasd.qp.openProject')}
        </button>
      }
    >
      <div className="rd-chips" style={{ marginBottom: 12 }}>
        {p.stage && (
          <span className={`rd-chip ${STAGE_CHIP[p.stage] || 'muted'}`}>
            {labels.stage(p.stage, p.stage_label)}
          </span>
        )}
        {p.sector && <span className="rd-chip muted">{labels.sector(p.sector, p.sector_label)}</span>}
        {p.confidence && (
          <span className={`rd-chip ${CONFIDENCE_CHIP[p.confidence] || 'muted'}`}>
            {labels.confidence(p.confidence, p.confidence_label)}
          </span>
        )}
        {p.is_internal && <span className="rd-chip navy">{t('rasd.projects.internal')}</span>}
      </div>

      <div>
        <Row k={t('rasd.detail.location')} v={place || '—'} />
        <Row
          k={t('rasd.project.facts.value')}
          v={
            p.estimated_value != null ? (
              <>
                {num(p.estimated_value, lang)} {t('common.currency')}
              </>
            ) : (
              <span className="rd-muted">{t('rasd.projects.valueUndisclosed')}</span>
            )
          }
        />
        {RASD_KEY_PARTIES.filter((x) => x.key !== 'developer').map(partyRow)}
        {showProgress(p) && (
          <Row k={t('rasd.detail.completion')} v={<Ltr>{progressValue(p)}%</Ltr>} />
        )}
        {p.expected_end_at && (
          <Row
            k={t('rasd.project.timing.endAt')}
            v={formatDate(p.expected_end_at, lang, { latin: true })}
          />
        )}
        <Row
          k={t('rasd.table.updated')}
          v={p.updated_at ? formatDate(p.updated_at, lang, { latin: true }) : '—'}
        />
      </div>

      <div className="rd-qp-block">
        <div className="rd-qp-bt">
          <DoorOpen size={12} strokeWidth={2} /> {t('rasd.project.openRoles.title')}
        </div>
        {openRoles.length ? (
          <div className="rd-chips">
            {openRoles.map((r, i) => (
              <span key={`${r}-${i}`} className="rd-chip gold">
                {r}
              </span>
            ))}
          </div>
        ) : (
          <p className="m-0" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {t('rasd.qp.noOpenRoles')}
          </p>
        )}
        {openRoles.length > 0 && (
          <p className="m-0 mt-2" style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {t('rasd.projects.inferredCaution')}
          </p>
        )}
      </div>

      <div className="rd-qp-meta">
        <span>
          {t('rasd.project.taid')}: <Ltr>{taid}</Ltr>
        </span>
        <span>{t('rasd.brand')}</span>
      </div>
    </Drawer>
  );
}

/* ---------- Company ---------- */
export function CompanyQuickPreview({ id, seed, onClose, onOpenProject }) {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const labels = useMemo(() => rasdLabels(t), [t]);
  const { data, loading } = useProfile('companies', id);
  const c = data || seed || {};

  const projects = data?.projects || [];
  const active = projects.filter((p) => RASD_ACTIVE_STAGES.includes(p.stage)).length;
  const total = data ? projects.length : seed?.projects_count;
  const contacts = data?.contacts || [];
  const fromProfile = (v) => (data ? v : loading ? <Pending /> : '—');

  return (
    <Drawer
      onClose={onClose}
      mark={initials(c.name)}
      title={c.name || '—'}
      footer={
        <button
          type="button"
          className="rd-btn"
          onClick={() => {
            onClose();
            navigate(`/rasd/companies/${id}`);
          }}
        >
          <Eye size={14} strokeWidth={2} /> {t('rasd.qp.openCompany')}
        </button>
      }
    >
      <div className="rd-chips" style={{ marginBottom: 12 }}>
        {c.category && (
          <span className={`rd-chip ${c.category === 'unclassified' ? 'muted' : 'navy'}`}>
            {labels.category(c.category, c.category_label)}
          </span>
        )}
        {c.confidence && (
          <span className={`rd-chip ${CONFIDENCE_CHIP[c.confidence] || 'muted'}`}>
            {labels.confidence(c.confidence, c.confidence_label)}
          </span>
        )}
      </div>

      <div>
        <Row
          k={t('rasd.detail.location')}
          v={c.city ? cityLabel(c.city, lang) : <span className="rd-muted">{t('rasd.companies.noCity')}</span>}
        />
        <Row k={t('rasd.table.phone')} v={c.phone ? <Ltr>{c.phone}</Ltr> : '—'} />
        <Row k={t('rasd.table.projects')} v={total != null ? num(total, lang) : '—'} />
        <Row k={t('rasd.detail.company.active')} v={fromProfile(num(active, lang))} />
        <Row k={t('rasd.contacts.title')} v={fromProfile(num(contacts.length, lang))} />
        <Row
          k={t('rasd.table.updated')}
          v={fromProfile(c.updated_at ? formatDate(c.updated_at, lang, { latin: true }) : '—')}
        />
      </div>

      <div className="rd-qp-block">
        <div className="rd-qp-bt">
          <Layers size={12} strokeWidth={2} /> {t('rasd.qp.linkedProjects')}
          {data && (
            <span>
              (<Ltr>{projects.length}</Ltr>)
            </span>
          )}
        </div>
        {!data ? (
          loading ? (
            <Pending />
          ) : (
            <p className="m-0" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t('rasd.qp.loadError')}
            </p>
          )
        ) : projects.length ? (
          projects.slice(0, 5).map((p, i) => (
            <button
              key={`${p.taid}-${p.role}-${i}`}
              type="button"
              className="rd-qp-item"
              onClick={() => {
                if (onOpenProject) onOpenProject(p);
                else {
                  onClose();
                  navigate(`/rasd/projects/${p.taid}`);
                }
              }}
            >
              <span className="rd-qp-in">{p.name}</span>
              <span className="rd-chip muted" style={{ flex: 'none' }}>
                {labels.role(p.role, p.role_label)}
              </span>
            </button>
          ))
        ) : (
          <p className="m-0" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {t('rasd.company.projects.empty')}
          </p>
        )}
      </div>

      <div className="rd-qp-meta">
        <span>
          {t('rasd.qp.recordId')}: <Ltr>{id}</Ltr>
        </span>
        <span>{t('rasd.brand')}</span>
      </div>
    </Drawer>
  );
}
