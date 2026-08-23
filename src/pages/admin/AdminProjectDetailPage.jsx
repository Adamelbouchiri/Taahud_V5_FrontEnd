import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Activity as ActivityIcon,
  Archive,
  Undo2,
  Trash2,
  RefreshCcw,
  Pencil,
  UserPlus,
  ListChecks,
  Gavel,
  Receipt,
  Paperclip,
} from 'lucide-react';
import { admin } from '../../services';
import { useUser } from '../../contexts/UserContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { ARENAS } from '../../config/projectConstants';
import { formatSar } from '../../utils/money';
import {
  PageHeader,
  Card,
  Badge,
  Modal,
  ConfirmDialog,
} from '../../components/admin/AdminUI';
import { PaymentSummary, StepsTable } from '../../components/admin/ProjectFinance';
import FileList from '../../components/project/FileList';

/* ============================================================
 *  AdminProjectDetailPage — /admin/projects/:id
 *
 *  Mirrors the user-side ProjectDetailsPage layout (overview
 *  card + requirements + files), but adds the admin actions
 *  panel: edit, force-status, force-partner, soft-delete,
 *  restore, hard-delete (super-admin only), and a shortcut to
 *  the activity log scoped to this project.
 *
 *  Edit routes to AdminProjectEditPage (PATCH) for the project's
 *  own fields; status and partner keep their force-* modals here
 *  because those require a reason and log distinct audit actions.
 * ============================================================ */

const STATUSES = [
  'pending_review',
  'open_for_bids',
  'awarded',
  'in_progress',
  'completed',
  'cancelled',
];

function statusTone(status) {
  switch (status) {
    case 'open_for_bids':
      return 'success';
    case 'awarded':
    case 'in_progress':
      return 'primary';
    case 'completed':
      return 'muted';
    case 'cancelled':
      return 'danger';
    case 'pending_review':
    default:
      return 'warning';
  }
}

