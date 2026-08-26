import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send, Lock, CheckCircle2 } from 'lucide-react';
import { brokers } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import { formatDate } from '../../utils/date';
import {
  PageHeader,
  Card,
  Badge,
  ConfirmDialog,
} from '../../components/admin/AdminUI';
import DraftForm, {
  draftToForm,
  validateDraft,
} from '../../components/broker/DraftForm';
import { isDraftWithOwner } from '../../config/brokerConstants';

/* ============================================================
 *  BrokerDraftEditPage — /broker/drafts/:id
 *  ----------------------------------------------------------------
 *  Phase 1 of the draft's life: the broker refines the project, then
 *  hands it to the owner. Hand-off is one-way and one-time — after it
 *  the BE rejects the broker's PATCH with a 422, so the form goes
 *  read-only here rather than letting the broker type into a field
 *  that can no longer be saved.
 * ============================================================ */
export default function BrokerDraftEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  const [draft, setDraft] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [confirmHandOff, setConfirmHandOff] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    brokers.drafts
      .get(id)
      .then((res) => {
        setDraft(res);
        setForm(draftToForm(res));
        setLoadError('');
      })
      .catch((err) => setLoadError(err.message || t('broker.drafts.notFound')))
      .finally(() => setLoading(false));
  }, [id, t]);

  useEffect(load, [load]);

  const update = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    setSavedAt(null);
  }, []);

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
            {loadError || t('broker.drafts.notFound')}
          </p>
        </Card>
        <button
          type="button"
          className="btn-ghost inline-flex items-center gap-2 self-start"
          style={{ padding: 0, fontSize: 13.5 }}
          onClick={() => navigate('/broker/drafts')}
        >
          <ArrowLeft size={15} strokeWidth={1.8} />
          {t('broker.drafts.title')}
        </button>
      </div>
    );
  }

  const handedOff = isDraftWithOwner(draft);

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
      const updated = await brokers.drafts.update(draft.id, form);
      setDraft(updated);
      setForm(draftToForm(updated));
      setSavedAt(Date.now());
    } catch (err) {
      setActionError(err.message || t('broker.drafts.errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const handOff = async () => {
    setBusy(true);
    setActionError('');
    try {
      const updated = await brokers.drafts.handOff(draft.id);
      setDraft(updated);
      setForm(draftToForm(updated));
      setConfirmHandOff(false);
    } catch (err) {
      setActionError(err.message || t('broker.drafts.errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[860px] flex flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate('/broker/drafts')}
        className="btn-ghost inline-flex items-center gap-2 self-start"
        style={{ padding: 0, fontSize: 13.5 }}
      >
        <ArrowLeft size={15} strokeWidth={1.8} />
        {t('broker.form.back')}
      </button>

      <PageHeader
        eyebrow={t('broker.drafts.nav')}
        title={handedOff ? draft.name : t('broker.drafts.editTitle')}
        subtitle={
          handedOff ? t('broker.drafts.lockedHint') : t('broker.drafts.editSubtitle')
        }
        actions={
          <Badge tone={handedOff ? 'warning' : 'muted'}>
            {t(
              handedOff
                ? 'broker.drafts.phase.withOwner'
                : 'broker.drafts.phase.withBroker'
            )}
          </Badge>
        }
      />

      {/* Who this is for, and the rate that was snapshotted onto it at
          creation — the fee can't be renegotiated from here. */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Meta label={t('broker.drafts.owner')} value={draft.owner?.name} />
          <Meta
            label={t('broker.drafts.feeSnapshot')}
            value={
              draft.broker_fee_percent != null
                ? t('broker.fee.percent', { value: draft.broker_fee_percent })
                : null
            }
          />
          <Meta
            label={t('broker.drafts.handedOffAt')}
            value={formatDate(draft.draft_ready_for_owner_at, lang)}
          />
        </div>
      </Card>

      {actionError && (
        <Card>
          <p className="m-0" style={{ fontSize: 13.5, color: 'var(--accent-danger)' }}>
            {actionError}
          </p>
        </Card>
      )}

      {handedOff && (
        <div
          className="p-4 rounded-[12px] flex items-start gap-3"
          style={{
            background: 'rgba(184,134,42,0.08)',
            border: '1px solid rgba(184,134,42,0.22)',
          }}
        >
          <Lock
            size={16}
            strokeWidth={1.9}
            style={{ color: '#b8862a', flexShrink: 0, marginTop: 2 }}
          />
          <p
            className="m-0"
            style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--text-ink-soft)' }}
          >
            {t('broker.drafts.lockedHint')}
          </p>
        </div>
      )}

      <Card>
        <DraftForm
          form={form}
          update={update}
          errors={errors}
          disabled={handedOff || busy}
        />
      </Card>

      {!handedOff && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            style={{ width: 'auto', fontSize: 14 }}
            disabled={busy}
            onClick={save}
          >
            <Save size={16} strokeWidth={1.9} />
            {busy ? t('broker.drafts.saving') : t('broker.drafts.save')}
          </button>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            style={{ width: 'auto', fontSize: 14, padding: '11px 18px' }}
            disabled={busy}
            onClick={() => setConfirmHandOff(true)}
          >
            <Send size={16} strokeWidth={1.9} />
            {t('broker.drafts.handOff')}
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
      )}

      <ConfirmDialog
        open={confirmHandOff}
        title={t('broker.drafts.handOffConfirm.title')}
        description={t('broker.drafts.handOffConfirm.message')}
        confirmLabel={t('broker.drafts.handOffConfirm.confirm')}
        cancelLabel={t('broker.detail.confirmSubmit.cancel')}
        requireReason={false}
        busy={busy}
        onClose={() => setConfirmHandOff(false)}
        onConfirm={handOff}
      />
    </div>
  );
}

function Meta({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>{value}</div>
    </div>
  );
}
