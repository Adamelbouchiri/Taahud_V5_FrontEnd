import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Logo from '../components/Logo';
import LanguageThemeSwitcher from '../components/LanguageThemeSwitcher';
import StepDetails from '../components/project/steps/StepDetails';
import StepScopeAndBudget from '../components/project/steps/StepScopeAndBudget';
import StepAttachments from '../components/project/steps/StepAttachments';
import {
  defaultArenaFor,
  arenaConfig,
  canPostArena,
} from '../config/projectConstants';
import { projects as projectsApi, auth } from '../services';
import useArenaAddons from '../hooks/useArenaAddons';
import { useTranslation } from '../i18n/LanguageContext';
import ConfirmDialog from '../components/ConfirmDialog';

/* ============================================================
 *  CreateProjectPage — SINGLE-PAGE project form.
 *  ----------------------------------------------------------------
 *  Was a 4-step wizard (details → scope/budget → files → review).
 *  Now every field is on one scrollable page, grouped into three
 *  labelled sections, with one submit at the end.
 *
 *  Why one page: only 5 of ~14 fields are actually required, so the
 *  wizard's gate-per-step rhythm made an otherwise short form feel
 *  long, and hid from the user how little was mandatory. On one page
 *  they can see the whole shape up front, fill the 5 required fields,
 *  and skip the rest.
 *
 *  Required vs optional is now stated on every label (see
 *  components/form/FieldLabel) instead of being implicit. The five
 *  required fields — arena, name, type, city, budget — are the exact
 *  set the BE still enforces; the rest (start_date, expected_duration,
 *  experience) were relaxed to nullable, see
 *  PROJECT_BUDGET_CHANGES_INTEGRATION.md.
 *
 *  End date, requirements and required documents were dropped from this
 *  form entirely — clients don't have that detail when they post. The
 *  columns still exist and stay editable from the edit/admin forms.
 *
 *  Validation is all-at-once on submit rather than per step, and
 *  scrolls to the first offending field — on a long page an error
 *  above the fold is otherwise invisible.
 * ============================================================ */

