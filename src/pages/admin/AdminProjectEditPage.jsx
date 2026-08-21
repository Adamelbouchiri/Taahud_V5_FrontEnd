import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { admin } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import { ARENAS } from '../../config/projectConstants';
import { formatSar } from '../../utils/money';
import { PageHeader, Card, CheckboxField } from '../../components/admin/AdminUI';

/* ============================================================
 *  AdminProjectEditPage — /admin/projects/:id/edit
 *
 *  PATCH /admin/projects/:id — the admin-side counterpart to the
 *  owner-only EditProjectPage. Admins bypass the owner check, so
 *  this is the only way to correct a project the platform doesn't
 *  own (wrong budget, typo in the name, missing scope).
 *
 *  Mirrors AdminProjectCreatePage's one-screen layout on purpose —
 *  same field classes, same banner treatment — so create and edit
 *  read as one surface. Two deliberate differences:
 *
 *   - `status` is NOT here. Force-status on the detail page carries a
 *     reason and logs its own audit action (project.force_status);
 *     routing status changes through a plain PATCH would launder them
 *     into a generic project.edit entry. Same for partner.
 *   - Archived (soft-deleted) projects can't be edited. The BE route
 *     uses default route-model binding, which excludes trashed rows,
 *     so a PATCH would 404. We block it up front instead.
 *
 *  PATCH semantics: every rule on AdminUpdateProjectRequest is
 *  `sometimes`, and the core fields are `sometimes|required`. So a
 *  blank value must be OMITTED, not sent as '' — sending '' trips
 *  `required`. buildPayload below drops blanks for those and sends
 *  explicit null only for the genuinely nullable text fields.
 * ============================================================ */

const EXPERIENCE_OPTIONS = ['junior', 'mid', 'senior'];

// `sometimes|required` on the BE — omit when blank rather than
// sending an empty string, which would fail validation.
const REQUIRED_WHEN_PRESENT = [
  'name',
  'type',
  'arena',
  'city',
  'expected_duration',
  'experience',
];

// `sometimes|nullable|string` — safe to send null to clear.
const NULLABLE_TEXT = ['description', 'scope', 'required_documents'];

const EMPTY_FORM = {
  name: '',
  type: '',
  arena: '',
  city: '',
  description: '',
  scope: '',
  required_documents: '',
  start_date: '',
  end_date: '',
  expected_duration: '',
  budget: '',
  experience: '',
  progress: '',
  is_started_externally: false,
};

/** Requirements arrive as [{ id, requirement }] but the form edits
 *  plain strings — the BE replaces the whole set, ids included. */
function reqsToStrings(requirements) {
  if (!Array.isArray(requirements)) return [];
  return requirements
    .map((r) => (typeof r === 'string' ? r : r?.requirement || ''))
    .filter((r) => r !== '');
}

