import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { brokers } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import Field from '../../components/form/Field';
import TextareaField from '../../components/form/TextareaField';
import { PageHeader, Card } from '../../components/admin/AdminUI';

/* ============================================================
 *  OpportunityCreatePage — /broker/opportunities/new
 *  ----------------------------------------------------------------
 *  Step 1 of the flow in BROKER_SYSTEM_INTEGRATION.md: create the
 *  draft together with its project_owner. The owner is required and
 *  is created inline — the optional executor is added afterwards on
 *  the detail page.
 *
 *  national_id is optional to the API but carries real weight: it
 *  is the ONLY field the duplicate check runs on. Without it the
 *  check is skipped entirely and two brokers can end up holding the
 *  same owner, to be untangled by an admin. The form says so.
 * ============================================================ */
export default function OpportunityCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [form, setForm] = useState({
    title: '',
    description: '',
    owner_name: '',
    owner_national_id: '',
    owner_phone: '',
    owner_email: '',
    owner_notes: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = t('broker.form.errors.titleMissing');
    if (!form.owner_name.trim()) e.owner_name = t('broker.form.errors.ownerNameMissing');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const created = await brokers.opportunities.create(form);
      // Straight to the detail page: that's where the broker adds an
      // executor and submits for review.
      navigate(`/broker/opportunities/${created.id}`, { replace: true });
    } catch (err) {
      setSubmitError(err.message || t('broker.form.errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px] flex flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate('/broker/opportunities')}
        className="btn-ghost inline-flex items-center gap-2 self-start"
        style={{ padding: 0, fontSize: 13.5 }}
      >
        <ArrowLeft size={15} strokeWidth={1.8} />
        {t('broker.form.back')}
      </button>

      <PageHeader
        eyebrow={t('broker.nav.opportunities')}
        title={t('broker.form.createTitle')}
        subtitle={t('broker.form.createSubtitle')}
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {submitError && (
          <Card>
            <p className="m-0" style={{ fontSize: 13.5, color: 'var(--accent-danger)' }}>
              {submitError}
            </p>
          </Card>
        )}

        <Card>
          <h3
            className="font-display m-0 mb-4"
            style={{ fontSize: 15, fontWeight: 700 }}
          >
            {t('broker.form.sections.opportunity')}
          </h3>
          <div className="flex flex-col gap-4">
            <Field
              label={t('broker.form.title')}
              placeholder={t('broker.form.titlePlaceholder')}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              error={errors.title}
              required
            />
            <TextareaField
              label={t('broker.form.description')}
              placeholder={t('broker.form.descriptionPlaceholder')}
              rows={4}
              required={false}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <h3
            className="font-display m-0 mb-1"
            style={{ fontSize: 15, fontWeight: 700 }}
          >
            {t('broker.form.sections.owner')}
          </h3>
          <p
            className="m-0 mb-4"
            style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.7 }}
          >
            {t('broker.form.sections.ownerHint')}
          </p>

          <div className="flex flex-col gap-4">
            <Field
              label={t('broker.form.ownerName')}
              placeholder={t('broker.form.ownerNamePlaceholder')}
              value={form.owner_name}
              onChange={(e) => update('owner_name', e.target.value)}
              error={errors.owner_name}
              required
            />

            <Field
              label={t('broker.form.nationalId')}
              placeholder={t('broker.form.nationalIdPlaceholder')}
              hint={t('broker.form.nationalIdHint')}
              required={false}
              value={form.owner_national_id}
              onChange={(e) => update('owner_national_id', e.target.value)}
            />

            {/* The duplicate check keys on national_id alone. Say so
                plainly rather than letting the broker discover it when
                a conflict surfaces months later. */}
            {!form.owner_national_id.trim() && (
              <div
                className="p-3 rounded-[11px] flex items-start gap-2.5"
                style={{
                  background: 'rgba(184,134,42,0.08)',
                  border: '1px solid rgba(184,134,42,0.20)',
                }}
              >
                <Info
                  size={15}
                  strokeWidth={1.8}
                  style={{ color: '#b8862a', flexShrink: 0, marginTop: 2 }}
                />
                <p
                  className="m-0"
                  style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-ink-soft)' }}
                >
                  {t('broker.form.noNationalIdWarning')}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label={t('broker.form.phone')}
                placeholder="+9665XXXXXXXX"
                required={false}
                value={form.owner_phone}
                onChange={(e) => update('owner_phone', e.target.value)}
              />
              <Field
                label={t('broker.form.email')}
                type="email"
                placeholder="owner@example.com"
                required={false}
                value={form.owner_email}
                onChange={(e) => update('owner_email', e.target.value)}
              />
            </div>

            <TextareaField
              label={t('broker.form.notes')}
              placeholder={t('broker.form.notesPlaceholder')}
              hint={t('broker.form.notesHint')}
              rows={3}
              required={false}
              value={form.owner_notes}
              onChange={(e) => update('owner_notes', e.target.value)}
            />
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ fontSize: 13.5 }}
          >
            {submitting ? t('broker.form.saving') : t('broker.form.saveDraft')}
          </button>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {t('broker.form.saveDraftHint')}
          </span>
        </div>
      </form>
    </div>
  );
}
