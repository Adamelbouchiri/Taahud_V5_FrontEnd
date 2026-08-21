import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { admin } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import { ARENAS } from '../../config/projectConstants';
import { PageHeader, Card } from '../../components/admin/AdminUI';

/* ============================================================
 *  AdminProjectCreatePage — /admin/projects/new
 *
 *  Lean form for the create-on-behalf flow. Includes the
 *  `owner_user_id` field at the top — leaving it blank creates
 *  the project as the admin, providing it proxies on behalf.
 *
 *  We don't reuse the wizard from CreateProjectPage on purpose:
 *  admins need fewer guardrails (no arena/role gating) and a
 *  one-screen form is faster for the typical proxy-create case.
 * ============================================================ */

const EXPERIENCE_OPTIONS = ['junior', 'mid', 'senior'];

export default function AdminProjectCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    owner_user_id: '',
    name: '',
    type: '',
    arena: 'private',
    city: '',
    description: '',
    scope: '',
    start_date: '',
    end_date: '',
    expected_duration: '',
    budget: '',
    // Optional on create — default to unset rather than claiming
    // "senior" the admin never actually chose.
    experience: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setDone('');
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        arena: form.arena,
        city: form.city,
        description: form.description || undefined,
        scope: form.scope || undefined,
        // start_date / end_date / expected_duration / experience are all
        // optional on create now — omit blanks rather than posting ''.
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        expected_duration: form.expected_duration || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        experience: form.experience || undefined,
      };
      const ownerId = form.owner_user_id
        ? parseInt(form.owner_user_id, 10)
        : null;
      if (ownerId) payload.owner_user_id = ownerId;
      const res = await admin.projects.create(payload);
      const created = res?.project ?? res;
      setDone(
        ownerId
          ? t('admin.projects.create.doneProxy', { id: ownerId })
          : t('admin.projects.create.done')
      );
      if (created?.id) {
        setTimeout(() => navigate(`/admin/projects/${created.id}`), 600);
      }
    } catch (err) {
      setError(err.message || t('admin.common.actionError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-5 lg:px-8 py-7 max-w-3xl mx-auto">
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
        eyebrow={t('admin.projects.eyebrow')}
        title={t('admin.projects.create.title')}
        subtitle={t('admin.projects.create.subtitle')}
      />

      <form onSubmit={submit}>
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="field-label">
                {t('admin.projects.create.ownerLabel')}
              </label>
              <input
                type="number"
                className="field field-no-icon"
                placeholder=""
                value={form.owner_user_id}
                onChange={(e) => set('owner_user_id', e.target.value)}
              />
              <div className="field-hint">
                {t('admin.projects.create.ownerHint')}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="field-label">{t('admin.projects.create.name')}</label>
              <input
                type="text"
                className="field field-no-icon"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">{t('admin.projects.create.type')}</label>
              <input
                type="text"
                className="field field-no-icon"
                required
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">{t('admin.projects.create.arena')}</label>
              <select
                className="field"
                value={form.arena}
                onChange={(e) => set('arena', e.target.value)}
              >
                {ARENAS.filter((a) => !a.systemLocked).map((a) => (
                  <option key={a.value} value={a.value}>
                    {t(`arena.${a.value}.label`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">{t('admin.projects.create.city')}</label>
              <input
                type="text"
                className="field field-no-icon"
                required
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">
                {t('admin.projects.create.budget')}
              </label>
              {/* Budget stays REQUIRED on create — downstream milestone
                  and escrow logic keys off it. */}
              <input
                type="number"
                min="0"
                step="0.01"
                className="field field-no-icon"
                required
                value={form.budget}
                onChange={(e) => set('budget', e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">
                {t('admin.projects.create.startDate')}
              </label>
              <input
                type="date"
                className="field field-no-icon"
                value={form.start_date}
                onChange={(e) => set('start_date', e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">
                {t('admin.projects.create.endDate')}
              </label>
              <input
                type="date"
                className="field field-no-icon"
                value={form.end_date}
                onChange={(e) => set('end_date', e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">
                {t('admin.projects.create.duration')}
              </label>
              <input
                type="text"
                className="field field-no-icon"
                value={form.expected_duration}
                onChange={(e) => set('expected_duration', e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">
                {t('admin.projects.create.experience')}
              </label>
              <select
                className="field"
                value={form.experience}
                onChange={(e) => set('experience', e.target.value)}
              >
                <option value="">
                  {t('admin.projects.edit.experienceNone')}
                </option>
                {EXPERIENCE_OPTIONS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="field-label">
                {t('admin.projects.create.description')}
              </label>
              <textarea
                className="field"
                rows={3}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                style={{ padding: '12px 14px', resize: 'vertical' }}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label">
                {t('admin.projects.create.scope')}
              </label>
              <textarea
                className="field"
                rows={3}
                value={form.scope}
                onChange={(e) => set('scope', e.target.value)}
                style={{ padding: '12px 14px', resize: 'vertical' }}
              />
            </div>
          </div>

          {error && (
            <div
              className="mt-4 p-3 rounded-[10px]"
              style={{
                background: 'rgba(185,28,28,0.06)',
                border: '1px solid rgba(185,28,28,0.18)',
                color: 'var(--accent-danger)',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
          {done && (
            <div
              className="mt-4 p-3 rounded-[10px]"
              style={{
                background: 'rgba(19,109,74,0.10)',
                border: '1px solid rgba(19,109,74,0.22)',
                color: '#136d4a',
                fontSize: 13,
              }}
            >
              {done}
            </div>
          )}

          <div className="mt-5">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting
                ? t('admin.projects.create.submitting')
                : t('admin.projects.create.submit')}
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
}
