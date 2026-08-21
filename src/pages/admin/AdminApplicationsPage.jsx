import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExternalLink, RefreshCw, Receipt } from 'lucide-react';
import { admin } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import { formatSar } from '../../utils/money';
import {
  PageHeader,
  Card,
  FilterBar,
  FilterSelect,
  FilterText,
  DataTable,
  Pagination,
  Badge,
  Modal,
  ConfirmDialog,
} from '../../components/admin/AdminUI';
import { PaymentSummary, StepsTable } from '../../components/admin/ProjectFinance';

/* ============================================================
 *  AdminApplicationsPage — /admin/applications
 *
 *  Lookup any bid on the platform. Filters by project ID, status,
 *  and applicant user ID. Clicking a row opens a modal with the
 *  full cover letter and the override-decision action.
 *
 *  The LIST rows are lean, so opening a row fires
 *  GET /admin/applications/:id — the admin-rich version, where
 *  `applicant` carries identity + standing + activity counts and
 *  `project` is the full admin project resource (steps,
 *  payment_summary, partner_earnings). That means an admin can judge
 *  the bid — who's bidding, are they suspended, is the project
 *  already half-paid — without leaving this screen. The row data
 *  renders immediately and the enriched blocks fill in behind it.
 * ============================================================ */

const STATUSES = ['pending', 'accepted', 'rejected'];

function statusTone(status) {
  switch (status) {
    case 'accepted':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'pending':
    default:
      return 'warning';
  }
}