const INITIAL_FORM = {
  arena: '',
  name: '',
  type: '',
  city: '',
  description: '',
  scope: '',
  start_date: '',
  expected_duration: '',
  budget: '',
  experience: '',
  files: [],
  is_started_externally: false,
};

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [createdProject, setCreatedProject] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  const [accountType, setAccountType] = useState(null);
  // Tracked separately from `accountType` because the resolved value
  // can legitimately be null (anonymous / missing role). The picker
  // uses this to swap in a skeleton until the call settles — otherwise
  // arenas render as if everything is postable for a frame, then snap
  // into their locked state once auth.me() resolves.
  const [accountLoaded, setAccountLoaded] = useState(false);
  // Which gated arenas (isnad / solidarity) the user can post in.
  const { addons, loading: addonsLoading } = useArenaAddons();

  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((u) => {
        if (cancelled) return;
        setAccountType(u?.account_type || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAccountLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const userPickedArenaRef = useRef(false);

  useEffect(() => {
    if (!accountType) return;
    if (userPickedArenaRef.current) return;
    setForm((prev) => ({
      ...prev,
      arena: defaultArenaFor(accountType, addons),
    }));
  }, [accountType, addons]);

  const update = (key, value) => {
    if (key === 'arena') userPickedArenaRef.current = true;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /* Everything the BE still requires, checked in one pass. The
     nullable fields are absent on purpose — nothing about them can be
     wrong on its own now that the end-date ordering check is gone. */
  const validateAll = () => {
    const e = {};

    if (!form.arena) e.arena = t('projects.create.validate.arena');
    else if (!canPostArena(form.arena, accountType, addons)) {
      // Gated arena without the add-on — block here so submit can't
      // walk into a guaranteed 403.
      e.arena = t('projects.create.validate.arenaLocked');
    }
    if (!form.name.trim()) e.name = t('projects.create.validate.name');
    if (!form.type) e.type = t('projects.create.validate.type');
    if (!form.city) e.city = t('projects.create.validate.city');

    if (!String(form.budget).trim()) {
      e.budget = t('projects.create.validate.budgetRequired');
    } else if (Number(form.budget) < 0) {
      e.budget = t('projects.create.validate.budgetPositive');
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* On a page this tall the first error is often off-screen, so the
     form would look like it silently refused to submit. Errors render
     as .field-err, so wait one frame for them to mount and jump to the
     topmost one. */
  const scrollToFirstError = () => {
    requestAnimationFrame(() => {
      const el = document.querySelector('.field-err');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleSubmit = async () => {
    setSubmitError('');

    if (!validateAll()) {
      setSubmitError(t('projects.create.onePage.fixErrors'));
      scrollToFirstError();
      return;
    }

    setSubmitting(true);
    setUploadProgress(null);

    const payload = {
      arena: form.arena,
      name: form.name,
      type: form.type,
      city: form.city,
      description: form.description || null,
      scope: form.scope || null,
      start_date: form.start_date || null,
      expected_duration: form.expected_duration || null,
      budget: form.budget ? Number(form.budget) : null,
      experience: form.experience || null,
      is_started_externally: !!form.is_started_externally,
    };

    try {
      const project = await projectsApi.create(payload);
      setCreatedProject(project);

      if (form.files.length > 0) {
        for (let i = 0; i < form.files.length; i++) {
          const file = form.files[i];
          setUploadProgress({
            current: i + 1,
            total: form.files.length,
            fileName: file.name,
          });
          try {
            await projectsApi.uploadFile(project.id, file);
          } catch (uploadErr) {
            console.warn(`Failed to upload ${file.name}:`, uploadErr);
          }
        }
        setUploadProgress(null);
      }

      setSubmitted(true);
    } catch (err) {
      // A 403 on a gated arena (إسناد / التضامن) means the add-on isn't
      // active — surface a clear add-on message instead of the BE's
      // generic "This action is unauthorized." The picker normally
      // prevents reaching here, so this is the defensive catch the
      // integration guide calls for (e.g. an add-on that lapsed mid-flow).
      if (err?.status === 403 && arenaConfig(form.arena)?.isUpgrade) {
        setSubmitError(
          t('projects.create.addonRequired', {
            arena: t(`arena.${form.arena}.label`),
          })
        );
      } else {
        setSubmitError(err.message || t('projects.create.submitFailed'));
      }
      scrollToFirstError();
    } finally {
      setSubmitting(false);
    }
  };

  // Replaces the native window.confirm with the app-styled ConfirmDialog.
  const handleExit = () => setExitConfirmOpen(true);
  const confirmExit = () => {
    setExitConfirmOpen(false);
    navigate('/dashboard');
  };

  if (submitted) {
    return (
      <SuccessState
        onViewProjects={() => navigate('/dashboard')}
        onHome={() => navigate('/')}
      />
    );
  }

  const k = 'projects.create.onePage';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10 h-[96px] flex items-center justify-between">
          <Logo height={68} />

          <div className="flex items-center gap-2">
            <LanguageThemeSwitcher compact />
            <button
              type="button"
              onClick={handleExit}
              aria-label={t('projects.create.closeAria')}
              className="flex items-center justify-center transition-colors"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'transparent',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
                cursor: 'pointer',
              }}
            >
              <X size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-10 lg:py-14">
        <div className="max-w-[860px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-8 animate-fade-up">
            <div
              className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(44,47,124,0.08)',
                color: 'var(--text-brand-deep)',
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              {t(`${k}.eyebrow`)}
            </div>

            <h1
              className="font-display m-0 mb-3"
              style={{
                fontSize: 'clamp(26px, 3.4vw, 36px)',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                color: 'var(--text-ink)',
              }}
            >
              {t(`${k}.title`)}
            </h1>
            <p
              className="m-0 max-w-xl mx-auto"
              style={{
                fontSize: 14.5,
                lineHeight: 1.7,
                color: 'var(--text-muted)',
              }}
            >
              {t(`${k}.subtitle`)}
            </p>
          </div>

          <Legend t={t} k={k} />

          {submitError && (
            <div
              className="mb-5 p-4 rounded-[12px] animate-fade-up flex items-start gap-3"
              style={{
                background: 'rgba(185,28,28,0.06)',
                border: '1px solid rgba(185,28,28,0.18)',
                color: 'var(--accent-danger)',
                fontSize: 13.5,
              }}
            >
              <AlertCircle
                size={17}
                strokeWidth={1.8}
                className="flex-shrink-0 mt-0.5"
              />
              {submitError}
            </div>
          )}

          <div className="flex flex-col gap-5">
            <FormSection
              number={1}
              title={t(`${k}.sections.basics.title`)}
              desc={t(`${k}.sections.basics.desc`)}
            >
              <StepDetails
                form={form}
                update={update}
                errors={errors}
                accountType={accountType}
                accountLoaded={accountLoaded && !addonsLoading}
                addons={addons}
              />
            </FormSection>

            {/* Every required field is above this line. Say so, and give
                the user a way to act on it — otherwise the two sections
                below read as more work they still have to do. */}
            <SkipNotice
              t={t}
              k={k}
              onPublish={handleSubmit}
              submitting={submitting}
            />

            <FormSection
              number={2}
              title={t(`${k}.sections.scope.title`)}
              desc={t(`${k}.sections.scope.desc`)}
              badge={t('form.optionalLabel')}
            >
              <StepScopeAndBudget
                form={form}
                update={update}
                errors={errors}
              />
            </FormSection>

            <FormSection
              number={3}
              title={t(`${k}.sections.extras.title`)}
              desc={t(`${k}.sections.extras.desc`)}
              badge={t('form.optionalLabel')}
            >
              <StepAttachments form={form} update={update} />
            </FormSection>
          </div>

          {submitting && uploadProgress && (
            <UploadProgress {...uploadProgress} t={t} />
          )}
        </div>
      </main>

      <footer
        className="sticky bottom-0 z-30"
        style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-default)',
        }}
      >
        <div className="max-w-[860px] mx-auto px-6 lg:px-10 h-[78px] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleExit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-[10px] font-semibold transition-all"
            style={{
              fontSize: 14,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-ink-soft)',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.background = 'var(--bg-canvas)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.background = 'var(--bg-surface)';
            }}
          >
            <ArrowRight size={16} />
            <span>{t('projects.create.cancelStep')}</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] text-white font-semibold transition-all"
            style={{
              fontSize: 14.5,
              background: '#136d4a',
              border: '1px solid #136d4a',
              cursor: submitting ? 'wait' : 'pointer',
              boxShadow: '0 6px 14px rgba(19,109,74,0.25)',
              opacity: submitting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.currentTarget.style.background = '#0d5538';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#136d4a';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>
              {submitting
                ? uploadProgress
                  ? t('projects.create.uploading')
                  : t('projects.create.submitting')
                : t('projects.create.submit')}
            </span>
            {!submitting && <Send size={15} />}
          </button>
        </div>
      </footer>

      <ConfirmDialog
        open={exitConfirmOpen}
        title={t('projects.create.exitTitle')}
        message={t('projects.create.exitConfirm')}
        confirmLabel={t('projects.create.exitConfirmCta')}
        cancelLabel={t('projects.create.exitKeepCta')}
        onConfirm={confirmExit}
        onCancel={() => setExitConfirmOpen(false)}
        tone="danger"
      />
    </div>
  );
}

/* ============================================================
 *  Legend — spells out the two markers used on the labels below.
 *  Without it the asterisk is convention-by-assumption; with it the
 *  "you can skip most of this" message lands before the user starts
 *  scrolling.
 * ============================================================ */
function Legend({ t, k }) {
  return (
    <div
      className="mb-5 px-4 py-3 rounded-[12px] flex flex-wrap items-center gap-x-6 gap-y-2 animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <span className="inline-flex items-center gap-2">
        <span
          style={{
            color: 'var(--accent-danger)',
            fontWeight: 700,
            fontSize: 15,
            lineHeight: 1,
          }}
        >
          *
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--text-ink)', fontWeight: 600 }}>
          {t(`${k}.legendRequired`)}
        </span>
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-muted)',
            border: '1px solid var(--border-default)',
            borderRadius: 999,
            padding: '2px 8px',
          }}
        >
          {t('form.optionalLabel')}
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          {t(`${k}.legendOptional`)}
        </span>
      </span>
    </div>
  );
}

