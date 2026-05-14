import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  X,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Logo from '../components/Logo';
import LanguageThemeSwitcher from '../components/LanguageThemeSwitcher';
import Stepper from '../components/project/Stepper';
import StepDetails from '../components/project/steps/StepDetails';
import StepScopeAndBudget from '../components/project/steps/StepScopeAndBudget';
import StepFilesAndRequirements from '../components/project/steps/StepFilesAndRequirements';
import StepReview from '../components/project/steps/StepReview';
import { PROJECT_STEPS, defaultArenaFor } from '../config/projectConstants';
import { projects as projectsApi, auth } from '../services';
import { useTranslation } from '../i18n/LanguageContext';

/* ============================================================
 *  CreateProjectPage — 4-step wizard.
 * ============================================================ */

const INITIAL_FORM = {
  arena: '',
  name: '',
  type: '',
  city: '',
  description: '',
  scope: '',
  start_date: '',
  end_date: '',
  expected_duration: '',
  budget: '',
  experience: '',
  requirements: [],
  files: [],
  required_documents: '',
  is_started_externally: false,
};

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [createdProject, setCreatedProject] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);

  const [accountType, setAccountType] = useState(null);

  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((u) => {
        if (!cancelled) setAccountType(u?.account_type || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const userPickedArenaRef = useRef(false);

  useEffect(() => {
    if (!accountType) return;
    if (userPickedArenaRef.current) return;
    setForm((prev) => ({ ...prev, arena: defaultArenaFor(accountType) }));
  }, [accountType]);

  const update = (key, value) => {
    if (key === 'arena') userPickedArenaRef.current = true;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (!form.arena) e.arena = t('projects.create.validate.arena');
      if (!form.name.trim()) e.name = t('projects.create.validate.name');
      if (!form.type) e.type = t('projects.create.validate.type');
      if (!form.city) e.city = t('projects.create.validate.city');
    }
    if (s === 1) {
      if (form.start_date && form.end_date && form.end_date < form.start_date) {
        e.end_date = t('projects.create.validate.dateOrder');
      }
      if (form.budget && Number(form.budget) < 0) {
        e.budget = t('projects.create.validate.budgetPositive');
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, PROJECT_STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (step === 0) return navigate(-1);
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpTo = (i) => {
    if (i <= step) {
      setStep(i);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    setSubmitError('');
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
      end_date: form.end_date || null,
      expected_duration: form.expected_duration || null,
      budget: form.budget ? Number(form.budget) : null,
      experience: form.experience || null,
      required_documents: form.required_documents || null,
      is_started_externally: !!form.is_started_externally,
      requirements: form.requirements,
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
      setSubmitError(err.message || t('projects.create.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    if (window.confirm(t('projects.create.exitConfirm'))) {
      navigate('/dashboard');
    }
  };

  if (submitted) {
    return (
      <SuccessState
        onViewProjects={() => navigate('/dashboard')}
        onHome={() => navigate('/')}
      />
    );
  }

  const isLast = step === PROJECT_STEPS.length - 1;

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
              onClick={() => alert(t('projects.create.saveDraftAlert'))}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-[10px] font-semibold transition-all"
              style={{
                fontSize: 13,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-ink-soft)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'var(--bg-cream)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <Save size={15} />
              <span>{t('projects.create.saveDraft')}</span>
            </button>

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
          <Stepper steps={PROJECT_STEPS} current={step} onJump={jumpTo} />

          <div
            className="text-center mt-12 lg:mt-14 mb-10 animate-fade-up"
            key={`head-${step}`}
          >
            <div
              className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(44,47,124,0.08)',
                color: '#1f2258',
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              {t('projects.create.stepLabel', {
                current: step + 1,
                total: PROJECT_STEPS.length,
              })}
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
              {t(`projects.create.step${step + 1}.label`)}
            </h1>
            <p
              className="m-0 max-w-xl mx-auto"
              style={{
                fontSize: 14.5,
                lineHeight: 1.7,
                color: 'var(--text-muted)',
              }}
            >
              {t(`projects.create.step${step + 1}.description`)}
            </p>
          </div>

          {submitError && isLast && (
            <div
              className="max-w-[700px] mx-auto mb-5 p-4 rounded-[12px] animate-fade-up flex items-start gap-3"
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

          <div
            className="p-6 sm:p-8 lg:p-10 rounded-[18px] animate-fade-up"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-card)',
            }}
            key={`card-${step}`}
          >
            {step === 0 && (
              <StepDetails
                form={form}
                update={update}
                errors={errors}
                accountType={accountType}
              />
            )}
            {step === 1 && (
              <StepScopeAndBudget form={form} update={update} errors={errors} />
            )}
            {step === 2 && (
              <StepFilesAndRequirements form={form} update={update} />
            )}
            {step === 3 && <StepReview form={form} onJumpToStep={jumpTo} />}
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
            onClick={goBack}
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
            <span>
              {step === 0
                ? t('projects.create.cancelStep')
                : t('projects.create.backStep')}
            </span>
          </button>

          <div
            className="hidden md:flex flex-col items-center"
            style={{ minWidth: 200 }}
          >
            <div
              className="font-semibold mb-1.5"
              style={{ fontSize: 12, color: 'var(--text-muted)' }}
            >
              {Math.round(((step + 1) / PROJECT_STEPS.length) * 100)}%
            </div>
            <div
              style={{
                width: 180,
                height: 4,
                borderRadius: 2,
                background: 'var(--border-soft)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${((step + 1) / PROJECT_STEPS.length) * 100}%`,
                  background: 'linear-gradient(90deg, #2c2f7c, #136d4a)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {isLast ? (
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
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] text-white font-semibold transition-all"
              style={{
                fontSize: 14.5,
                background: '#2c2f7c',
                border: '1px solid #2c2f7c',
                cursor: 'pointer',
                boxShadow: '0 6px 14px rgba(44,47,124,0.22)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1f2258';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2c2f7c';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>{t('projects.create.nextStep')}</span>
              <ArrowLeft size={16} />
            </button>
          )}
        </div>
      </footer>
    </div>
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