export default function AdminApplicationsPage() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Pre-filter by project when linked from a project detail page.
  const [projectId, setProjectId] = useState(searchParams.get('project_id') || '');
  // Applicant lookup is by the bidder's human-readable identifier
  // ("260703R47"); the numeric user_id filter is gone from the API.
  const [applicantIdentifier, setApplicantIdentifier] = useState(
    searchParams.get('applicant_identifier') || ''
  );
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], meta: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Detail / override state. `selected` is the (lean) list row shown
  // instantly; `detail` is the enriched GET /admin/applications/:id
  // payload that replaces it once it lands.
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [openOverride, setOpenOverride] = useState(false);
  const detailReq = useRef(0);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.applications.list({
        project_id: projectId || undefined,
        applicant_identifier: applicantIdentifier.trim() || undefined,
        status: status || undefined,
        per_page: 25,
        page,
      });
      setData({ rows: res.data, meta: res.meta });
    } catch (err) {
      setError(err.message || t('admin.common.loadError'));
      setData({ rows: [], meta: null });
    } finally {
      setLoading(false);
    }
  }, [projectId, applicantIdentifier, status, page, t]);

  // Debounced — the identifier field is free text, so a request per
  // keystroke would be wasteful. An identifier that matches nobody just
  // comes back as an empty page, never an error.
  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [projectId, applicantIdentifier, status]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const closeDetail = () => {
    detailReq.current += 1; // any in-flight fetch is now stale
    setSelected(null);
    setDetail(null);
    setDetailError('');
    setDetailLoading(false);
  };

  /* Open a row: paint the lean row data at once, then pull the
   * admin-rich resource in the background. A failure here degrades to
   * the row data + an inline note — it never blanks the modal. The
   * counter drops responses for a row that's already been closed or
   * superseded by a faster second click. */
  const openDetail = async (row) => {
    const reqId = ++detailReq.current;
    setSelected(row);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const res = await admin.applications.get(row.id);
      if (detailReq.current !== reqId) return;
      setDetail(res);
    } catch (err) {
      if (detailReq.current !== reqId) return;
      setDetailError(err.message || t('admin.common.loadError'));
    } finally {
      if (detailReq.current === reqId) setDetailLoading(false);
    }
  };

  const handleOverride = async () => {
    if (!selected) return;
    setBusy(true);
    setActionError('');
    try {
      await admin.applications.override(selected.id, reason);
      showToast(t('admin.applications.detail.override.done'));
      setOpenOverride(false);
      setReason('');
      closeDetail();
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'app',
        label: t('admin.applications.columns.application'),
        render: (row) => (
          <div className="min-w-0">
            <div className="font-semibold" style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>
              #{row.id}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {new Date(row.created_at).toLocaleDateString()}
            </div>
          </div>
        ),
      },
      {
        key: 'project',
        label: t('admin.applications.columns.project'),
        render: (row) =>
          row.project ? (
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: 13 }}>{row.project.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                #{row.project.id}
              </div>
            </div>
          ) : (
            `#${row.project_id}`
          ),
      },
      {
        key: 'applicant',
        label: t('admin.applications.columns.applicant'),
        render: (row) =>
          row.applicant ? (
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: 13 }}>{row.applicant.name}</div>
              {/* Identifier over the numeric id — it's what the
                  applicant filter takes. */}
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                {row.applicant.identifier || `#${row.applicant.id}`}
              </div>
            </div>
          ) : (
            `#${row.user_id}`
          ),
      },
      {
        key: 'bid',
        label: t('admin.applications.columns.bid'),
        render: (row) =>
          row.bid_amount != null ? (
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {formatSar(row.bid_amount, lang, t)}
            </span>
          ) : (
            '—'
          ),
      },
      {
        key: 'delivery',
        label: t('admin.applications.columns.delivery'),
        render: (row) => (
          <span style={{ fontSize: 13 }}>{row.delivery_date || '—'}</span>
        ),
      },
      {
        key: 'status',
        label: t('admin.applications.columns.status'),
        render: (row) => (
          <Badge tone={statusTone(row.status)}>
            {t(`admin.statuses.${row.status}`) || row.status}
          </Badge>
        ),
      },
    ],
    [t, lang]
  );

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.applications.eyebrow')}
        title={t('admin.applications.title')}
        subtitle={t('admin.applications.subtitle')}
        actions={
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 16px' }}
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={14} />
            {t('admin.common.refresh')}
          </button>
        }
      />

      {toast && (
        <div
          className="mb-4 p-3 rounded-[10px]"
          style={{
            background: 'rgba(19,109,74,0.10)',
            border: '1px solid rgba(19,109,74,0.22)',
            color: '#136d4a',
            fontSize: 13,
          }}
        >
          {toast}
        </div>
      )}

      <FilterBar
        title={t('admin.common.filtersTitle')}
        activeCount={
          (projectId ? 1 : 0) + (applicantIdentifier ? 1 : 0) + (status ? 1 : 0)
        }
        onReset={() => {
          setProjectId('');
          setApplicantIdentifier('');
          setStatus('');
        }}
        resetLabel={t('admin.common.reset')}
      >
        <FilterText
          label={t('admin.applications.filters.projectId')}
          value={projectId}
          onChange={setProjectId}
          type="number"
        />
        <FilterText
          label={t('admin.applications.filters.applicantIdentifier')}
          value={applicantIdentifier}
          onChange={setApplicantIdentifier}
          placeholder={t('admin.common.identifierPlaceholder')}
          minWidth={190}
        />
        <FilterSelect
          label={t('admin.applications.columns.status')}
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: t('admin.common.anyStatus') },
            ...STATUSES.map((s) => ({ value: s, label: t(`admin.statuses.${s}`) })),
          ]}
        />
      </FilterBar>

      <div className="mt-4">
        <Card padded={false}>
          {error && (
            <div
              className="p-4"
              style={{
                background: 'rgba(185,28,28,0.06)',
                borderBottom: '1px solid rgba(185,28,28,0.18)',
                color: 'var(--accent-danger)',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
          <DataTable
            columns={columns}
            rows={data.rows}
            rowKey={(row) => row.id}
            loading={loading}
            emptyTitle={t('admin.applications.empty')}
            onRowClick={openDetail}
          />
          <Pagination meta={data.meta} onPage={(p) => setPage(p)} t={t} />
        </Card>
      </div>

      {/* Detail modal */}
      <Modal
        open={!!selected && !openOverride}
        onClose={closeDetail}
        title={selected ? `#${selected.id}` : ''}
        width={760}
        footer={
          selected && selected.status !== 'rejected' ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto', padding: '10px 18px' }}
                onClick={closeDetail}
              >
                {t('admin.common.close')}
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{
                  width: 'auto',
                  padding: '10px 18px',
                  background: '#b91c1c',
                  borderColor: '#b91c1c',
                  boxShadow: '0 6px 14px rgba(185,28,28,0.20)',
                }}
                onClick={() => setOpenOverride(true)}
              >
                {t('admin.applications.detail.actions.override')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={closeDetail}
            >
              {t('admin.common.close')}
            </button>
          )
        }
      >
        {selected && (
          <ApplicationDetail
            application={detail || selected}
            enriched={!!detail}
            loading={detailLoading}
            error={detailError}
            t={t}
            lang={lang}
            navigate={navigate}
            onClose={closeDetail}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={openOverride}
        onClose={() => setOpenOverride(false)}
        onConfirm={handleOverride}
        title={t('admin.applications.detail.override.title')}
        description={t('admin.applications.detail.override.description')}
        reason={reason}
        setReason={setReason}
        reasonLabel={t('admin.common.reasonLabel')}
        reasonPlaceholder={t('admin.common.reasonPlaceholder')}
        confirmLabel={t('admin.applications.detail.override.confirm')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="danger"
        busy={busy}
        error={actionError}
      />
    </div>
  );
}


/* ============================================================
 *  ApplicationDetail — the modal body.
 *  ----------------------------------------------------------------
 *  Renders in two passes: the lean list row first, then the same
 *  layout with the admin-rich `applicant` and `project` blocks once
 *  GET /admin/applications/:id resolves. `enriched` says which pass
 *  we're on, so the extra sections appear rather than flickering
 *  half-empty.
 * ============================================================ */
function ApplicationDetail({
  application: app,
  enriched,
  loading,
  error,
  t,
  lang,
  navigate,
  onClose,
}) {
  const applicant = app.applicant;
  const project = app.project;
  const fmtDate = (s) => {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return s;
    }
  };
  const go = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone={statusTone(app.status)}>
            {t(`admin.statuses.${app.status}`) || app.status}
          </Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ fontSize: 13 }}>
          <DetailField
            label={t('admin.applications.columns.bid')}
            value={
              app.bid_amount != null ? formatSar(app.bid_amount, lang, t) : '—'
            }
          />
          <DetailField
            label={t('admin.applications.columns.delivery')}
            value={app.delivery_date || '—'}
          />
          <DetailField
            label={t('admin.applications.detail.submittedAt')}
            value={fmtDate(app.created_at)}
          />
          <DetailField
            label={t('admin.applications.columns.project')}
            value={project?.name || `#${app.project_id}`}
          />
        </div>
        <div>
          <FieldLabel>{t('admin.applications.detail.coverLetter')}</FieldLabel>
          <div
            className="p-3 rounded-[10px]"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-soft)',
              fontSize: 13,
              color: 'var(--text-ink)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.55,
            }}
          >
            {app.cover_letter || '—'}
          </div>
        </div>
      </div>

      {loading && !enriched && (
        <div className="shimmer" style={{ height: 120, width: '100%', borderRadius: 12 }} />
      )}

      {error && (
        <div
          className="p-3 rounded-[10px]"
          style={{
            background: 'rgba(185,28,28,0.06)',
            border: '1px solid rgba(185,28,28,0.18)',
            color: 'var(--accent-danger)',
            fontSize: 12.5,
          }}
        >
          {error}
        </div>
      )}

      {/* ---------- Applicant (admin-rich) ---------- */}
      {enriched && applicant && (
        <Section
          title={t('admin.applications.detail.applicantTitle')}
          action={
            <LinkButton onClick={() => go(`/admin/users/${applicant.id}`)}>
              {t('admin.applications.detail.openProfile')}
            </LinkButton>
          }
        >
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-ink)' }}>
              {applicant.name || `#${applicant.id}`}
            </span>
            <Badge tone={applicant.is_suspended ? 'danger' : 'success'}>
              {applicant.is_suspended
                ? t('admin.users.status.suspended')
                : t('admin.users.status.active')}
            </Badge>
            <Badge tone={applicant.is_phone_verified ? 'success' : 'warning'}>
              {applicant.is_phone_verified
                ? t('admin.users.status.verified')
                : t('admin.users.status.unverified')}
            </Badge>
            {(applicant.roles || []).map((r) => (
              <Badge key={r} tone="primary">
                {r}
              </Badge>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ fontSize: 13 }}>
            <DetailField
              label={t('identifier.label')}
              value={applicant.identifier}
              mono
            />
            <DetailField
              label={t('admin.users.detail.fields.email')}
              value={applicant.email}
            />
            <DetailField
              label={t('admin.users.detail.fields.phone')}
              value={applicant.phone}
            />
            <DetailField
              label={t('admin.users.detail.fields.city')}
              value={applicant.city}
            />
            <DetailField
              label={t('admin.users.detail.fields.accountType')}
              value={
                applicant.account_type
                  ? t(`accountType.${applicant.account_type}`)
                  : null
              }
            />
            <DetailField
              label={t('admin.users.detail.fields.specialty')}
              value={applicant.specialty}
            />
            <DetailField
              label={t('admin.applications.detail.projectsCount')}
              value={applicant.projects_count}
            />
            <DetailField
              label={t('admin.applications.detail.applicationsCount')}
              value={applicant.applications_count}
            />
            <DetailField
              label={t('admin.users.detail.fields.createdAt')}
              value={fmtDate(applicant.created_at)}
            />
          </div>
          {applicant.is_suspended && applicant.suspension_reason && (
            <div className="mt-3">
              <DetailField
                label={t('admin.users.detail.fields.suspendedReason')}
                value={applicant.suspension_reason}
              />
            </div>
          )}
        </Section>
      )}

      {/* ---------- Project (admin-rich: steps + payments) ---------- */}
      {enriched && project && (
        <Section
          title={t('admin.applications.detail.projectTitle')}
          action={
            <LinkButton onClick={() => go(`/admin/projects/${project.id}`)}>
              {t('admin.applications.detail.openProject')}
            </LinkButton>
          }
        >
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-ink)' }}>
              {project.name || `#${project.id}`}
            </span>
            {project.status && (
              <Badge tone="muted">
                {t(`admin.statuses.${project.status}`) || project.status}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4" style={{ fontSize: 13 }}>
            <DetailField
              label={t('admin.projects.columns.owner')}
              value={project.owner?.name}
            />
            <DetailField
              label={t('admin.projects.columns.partner')}
              value={project.partner?.name}
            />
            <DetailField
              label={t('admin.projects.create.city')}
              value={project.city}
            />
          </div>

          <PaymentSummary project={project} t={t} lang={lang} compact />

          {(project.steps || []).length > 0 && (
            <div className="mt-4">
              <FieldLabel>
                <Receipt size={13} style={{ verticalAlign: '-2px', marginInlineEnd: 5 }} />
                {t('admin.finance.title')}
              </FieldLabel>
              <div
                style={{
                  border: '1px solid var(--border-soft)',
                  borderRadius: 11,
                  overflow: 'hidden',
                }}
              >
                <StepsTable steps={project.steps} t={t} lang={lang} compact />
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}


/* ---------- small presentational helpers ---------- */

function FieldLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        color: 'var(--text-muted)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

function DetailField({ label, value, mono }) {
  const empty = value == null || value === '';
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <div
        style={{
          fontSize: 13,
          color: empty ? 'var(--text-muted)' : 'var(--text-ink)',
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
          wordBreak: 'break-word',
        }}
      >
        {empty ? '—' : value}
      </div>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <div
      style={{
        borderTop: '1px solid var(--border-soft)',
        paddingTop: 16,
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3
          className="font-display m-0"
          style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-ink)' }}
        >
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function LinkButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5"
      style={{
        background: 'transparent',
        border: 0,
        padding: 0,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--accent-primary)',
      }}
    >
      {children}
      <ExternalLink size={13} />
    </button>
  );
}