// Application (offer) status → Badge tone — distinct enum from project status.
function offerTone(status) {
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

export default function AdminProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { isSuperAdmin } = useUser();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);

  const [openModal, setOpenModal] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState('');

  // Sub-form state for the multi-input modals
  const [newStatus, setNewStatus] = useState('open_for_bids');
  // Force-partner takes the partner's human-readable identifier
  // ("260703R47"), not a numeric user id.
  const [partnerIdentifier, setPartnerIdentifier] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.projects.get(id);
      const p = res?.project ?? res;
      setProject(p);
      if (p?.status) setNewStatus(p.status);
    } catch (err) {
      setError(err.message || t('admin.common.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // Offers (applications) on this project. Kept separate from `load` so a
  // failure here never blanks the project view, and so it can refresh after
  // actions that change bids (e.g. force-partner awards the project).
  const loadOffers = async () => {
    setOffersLoading(true);
    try {
      const res = await admin.applications.list({ project_id: id, per_page: 100 });
      setOffers(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const closeModal = () => {
    if (busy) return;
    setOpenModal(null);
    setReason('');
    setActionError('');
    setPartnerIdentifier('');
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const wrap = async (fn, doneMsg) => {
    setBusy(true);
    setActionError('');
    try {
      await fn();
      showToast(doneMsg);
      closeModal();
      load();
      loadOffers();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="px-5 lg:px-8 py-10 max-w-5xl mx-auto">
        <div className="shimmer" style={{ height: 24, width: 240, borderRadius: 8 }} />
        <div className="shimmer mt-4" style={{ height: 200, width: '100%', borderRadius: 14 }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="px-5 lg:px-8 py-10 max-w-4xl mx-auto">
        <Card>
          <div style={{ color: 'var(--accent-danger)', fontSize: 14 }}>
            {error || t('admin.common.loadError')}
          </div>
        </Card>
      </div>
    );
  }

  const isTrashed = !!project.deleted_at;
  const arenaObj = ARENAS.find((a) => a.value === project.arena);
  const steps = Array.isArray(project.steps) ? project.steps : [];
  // Older API builds don't ship the admin-only finance sections — hide
  // the whole card rather than render an empty shell.
  const hasFinance = !!project.payment_summary || steps.length > 0;
  const fmt = (s) =>
    s ? new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  return (
    <div className="px-5 lg:px-8 py-7 max-w-6xl mx-auto">
      <button
        type="button"
        className="btn-ghost mb-4"
        style={{ padding: 0 }}
        onClick={() => navigate('/admin/projects')}
      >
        <ArrowLeft size={15} />
        <span style={{ fontSize: 13.5 }}>{t('admin.common.back')}</span>
      </button>

      <PageHeader
        eyebrow={`${t('admin.projects.detail.title')} #${project.id}`}
        title={project.name || '—'}
        subtitle={arenaObj ? t(`arena.${project.arena}.label`) : project.arena}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone(project.status)}>
              {t(`admin.statuses.${project.status}`) || project.status}
            </Badge>
            {isTrashed && <Badge tone="muted">{t('admin.projects.trashedBadge')}</Badge>}
            {project.created_by_admin_id &&
              project.created_by_admin_id !== project.user_id && (
                <Badge tone="warning">{t('admin.projects.proxyBadge')}</Badge>
              )}
          </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card>
            <h3 className="font-display m-0 mb-4" style={{ fontSize: 16, fontWeight: 700 }}>
              {t('admin.projects.detail.title')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <Field label={t('admin.projects.create.name')} value={project.name} />
              <Field label={t('admin.projects.create.type')} value={project.type} />
              <Field label={t('admin.projects.create.city')} value={project.city} />
              {/* Once a bid is accepted, `budget` IS the accepted amount
                  and original_budget_num holds the owner's estimate — so
                  the label changes with it, or the number reads as the
                  owner's figure when it isn't. */}
              <Field
                label={
                  project.original_budget_num != null
                    ? t('admin.finance.acceptedBudget')
                    : t('admin.projects.create.budget')
                }
                value={
                  project.budget != null ? (
                    <BudgetValue project={project} lang={lang} t={t} />
                  ) : null
                }
              />
              <Field
                label={t('admin.projects.create.startDate')}
                value={project.start_date}
              />
              <Field
                label={t('admin.projects.create.endDate')}
                value={project.end_date}
              />
              <Field
                label={t('admin.projects.create.duration')}
                value={project.expected_duration}
              />
              <Field
                label={t('admin.projects.create.experience')}
                value={project.experience}
              />
              {/* Identifier over the numeric id — it's what the admin
                  filters and force-partner take. */}
              <Field
                label={t('admin.projects.columns.owner')}
                value={userLabel(project.owner)}
              />
              <Field
                label={t('admin.projects.columns.partner')}
                value={userLabel(project.partner)}
              />
              {/* What this partner earned from THIS project — sits next
                  to the partner name so the two read together. */}
              {project.partner_earnings_num != null && (
                <Field
                  label={t('admin.finance.partnerEarnings')}
                  value={formatSar(project.partner_earnings_num, lang, t)}
                />
              )}
              <Field
                label={t('admin.projects.columns.createdAt')}
                value={fmt(project.created_at)}
              />
              {project.description && (
                <Field
                  label={t('admin.projects.create.description')}
                  value={project.description}
                  span={2}
                />
              )}
              {project.scope && (
                <Field
                  label={t('admin.projects.create.scope')}
                  value={project.scope}
                  span={2}
                />
              )}
            </div>
          </Card>

          {Array.isArray(project.requirements) && project.requirements.length > 0 && (
            <Card>
              <h3 className="font-display m-0 mb-3" style={{ fontSize: 15, fontWeight: 700 }}>
                <ListChecks size={16} style={{ verticalAlign: '-2px', marginInlineEnd: 6 }} />
                {t('admin.projects.detail.requirements')}
              </h3>
              <ul className="m-0 p-0 list-disc ps-5" style={{ fontSize: 13.5, color: 'var(--text-ink-soft)' }}>
                {project.requirements.map((r, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {typeof r === 'string' ? r : r.requirement}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* ---------- Attachments ----------
              AdminProjectController::show eager-loads `files`, so they
              arrive on the payload already — same shape as the
              user-side project resource. Read-only here: there is no
              admin files endpoint, uploads/deletes stay on the
              owner-facing project page. */}
          {Array.isArray(project.files) && project.files.length > 0 && (
            <Card>
              <h3 className="font-display m-0 mb-3" style={{ fontSize: 15, fontWeight: 700 }}>
                <Paperclip size={16} style={{ verticalAlign: '-2px', marginInlineEnd: 6 }} />
                {t('admin.projects.detail.files')}
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                  {' '}
                  ({project.files.length})
                </span>
              </h3>
              <FileList files={project.files} />
            </Card>
          )}

          {/* ---------- Milestones & payments (admin-only) ----------
              Present only on the admin project resource: the step plan
              (proposals included), how much of the budget has actually
              been paid, and the partner's earnings. */}
          {hasFinance && (
            <Card padded={false}>
              <div className="px-5 pt-5 pb-4 flex flex-col gap-4">
                <h3 className="font-display m-0" style={{ fontSize: 15, fontWeight: 700 }}>
                  <Receipt size={16} style={{ verticalAlign: '-2px', marginInlineEnd: 6 }} />
                  {t('admin.finance.title')}
                  {steps.length > 0 && (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                      {' '}
                      ({steps.length})
                    </span>
                  )}
                </h3>
                <PaymentSummary project={project} t={t} lang={lang} />
              </div>
              <StepsTable steps={steps} t={t} lang={lang} />
            </Card>
          )}

          {/* ---------- Offers (applications) ---------- */}
          <Card>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-display m-0" style={{ fontSize: 15, fontWeight: 700 }}>
                <Gavel size={16} style={{ verticalAlign: '-2px', marginInlineEnd: 6 }} />
                {t('admin.projects.detail.offers')}
                {offers.length > 0 && (
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}> ({offers.length})</span>
                )}
              </h3>
              {offers.length > 0 && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: 0, fontSize: 12.5 }}
                  onClick={() => navigate(`/admin/applications?project_id=${project.id}`)}
                >
                  {t('admin.projects.detail.viewAllOffers')}
                </button>
              )}
            </div>

            {offersLoading ? (
              <div className="shimmer" style={{ height: 96, width: '100%', borderRadius: 10 }} />
            ) : offers.length === 0 ? (
              <p className="m-0" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {t('admin.projects.detail.noOffers')}
              </p>
            ) : (
              <div className="flex flex-col">
                {offers.map((o, i) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-3"
                    style={{
                      padding: '10px 0',
                      borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)',
                    }}
                  >
                    <div className="min-w-0">
                      <div className="truncate" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-ink)' }}>
                        {userLabel(o.applicant) || `#${o.user_id}`}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {t('admin.applications.columns.delivery')}: {o.delivery_date || '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-ink)' }}>
                        {o.bid_amount != null ? Number(o.bid_amount).toLocaleString() : '—'}
                      </span>
                      <Badge tone={offerTone(o.status)}>
                        {t(`admin.statuses.${o.status}`) || o.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <h3 className="font-display m-0 mb-4" style={{ fontSize: 16, fontWeight: 700 }}>
              {t('admin.projects.columns.actions')}
            </h3>
            <div className="flex flex-col gap-2">
              {/* Plain PATCH of the project's own fields. Hidden while
                  archived — the BE route's model binding skips trashed
                  rows, so the PATCH would 404. Restore first. */}
              {!isTrashed && (
                <ActionButton
                  icon={Pencil}
                  label={t('admin.projects.detail.actions.edit')}
                  onClick={() => navigate(`/admin/projects/${project.id}/edit`)}
                />
              )}
              <ActionButton
                icon={RefreshCcw}
                label={t('admin.projects.detail.actions.forceStatus')}
                onClick={() => setOpenModal('forceStatus')}
              />
              <ActionButton
                icon={UserPlus}
                label={t('admin.projects.detail.actions.forcePartner')}
                onClick={() => setOpenModal('forcePartner')}
              />
              {isTrashed ? (
                <ActionButton
                  icon={Undo2}
                  tone="success"
                  label={t('admin.projects.detail.actions.restore')}
                  onClick={() => setOpenModal('restore')}
                />
              ) : (
                <ActionButton
                  icon={Archive}
                  tone="danger"
                  label={t('admin.projects.detail.actions.softDelete')}
                  onClick={() => setOpenModal('softDelete')}
                />
              )}
              {isSuperAdmin && (
                <ActionButton
                  icon={Trash2}
                  tone="danger"
                  label={t('admin.projects.detail.actions.forceDelete')}
                  onClick={() => setOpenModal('forceDelete')}
                />
              )}
              <ActionButton
                icon={ActivityIcon}
                label={t('admin.projects.detail.actions.viewActivity')}
                onClick={() =>
                  navigate(`/admin/activity?target_type=Project&target_id=${project.id}`)
                }
              />
            </div>
          </Card>
        </div>
      </div>

      {/* ---------- Force status ---------- */}
      <Modal
        open={openModal === 'forceStatus'}
        onClose={closeModal}
        title={t('admin.projects.detail.forceStatus.title')}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={closeModal}
              disabled={busy}
            >
              {t('admin.common.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={() =>
                wrap(
                  () => admin.projects.forceStatus(id, newStatus, reason),
                  t('admin.projects.detail.forceStatus.done')
                )
              }
              disabled={busy || !newStatus || (reason || '').trim().length < 10}
            >
              {busy ? '…' : t('admin.projects.detail.forceStatus.confirm')}
            </button>
          </>
        }
      >
        <p className="m-0 mb-3" style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}>
          {t('admin.projects.detail.forceStatus.description')}
        </p>
        <label className="field-label">
          {t('admin.projects.detail.forceStatus.fieldLabel')}
        </label>
        <select
          className="field"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`admin.statuses.${s}`)}
            </option>
          ))}
        </select>
        <div className="mt-3">
          <label className="field-label">{t('admin.common.reasonLabel')}</label>
          <textarea
            className="field"
            rows={3}
            placeholder={t('admin.common.reasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ padding: '12px 14px', resize: 'vertical' }}
          />
        </div>
        {actionError && (
          <div
            className="mt-3 p-3 rounded-[10px]"
            style={{
              background: 'rgba(185,28,28,0.06)',
              border: '1px solid rgba(185,28,28,0.18)',
              color: 'var(--accent-danger)',
              fontSize: 13,
            }}
          >
            {actionError}
          </div>
        )}
      </Modal>

      {/* ---------- Force partner ---------- */}
      <Modal
        open={openModal === 'forcePartner'}
        onClose={closeModal}
        title={t('admin.projects.detail.forcePartner.title')}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={closeModal}
              disabled={busy}
            >
              {t('admin.common.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={() =>
                wrap(
                  () =>
                    admin.projects.forcePartner(
                      id,
                      partnerIdentifier.trim(),
                      reason
                    ),
                  t('admin.projects.detail.forcePartner.done')
                )
              }
              disabled={
                busy ||
                !partnerIdentifier.trim() ||
                (reason || '').trim().length < 10
              }
            >
              {busy ? '…' : t('admin.projects.detail.forcePartner.confirm')}
            </button>
          </>
        }
      >
        <p className="m-0 mb-3" style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}>
          {t('admin.projects.detail.forcePartner.description')}
        </p>
        <label className="field-label">
          {t('admin.projects.detail.forcePartner.partnerLabel')}
        </label>
        <input
          type="text"
          className="field field-no-icon"
          value={partnerIdentifier}
          placeholder={t('admin.common.identifierPlaceholder')}
          onChange={(e) => setPartnerIdentifier(e.target.value)}
        />
        <div className="field-hint">
          {t('admin.projects.detail.forcePartner.partnerHint')}
        </div>
        <div className="mt-3">
          <label className="field-label">{t('admin.common.reasonLabel')}</label>
          <textarea
            className="field"
            rows={3}
            placeholder={t('admin.common.reasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ padding: '12px 14px', resize: 'vertical' }}
          />
        </div>
        {actionError && (
          <div
            className="mt-3 p-3 rounded-[10px]"
            style={{
              background: 'rgba(185,28,28,0.06)',
              border: '1px solid rgba(185,28,28,0.18)',
              color: 'var(--accent-danger)',
              fontSize: 13,
            }}
          >
            {actionError}
          </div>
        )}
      </Modal>

      {/* ---------- Soft delete ---------- */}
      <ConfirmDialog
        open={openModal === 'softDelete'}
        onClose={closeModal}
        onConfirm={() =>
          wrap(
            () => admin.projects.remove(id),
            t('admin.projects.detail.softDelete.done')
          )
        }
        title={t('admin.projects.detail.softDelete.title')}
        description={t('admin.projects.detail.softDelete.description')}
        reason=""
        setReason={() => {}}
        requireReason={false}
        confirmLabel={t('admin.projects.detail.softDelete.confirm')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="danger"
        busy={busy}
        error={actionError}
      />

      {/* ---------- Restore ---------- */}
      <ConfirmDialog
        open={openModal === 'restore'}
        onClose={closeModal}
        onConfirm={() =>
          wrap(
            () => admin.projects.restore(id),
            t('admin.projects.detail.restore.done')
          )
        }
        title={t('admin.projects.detail.restore.title')}
        description={t('admin.projects.detail.restore.description')}
        reason=""
        setReason={() => {}}
        requireReason={false}
        confirmLabel={t('admin.projects.detail.restore.confirm')}
        cancelLabel={t('admin.common.cancel')}
        busy={busy}
        error={actionError}
      />

      {/* ---------- Force delete (super-admin) ---------- */}
      <ConfirmDialog
        open={openModal === 'forceDelete'}
        onClose={closeModal}
        onConfirm={() =>
          wrap(
            () => admin.projects.forceDelete(id, reason),
            t('admin.projects.detail.forceDelete.done')
          )
        }
        title={t('admin.projects.detail.forceDelete.title')}
        description={t('admin.projects.detail.forceDelete.description')}
        reason={reason}
        setReason={setReason}
        reasonLabel={t('admin.common.reasonLabel')}
        reasonPlaceholder={t('admin.common.reasonPlaceholder')}
        confirmLabel={t('admin.projects.detail.forceDelete.confirm')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="danger"
        busy={busy}
        error={actionError}
      />
    </div>
  );
}

/** "Name (260703R47)" — falls back to the numeric id for older
 *  payloads that don't carry an identifier. */
function userLabel(user) {
  if (!user?.name) return null;
  const tag = user.identifier || (user.id != null ? `#${user.id}` : '');
  return tag ? `${user.name} (${tag})` : user.name;
}

/* Budget cell. With no acceptance snapshot it's just the amount; with
   one, it shows the accepted bid over the owner's original estimate plus
   the delta, which is the question support actually asks ("why did the
   budget change?"). Under-estimate is a saving, over-estimate isn't —
   hence the two tones rather than one signed number. */
function BudgetValue({ project, lang, t }) {
  const current = project.budget != null ? Number(project.budget) : null;
  const original = project.original_budget_num;
  if (current == null || Number.isNaN(current)) return null;

  const currentLabel = formatSar(current, lang, t);
  if (original == null) return currentLabel;

  const delta = original - current;
  return (
    <div className="flex flex-col gap-1.5">
      <span style={{ fontWeight: 700 }}>{currentLabel}</span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {t('admin.finance.originalEstimate')}: {formatSar(original, lang, t)}
      </span>
      {delta !== 0 && (
        <span>
          <Badge tone={delta > 0 ? 'success' : 'warning'}>
            {delta > 0
              ? t('admin.finance.savings', {
                  amount: formatSar(delta, lang, t),
                })
              : t('admin.finance.overrun', {
                  amount: formatSar(-delta, lang, t),
                })}
          </Badge>
        </span>
      )}
    </div>
  );
}

function Field({ label, value, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--text-ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {value != null && value !== '' ? value : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, tone = 'neutral' }) {
  const color =
    tone === 'danger'
      ? 'var(--accent-danger)'
      : tone === 'success'
      ? '#136d4a'
      : 'var(--text-ink-soft)';
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 text-start"
      style={{
        padding: '11px 14px',
        background: 'transparent',
        border: '1px solid var(--border-default)',
        borderRadius: 11,
        cursor: 'pointer',
        color,
        fontSize: 13.5,
        fontWeight: 500,
        fontFamily: 'inherit',
        transition: 'background 0.18s ease, border-color 0.18s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-canvas)';
        e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
    >
      <Icon size={15} strokeWidth={1.7} />
      <span>{label}</span>
    </button>
  );
}