/* ============================================================
 *  SkipNotice — the "you're done, if you want to be" marker.
 *  ----------------------------------------------------------------
 *  Sits directly under section 1, which holds all five required
 *  fields. Without it a user who filled those five still sees two more
 *  numbered sections below and reasonably assumes they're mandatory —
 *  the whole point of flattening the wizard was to make the short path
 *  visible, so it needs saying at the exact point it becomes true.
 *
 *  Publish here runs the same handleSubmit as the footer, so an
 *  incomplete block 1 still validates and scrolls back up rather than
 *  failing silently.
 * ============================================================ */
function SkipNotice({ t, k, onPublish, submitting }) {
  return (
    <div
      className="p-5 rounded-[16px] animate-fade-up flex flex-col sm:flex-row sm:items-center gap-4"
      style={{
        background: 'rgba(19,109,74,0.05)',
        border: '1px solid rgba(19,109,74,0.22)',
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          background: 'rgba(19,109,74,0.12)',
          color: '#0d5538',
        }}
      >
        <CheckCircle2 size={20} strokeWidth={1.9} />
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="font-display font-bold"
          style={{ fontSize: 15, color: '#0d5538', lineHeight: 1.35 }}
        >
          {t(`${k}.skip.title`)}
        </div>
        <p
          className="m-0 mt-1"
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--text-ink-soft)',
          }}
        >
          {t(`${k}.skip.desc`)}
        </p>
      </div>

      <button
        type="button"
        onClick={onPublish}
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[11px] font-semibold transition-all flex-shrink-0"
        style={{
          fontSize: 13.5,
          background: '#136d4a',
          border: '1px solid #136d4a',
          color: 'white',
          cursor: submitting ? 'wait' : 'pointer',
          boxShadow: '0 6px 14px rgba(19,109,74,0.22)',
          opacity: submitting ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!submitting) e.currentTarget.style.background = '#0d5538';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#136d4a';
        }}
      >
        <Send size={14} />
        <span>{t(`${k}.skip.cta`)}</span>
      </button>
    </div>
  );
}

