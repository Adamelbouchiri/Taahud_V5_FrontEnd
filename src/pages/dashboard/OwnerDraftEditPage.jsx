import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  UploadCloud,
  CheckCircle2,
  Handshake,
} from 'lucide-react';
import { brokers } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import { PageHeader, Card, ConfirmDialog } from '../../components/admin/AdminUI';
import DraftForm, {
  draftToForm,
  validateDraft,
} from '../../components/broker/DraftForm';

/* ============================================================
 *  OwnerDraftEditPage — /dashboard/drafts/:id
 *  ----------------------------------------------------------------
 *  Phase 2 of the draft: the owner reviews what the broker prepared,
 *  edits anything they like (per the COO — "it's their project
 *  ultimately"), and publishes.
 *
 *  Publishing hands the project into the ordinary pipeline —
 *  pending_review, then admin approval, then the arena — and marks
 *  the source opportunity converted. The agreed broker rate travels
 *  with it, which the note above the form says out loud: the owner
 *  should not discover the commission after publishing.
 * ============================================================ */
export default function OwnerDraftEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [draft, setDraft] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [published, setPublished] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    brokers.ownerDrafts
      .get(id)
      .then((res) => {
        if (!res) {
          setLoadError(t('broker.owner.drafts.notFound'));
          return;
        }
        setDraft(res);
        setForm(draftToForm(res));
        setLoadError('');
      })
      .catch((err) =>
        setLoadError(err.message || t('broker.owner.drafts.notFound'))
      )
      .finally(() => setLoading(false));
  }, [id, t]);

  useEffect(load, [load]);

  const update = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    setSavedAt(null);
  }, []);

  /* ---------- published ---------- */
  if (published) {
    return (
      <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[720px]">
        <Card>
          <div className="text-center py-6">
            <div
              className="mx-auto mb-5 flex items-center justify-center"
              style={{ width: 64, height: 64, borderRadius: '50%', background: '#136d4a' }}
            >
              <CheckCircle2 size={32} color="white" strokeWidth={2.2} />
            </div>
            <h2
              className="font-display m-0 mb-2"
              style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-ink)' }}
            >
              {t('broker.owner.drafts.published.title')}
            </h2>
            <p
              className="m-0 mb-6"
              style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)' }}
            >
              {t('broker.owner.drafts.published.body')}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                className="btn-primary"
                style={{ width: 'auto', fontSize: 13.5 }}
                onClick={() => navigate(`/projects/${published.id}`)}
              >
                {t('broker.owner.drafts.published.viewProject')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto', fontSize: 13.5, padding: '11px 18px' }}
                onClick={() => navigate('/dashboard')}
              >
                {t('broker.owner.drafts.published.backToDashboard')}
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[860px] flex flex-col gap-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="shimmer"
            style={{ height: 180, width: '100%', borderRadius: 12 }}
          />
        ))}
      </div>
    );
  }

  if (loadError || !draft || !form) {
    return (
      <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[860px] flex flex-col gap-4">
        <Card>
          <p className="m-0" style={{ fontSize: 13.5, color: 'var(--accent-danger)' }}>
            {loadError || t('broker.owner.drafts.notFound')}
          </p>
        </Card>
        <button
          type="button"
          className="btn-ghost inline-flex items-center gap-2 self-start"
          style={{ padding: 0, fontSize: 13.5 }}
          onClick={() => navigate('/dashboard/drafts')}
        >
          <ArrowLeft size={15} strokeWidth={1.8} />
          {t('broker.owner.drafts.title')}
        </button>
      </div>
    );
  }

  const save = async () => {
    const e = validateDraft(form, t);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setActionError(t('broker.drafts.errors.fixFields'));
      return;
    }
    setBusy(true);
    setActionError('');
    try {
      const updated = await brokers.ownerDrafts.update(draft.id, form);
      setDraft(updated);
      setForm(draftToForm(updated));
      setSavedAt(Date.now());
    } catch (err) {
      setActionError(err.message || t('broker.drafts.errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  /* Publish always saves first: the owner's edits are in local state,
     and publishing an unsaved form would put the broker's original
     wording into review instead of the owner's. */
  const publish = async () => {
    const e = validateDraft(form, t);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setActionError(t('broker.drafts.errors.fixFields'));
      setConfirmPublish(false);
      return;
    }
    setBusy(true);
    setActionError('');
    try {
      await brokers.ownerDrafts.update(draft.id, form);
      const project = await brokers.ownerDrafts.publish(draft.id);
      setConfirmPublish(false);
      setPublished(project);
    } catch (err) {
      setActionError(err.message || t('broker.drafts.errors.generic'));
      setConfirmPublish(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[860px] flex flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate('/dashboard/drafts')}
        className="btn-ghost inline-flex items-center gap-2 self-start"
        style={{ padding: 0, fontSize: 13.5 }}
      >
        <ArrowLeft size={15} strokeWidth={1.8} />
        {t('broker.form.back')}
      </button>

      <PageHeader
        eyebrow={t('broker.owner.drafts.nav')}
        title={t('broker.owner.drafts.editTitle')}
        subtitle={t('broker.owner.drafts.editSubtitle')}
      />

      {/* The commission the project carries once published. Stated
          before the publish button, not after it. */}
      {draft.broker?.name && (
        <div
          className="p-4 rounded-[12px] flex items-start gap-3"
          style={{
            background: 'rgba(19,109,74,0.06)',
            border: '1px solid rgba(19,109,74,0.18)',
          }}
        >
          <Handshake
            size={17}
            strokeWidth={1.8}
            style={{ color: '#136d4a', flexShrink: 0, marginTop: 1 }}
          />
          <p
            className="m-0"
            style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--text-ink-soft)' }}
          >
            {t('broker.owner.drafts.brokerNote', {
              name: draft.broker.name,
              percent:
                draft.broker_fee_percent != null
                  ? t('broker.fee.percent', { value: draft.broker_fee_percent })
                  : '—',
            })}
          </p>
        </div>
      )}

      {actionError && (
        <Card>
          <p className="m-0" style={{ fontSize: 13.5, color: 'var(--accent-danger)' }}>
            {actionError}
          </p>
        </Card>
      )}

      <Card>
        <DraftForm form={form} update={update} errors={errors} disabled={busy} />
      </Card>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2"
          style={{ width: 'auto', fontSize: 14 }}
          disabled={busy}
          onClick={() => setConfirmPublish(true)}
        >
          <UploadCloud size={16} strokeWidth={1.9} />
          {t('broker.owner.drafts.publish')}
        </button>
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-2"
          style={{ width: 'auto', fontSize: 14, padding: '11px 18px' }}
          disabled={busy}
          onClick={save}
        >
          <Save size={16} strokeWidth={1.9} />
          {busy ? t('broker.drafts.saving') : t('broker.owner.drafts.save')}
        </button>
        {savedAt && (
          <span
            className="inline-flex items-center gap-1.5"
            style={{ fontSize: 12.5, color: '#136d4a', fontWeight: 600 }}
          >
            <CheckCircle2 size={14} strokeWidth={2} />
            {t('broker.drafts.saved')}
          </span>
        )}
      </div>

      <ConfirmDialog
        open={confirmPublish}
        title={t('broker.owner.drafts.publishConfirm.title')}
        description={t('broker.owner.drafts.publishConfirm.message')}
        confirmLabel={t('broker.owner.drafts.publishConfirm.confirm')}
        cancelLabel={t('broker.detail.confirmSubmit.cancel')}
        requireReason={false}
        busy={busy}
        onClose={() => setConfirmPublish(false)}
        onConfirm={publish}
      />
    </div>
  );
}