export default function AdminProjectEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  const [form, setForm] = useState(EMPTY_FORM);
  const [reqs, setReqs] = useState([]);
  // Snapshots of what loaded, so we only PATCH what actually moved.
  const [initial, setInitial] = useState(EMPTY_FORM);
  const [initialReqs, setInitialReqs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isTrashed, setIsTrashed] = useState(false);
  const [projectName, setProjectName] = useState('');
  /* The owner's pre-accept estimate, or null when no acceptance is live.
     When it's set, the `budget` field below holds the ACCEPTED BID — so
     editing it rewrites the agreed price, not an estimate. Worth saying
     out loud, since the field looks identical either way. */
  const [originalBudget, setOriginalBudget] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await admin.projects.get(id);
        const p = res?.project ?? res;
        if (cancelled) return;
        if (!p?.id) throw new Error(t('admin.common.loadError'));

        const next = {
          name: p.name ?? '',
          type: p.type ?? '',
          arena: p.arena ?? '',
          city: p.city ?? '',
          description: p.description ?? '',
          scope: p.scope ?? '',
          required_documents: p.required_documents ?? '',
          start_date: p.start_date ?? '',
          end_date: p.end_date ?? '',
          expected_duration: p.expected_duration ?? '',
          // budget is a decimal string ("120000.00") — keep it as a
          // string for the input; buildPayload casts on submit.
          budget: p.budget != null ? String(p.budget) : '',
          experience: p.experience ?? '',
          progress: p.progress != null ? String(p.progress) : '',
          is_started_externally: Boolean(p.is_started_externally),
        };
        const nextReqs = reqsToStrings(p.requirements);

        setForm(next);
        setInitial(next);
        setReqs(nextReqs);
        setInitialReqs(nextReqs);
        setIsTrashed(Boolean(p.deleted_at));
        setProjectName(p.name ?? '');
        setOriginalBudget(p.original_budget_num ?? null);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || t('admin.common.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* The arena picker hides system-locked arenas (public) the same way
     the create form does — but if THIS project already sits in one, it
     has to stay selectable, or saving would silently move it. */
  const arenaOptions = useMemo(() => {
    const list = ARENAS.filter((a) => !a.systemLocked);
    const current = initial.arena;
    if (current && !list.some((a) => a.value === current)) {
      const found = ARENAS.find((a) => a.value === current);
      if (found) return [found, ...list];
    }
    return list;
  }, [initial.arena]);

  const reqsChanged =
    JSON.stringify(reqs.map((r) => r.trim()).filter(Boolean)) !==
    JSON.stringify(initialReqs);

  /** Only the fields that actually changed, shaped for the PATCH. */
  const buildPayload = () => {
    const payload = {};

    REQUIRED_WHEN_PRESENT.forEach((k) => {
      const v = String(form[k] ?? '').trim();
      // Blank means "leave alone" — the BE can't null these anyway.
      if (v && v !== String(initial[k] ?? '').trim()) payload[k] = v;
    });

    NULLABLE_TEXT.forEach((k) => {
      const v = String(form[k] ?? '').trim();
      if (v !== String(initial[k] ?? '').trim()) payload[k] = v || null;
    });

    const budget = String(form.budget ?? '').trim();
    if (budget && Number(budget) !== Number(initial.budget || 0)) {
      payload.budget = Number(budget);
    }

    const progress = String(form.progress ?? '').trim();
    if (progress !== String(initial.progress ?? '').trim()) {
      if (progress) payload.progress = Number(progress);
    }

    if (form.is_started_externally !== initial.is_started_externally) {
      payload.is_started_externally = form.is_started_externally;
    }

    /* Dates go as a PAIR whenever either moved. `end_date` carries
       `after_or_equal:start_date`, which resolves against the OTHER
       FIELD IN THE REQUEST — send end_date alone and the rule has no
       start_date to compare against. */
    const startMoved = form.start_date !== initial.start_date;
    const endMoved = form.end_date !== initial.end_date;
    if ((startMoved || endMoved) && form.start_date && form.end_date) {
      payload.start_date = form.start_date;
      payload.end_date = form.end_date;
    } else if (startMoved && form.start_date && !form.end_date) {
      payload.start_date = form.start_date;
    }

    if (reqsChanged) {
      payload.requirements = reqs.map((r) => r.trim()).filter(Boolean);
    }

    return payload;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setDone('');

    // One date without the other can't be saved — the BE requires both
    // when either is present, so say so rather than dropping it.
    if (form.end_date && !form.start_date) {
      setError(t('admin.projects.edit.datePairRequired'));
      return;
    }
    if (
      form.start_date &&
      form.end_date &&
      form.end_date < form.start_date
    ) {
      setError(t('admin.projects.edit.dateOrder'));
      return;
    }

    const payload = buildPayload();
    if (Object.keys(payload).length === 0) {
      setError(t('admin.projects.edit.noChanges'));
      return;
    }

    setSubmitting(true);
    try {
      await admin.projects.update(id, payload);
      setDone(t('admin.projects.edit.done'));
      setTimeout(() => navigate(`/admin/projects/${id}`), 600);
    } catch (err) {
      setError(err.message || t('admin.common.actionError'));
    } finally {
      setSubmitting(false);
    }
  };

  const backToProject = (
    <button
      type="button"
      className="btn-ghost mb-4"
      style={{ padding: 0 }}
      onClick={() => navigate(`/admin/projects/${id}`)}
    >
      <ArrowLeft size={15} />
      <span style={{ fontSize: 13.5 }}>{t('admin.common.back')}</span>
    </button>
  );

  // Same shimmer skeleton the detail page uses, so navigating between
  // the two doesn't swap loading idioms mid-flow.
  if (loading) {
    return (
      <div className="px-5 lg:px-8 py-7 max-w-3xl mx-auto">
        {backToProject}
        <div className="shimmer" style={{ height: 24, width: 240, borderRadius: 8 }} />
        <div
          className="shimmer mt-4"
          style={{ height: 320, width: '100%', borderRadius: 14 }}
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="px-5 lg:px-8 py-7 max-w-3xl mx-auto">
        {backToProject}
        <Card>
          <Banner tone="danger">{loadError}</Banner>
        </Card>
      </div>
    );
  }

  /* Archived rows 404 on PATCH (default route-model binding skips
     trashed) — send them back to restore first. */
  if (isTrashed) {
    return (
      <div className="px-5 lg:px-8 py-7 max-w-3xl mx-auto">
        {backToProject}
        <Card>
          <Banner tone="danger">
            {t('admin.projects.edit.trashedBlocked')}
          </Banner>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-5 lg:px-8 py-7 max-w-3xl mx-auto">
      {backToProject}

      <PageHeader
        eyebrow={`${t('admin.projects.detail.title')} #${id}`}
        title={t('admin.projects.edit.title')}
        subtitle={projectName || t('admin.projects.edit.subtitle')}
      />

      <form onSubmit={submit}>
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="field-label">
                {t('admin.projects.create.name')}
              </label>
              <input
                type="text"
                className="field field-no-icon"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">
                {t('admin.projects.create.type')}
              </label>
              <input
                type="text"
                className="field field-no-icon"
                required
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">
                {t('admin.projects.create.arena')}
              </label>
              <select
                className="field"
                value={form.arena}
                onChange={(e) => set('arena', e.target.value)}
              >
                {arenaOptions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {t(`arena.${a.value}.label`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">
                {t('admin.projects.create.city')}
              </label>
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
                {originalBudget != null
                  ? t('admin.finance.acceptedBudget')
                  : t('admin.projects.create.budget')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="field field-no-icon"
                value={form.budget}
                onChange={(e) => set('budget', e.target.value)}
              />
              {originalBudget != null && (
                <div className="field-hint">
                  {t('admin.projects.edit.budgetAcceptedNote', {
                    amount: formatSar(originalBudget, lang, t),
                  })}
                </div>
              )}
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
                {/* Keep a legacy free-text value selectable so saving
                    doesn't quietly rewrite it. */}
                {form.experience &&
                  !EXPERIENCE_OPTIONS.includes(form.experience) && (
                    <option value={form.experience}>{form.experience}</option>
                  )}
                {EXPERIENCE_OPTIONS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">
                {t('admin.projects.edit.progress')}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                className="field field-no-icon"
                value={form.progress}
                onChange={(e) => set('progress', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <CheckboxField
                label={t('admin.projects.edit.startedExternally')}
                hint={t('admin.projects.edit.startedExternallyHint')}
                checked={form.is_started_externally}
                onChange={(v) => set('is_started_externally', v)}
              />
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

            <div className="sm:col-span-2">
              <label className="field-label">
                {t('admin.projects.edit.requiredDocuments')}
              </label>
              <textarea
                className="field"
                rows={2}
                value={form.required_documents}
                onChange={(e) => set('required_documents', e.target.value)}
                style={{ padding: '12px 14px', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* ---------- Requirements ----------
              Saved only when the list actually changed: the BE replaces
              the whole set (delete + recreate), so sending an untouched
              list would churn row ids for nothing. */}
          <div className="mt-5">
            <label className="field-label">
              {t('admin.projects.edit.requirements')}
            </label>
            <div className="flex flex-col gap-2">
              {reqs.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    className="field field-no-icon"
                    maxLength={1000}
                    placeholder={t('admin.projects.edit.requirementPlaceholder')}
                    value={r}
                    onChange={(e) =>
                      setReqs((list) =>
                        list.map((x, j) => (j === i ? e.target.value : x))
                      )
                    }
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    aria-label={t('admin.projects.edit.removeRequirement')}
                    title={t('admin.projects.edit.removeRequirement')}
                    style={{ padding: '8px', color: 'var(--accent-danger)' }}
                    onClick={() =>
                      setReqs((list) => list.filter((_, j) => j !== i))
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-ghost mt-2"
              style={{ padding: 0, fontSize: 13 }}
              onClick={() => setReqs((list) => [...list, ''])}
            >
              <Plus size={14} />
              <span>{t('admin.projects.edit.addRequirement')}</span>
            </button>
          </div>

          <div
            className="mt-5 p-3 rounded-[10px]"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-muted)',
              fontSize: 12.5,
            }}
          >
            {t('admin.projects.edit.statusNote')}
          </div>

          {error && <Banner tone="danger">{error}</Banner>}
          {done && <Banner tone="success">{done}</Banner>}

          <div className="mt-5 flex items-center gap-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting
                ? t('admin.projects.edit.submitting')
                : t('admin.projects.edit.submit')}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={submitting}
              onClick={() => navigate(`/admin/projects/${id}`)}
            >
              {t('admin.common.cancel')}
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
}

/** Same banner treatment as AdminProjectCreatePage. */
function Banner({ tone, children }) {
  const styles =
    tone === 'success'
      ? {
          background: 'rgba(19,109,74,0.10)',
          border: '1px solid rgba(19,109,74,0.22)',
          color: '#136d4a',
        }
      : {
          background: 'rgba(185,28,28,0.06)',
          border: '1px solid rgba(185,28,28,0.18)',
          color: 'var(--accent-danger)',
        };
  return (
    <div className="mt-4 p-3 rounded-[10px]" style={{ ...styles, fontSize: 13 }}>
      {children}
    </div>
  );
}
