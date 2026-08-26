import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FilePlus2, AlertCircle } from 'lucide-react';
import { brokers } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import { PageHeader, Card } from '../../components/admin/AdminUI';
import DraftForm, {
  EMPTY_DRAFT,
  validateDraft,
} from '../../components/broker/DraftForm';
import { canCreateDraft, draftPrerequisites } from '../../config/brokerConstants';

/* ============================================================
 *  DraftCreatePage — /broker/opportunities/:id/draft/new
 *  ----------------------------------------------------------------
 *  The broker fills in the project on the owner's behalf. The BE
 *  seeds nothing beyond title/description from the opportunity, so
 *  the form starts from those and the broker supplies the rest.
 *
 *  The three prerequisites (accepted invitation, approved fee, no
 *  existing draft) are re-checked here rather than trusted from the
 *  page the broker came from: they can lapse between the two reads,
 *  and a 422 after filling out a whole form is a bad way to find out.
 * ============================================================ */
export default function DraftCreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [opp, setOpp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState(EMPTY_DRAFT);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;
    brokers.opportunities
      .get(id)
      .then((res) => {
        if (cancelled) return;

        /* An opportunity can only ever have one draft, and the BE 422s
           on a second. Landing here with one already built (a stale
           tab, a bookmarked URL) should open it rather than let the
           broker retype a whole form for a guaranteed rejection. */
        if (res?.draft_project_id) {
          navigate(`/broker/drafts/${res.draft_project_id}`, { replace: true });
          return;
        }

        setOpp(res);
        // Carry the opportunity's own wording across so the broker
        // edits it rather than retyping it.
        setForm((prev) => ({
          ...prev,
          name: res?.title || '',
          description: res?.description || '',
        }));
        setLoadError('');
      })
      .catch((err) =>
        !cancelled && setLoadError(err.message || t('broker.detail.loadError'))
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, t, navigate]);

  const update = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }, []);

  const submit = async () => {
    const e = validateDraft(form, t);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setSubmitError(t('broker.drafts.errors.fixFields'));
      requestAnimationFrame(() => {
        const el = document.querySelector('.field-err');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const draft = await brokers.drafts.create(id, form);
      navigate(`/broker/drafts/${draft.id}`, { replace: true });
    } catch (err) {
      setSubmitError(err.message || t('broker.drafts.errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

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

  if (loadError || !opp) {
    return (
      <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[860px]">
        <Card>
          <p className="m-0" style={{ fontSize: 13.5, color: 'var(--accent-danger)' }}>
            {loadError || t('broker.detail.loadError')}
          </p>
        </Card>
      </div>
    );
  }

  const blocked = !canCreateDraft(opp);
  const prereq = draftPrerequisites(opp);

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[860px] flex flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate(`/broker/opportunities/${id}`)}
        className="btn-ghost inline-flex items-center gap-2 self-start"
        style={{ padding: 0, fontSize: 13.5 }}
      >
        <ArrowLeft size={15} strokeWidth={1.8} />
        {t('broker.form.back')}
      </button>

      <PageHeader
        eyebrow={opp.reference}
        title={t('broker.drafts.createTitle')}
        subtitle={t('broker.drafts.createSubtitle')}
      />

      {blocked ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle
              size={18}
              strokeWidth={1.8}
              style={{ color: '#b8862a', flexShrink: 0, marginTop: 2 }}
            />
            <div>
              <div
                className="font-semibold"
                style={{ fontSize: 13.5, color: 'var(--text-ink)' }}
              >
                {t('broker.drafts.card.prereqTitle')}
              </div>
              <ul
                className="m-0 mt-2 ps-5"
                style={{ fontSize: 13, color: 'var(--text-ink-soft)', lineHeight: 1.9 }}
              >
                {!prereq.invitationAccepted && (
                  <li>{t('broker.drafts.card.prereqInvitation')}</li>
                )}
                {!prereq.feeApproved && <li>{t('broker.drafts.card.prereqFee')}</li>}
                {!prereq.noDraftYet && (
                  <li>{t('broker.drafts.card.prereqExists')}</li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {submitError && (
            <Card>
              <p
                className="m-0"
                style={{ fontSize: 13.5, color: 'var(--accent-danger)' }}
              >
                {submitError}
              </p>
            </Card>
          )}

          <Card>
            <DraftForm form={form} update={update} errors={errors} />
          </Card>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2"
              style={{ width: 'auto', fontSize: 14 }}
              disabled={submitting}
              onClick={submit}
            >
              <FilePlus2 size={16} strokeWidth={1.9} />
              {submitting ? t('broker.drafts.saving') : t('broker.drafts.create')}
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 13.5 }}
              disabled={submitting}
              onClick={() => navigate(`/broker/opportunities/${id}`)}
            >
              {t('broker.detail.confirmSubmit.cancel')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