/* ============================================================
 *  FormSection — one titled card. Replaces what used to be a wizard
 *  step, so the grouping survives the flattening: the numbers keep
 *  the page's reading order obvious without gating anything.
 * ============================================================ */
function FormSection({ number, title, desc, badge, children }) {
  return (
    <section
      className="p-6 sm:p-8 rounded-[18px] animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        className="flex items-start gap-3.5 mb-6 pb-5"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0 font-display font-bold"
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'rgba(44,47,124,0.08)',
            color: 'var(--text-brand-deep)',
            fontSize: 14,
          }}
        >
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="font-display m-0"
              style={{
                fontSize: 18,
                fontWeight: 700,
                lineHeight: 1.3,
                color: 'var(--text-ink)',
              }}
            >
              {title}
            </h2>
            {badge && (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 999,
                  padding: '3px 9px',
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {desc && (
            <p
              className="m-0 mt-1.5"
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--text-muted)',
              }}
            >
              {desc}
            </p>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

/* ============================================================
 *  Upload progress strip
 * ============================================================ */
function UploadProgress({ current, total, fileName, t }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div
      className="mt-5 p-4 rounded-[12px] animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-semibold truncate"
          style={{ fontSize: 13, color: 'var(--text-ink)', maxWidth: '70%' }}
        >
          {t('projects.create.uploadingFile', { name: fileName })}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          {current} / {total}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 5,
          borderRadius: 3,
          background: 'var(--border-soft)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #2c2f7c, #136d4a)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================
 *  Success state
 * ============================================================ */
function SuccessState({ onViewProjects, onHome }) {
  const { t } = useTranslation();
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="max-w-md w-full text-center animate-fade-up">
        <div
          className="mx-auto mb-6 flex items-center justify-center animate-ring-pulse"
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#136d4a',
          }}
        >
          <CheckCircle2 size={40} color="white" strokeWidth={2.4} />
        </div>

        <h1
          className="font-display m-0 mb-3"
          style={{
            fontSize: 32,
            fontWeight: 700,
            lineHeight: 1.2,
            color: 'var(--text-ink)',
          }}
        >
          {t('projects.create.successTitleNew')}
        </h1>
        <p
          className="m-0 mb-2"
          style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-muted)' }}
        >
          {t('projects.create.successSubtitleNew')}
        </p>
        <p
          className="m-0 mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            background: 'rgba(19,109,74,0.08)',
            color: '#0d5538',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#136d4a' }}
          />
          {t('projects.create.successStatus')}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onViewProjects}
            className="btn-primary"
            style={{ width: 'auto', flex: 1 }}
          >
            {t('projects.create.successViewProjects')}
          </button>
          <button
            onClick={onHome}
            className="btn-secondary"
            style={{ width: 'auto', flex: 1 }}
          >
            {t('projects.create.successHome')}
          </button>
        </div>
      </div>
    </div>
  );
}
