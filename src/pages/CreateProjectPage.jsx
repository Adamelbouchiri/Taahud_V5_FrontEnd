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
import Stepper from '../components/project/Stepper';
import StepDetails from '../components/project/steps/StepDetails';
import StepScopeAndBudget from '../components/project/steps/StepScopeAndBudget';
import StepFilesAndRequirements from '../components/project/steps/StepFilesAndRequirements';
import StepReview from '../components/project/steps/StepReview';
import { PROJECT_STEPS, defaultArenaFor } from '../config/projectConstants';
import { projects as projectsApi, auth } from '../services';

/* ============================================================
 *  CreateProjectPage — 4-step wizard.
 *
 *  Maps to three migrations:
 *    - projects             (main row)
 *    - project_requirments  (one row per requirement)
 *    - project_files        (one row per file)
 *
 *  Flow on submit:
 *    1. POST /projects (project + requirements[])
 *    2. For each File in form.files: POST /projects/:id/files
 *    3. Show success state.
 *
 *  If file uploads fail, the project still exists. The user can
 *  retry uploads later from the (future) project detail page.
 * ============================================================ */

const INITIAL_FORM = {
  // Step 1
  // Arena is left blank until auth.me() resolves — see useEffect
  // below, which sets it via defaultArenaFor(accountType). One of:
  //   public | private | solidarity | arena | isnad
  arena: '',
  name: '',
  type: '',
  city: '',
  description: '',
  // Step 2
  scope: '',
  start_date: '',
  end_date: '',
  expected_duration: '',
  budget: '',
  experience: '',
  // Step 3
  requirements: [],            // string[] → project_requirments rows
  files: [],                   // File[]   → project_files rows (uploaded post-create)
  required_documents: '',      // string   → free-form list of needed certificates
  is_started_externally: false,// bool     → already in progress outside Taahud
};

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [createdProject, setCreatedProject] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null); // { current, total, fileName }

  // The user's account_type is needed by StepDetails so the
  // ArenaPicker can lock ineligible options and pre-select the
  // right default per the packages workbook. Loaded once on mount.
  const [accountType, setAccountType] = useState(null);

  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((u) => {
        if (!cancelled) setAccountType(u?.account_type || null);
      })
      .catch(() => {
        // Couldn't load — leave accountType null. The picker will
        // treat the user as unknown (no locks), and arena stays
        // whatever the default fallback returns.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Track whether the user manually picked an arena. If they have,
  // don't clobber their choice when accountType resolves.
  const userPickedArenaRef = useRef(false);

  // Once account_type arrives, seed the default arena (if the user
  // hasn't already picked one).
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

  /* -------------------------------------------------------------
   * Validation per step (only steps 1 & 2 have required fields)
   * ----------------------------------------------------------- */
  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (!form.arena) e.arena = 'يرجى اختيار ساحة النشر';
      if (!form.name.trim()) e.name = 'اسم المشروع مطلوب';
      if (!form.type) e.type = 'النوع مطلوب';
      if (!form.city) e.city = 'المدينة مطلوبة';
    }
    if (s === 1) {
      if (form.start_date && form.end_date && form.end_date < form.start_date) {
        e.end_date = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية';
      }
      if (form.budget && Number(form.budget) < 0) {
        e.budget = 'الميزانية يجب أن تكون رقماً موجباً';
      }
    }
    // Steps 2 (files) and 3 (review) have no required fields.
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* -------------------------------------------------------------
   * Step navigation
   * ----------------------------------------------------------- */
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

  /* -------------------------------------------------------------
   * Submit — create project, then upload files
   * ----------------------------------------------------------- */
  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    setSubmitError('');
    setSubmitting(true);
    setUploadProgress(null);

    // Build the create payload. Server fills user_id (auth),
    // status ('pending_review'), progress (0), and timestamps.
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
      // string[] — server expands into project_requirments rows
      requirements: form.requirements,
    };

    try {
      // 1. Create the project
      const project = await projectsApi.create(payload);
      setCreatedProject(project);

      // 2. Upload files one-by-one to project_files
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
            // Don't abort — project is already saved. Just note it.
            console.warn(`Failed to upload ${file.name}:`, uploadErr);
          }
        }
        setUploadProgress(null);
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err.message || 'حدث خطأ أثناء إرسال المشروع. حاول مرة أخرى.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    if (
      window.confirm(
        'هل أنت متأكد من الخروج؟ ستفقد البيانات التي أدخلتها.'
      )
    ) {
      navigate('/dashboard');
    }
  };

  /* -------------------------------------------------------------
   * Success state
   * ----------------------------------------------------------- */
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
    <div className="min-h-screen flex flex-col" style={{ background: '#fafaf6' }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-40 bg-white"
        style={{ borderBottom: '1px solid #e5e3dc' }}
      >
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10 h-[96px] flex items-center justify-between">
          <Logo height={68} />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert('سيتم حفظ المسوّدة (وظيفة تجريبية).')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-[10px] font-semibold transition-all text-ink-soft hover:bg-cream"
              style={{
                fontSize: 13,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Save size={15} />
              <span>حفظ كمسوّدة</span>
            </button>

            <button
              type="button"
              onClick={handleExit}
              aria-label="إغلاق"
              className="flex items-center justify-center transition-colors"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'transparent',
                border: '1px solid #e5e3dc',
                color: '#3a3a52',
                cursor: 'pointer',
              }}
            >
              <X size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-10 lg:py-14">
        <div className="max-w-[860px] mx-auto px-6 lg:px-10">
          <Stepper steps={PROJECT_STEPS} current={step} onJump={jumpTo} />

          {/* Step heading */}
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
              الخطوة {step + 1} من {PROJECT_STEPS.length}
            </div>

            <h1
              className="font-display text-ink m-0 mb-3"
              style={{
                fontSize: 'clamp(26px, 3.4vw, 36px)',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
              }}
            >
              {PROJECT_STEPS[step].label}
            </h1>
            <p
              className="text-muted m-0 max-w-xl mx-auto"
              style={{ fontSize: 14.5, lineHeight: 1.7 }}
            >
              {PROJECT_STEPS[step].description}
            </p>
          </div>

          {/* Submit-error banner (only on review step) */}
          {submitError && isLast && (
            <div
              className="max-w-[700px] mx-auto mb-5 p-4 rounded-[12px] animate-fade-up flex items-start gap-3"
              style={{
                background: 'rgba(185,28,28,0.06)',
                border: '1px solid rgba(185,28,28,0.18)',
                color: '#b91c1c',
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

          {/* Form card */}
          <div
            className="p-6 sm:p-8 lg:p-10 rounded-[18px] animate-fade-up"
            style={{
              background: 'white',
              border: '1px solid #e5e3dc',
              boxShadow: '0 4px 14px rgba(15,17,41,0.04)',
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

          {/* Upload progress strip */}
          {submitting && uploadProgress && (
            <UploadProgress {...uploadProgress} />
          )}
        </div>
      </main>

      {/* Bottom action bar */}
      <footer
        className="sticky bottom-0 z-30 bg-white"
        style={{ borderTop: '1px solid #e5e3dc' }}
      >
        <div className="max-w-[860px] mx-auto px-6 lg:px-10 h-[78px] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-[10px] font-semibold transition-all"
            style={{
              fontSize: 14,
              background: 'white',
              border: '1px solid #e5e3dc',
              color: '#3a3a52',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.currentTarget.style.borderColor = '#cfcdc4';
                e.currentTarget.style.background = '#fafaf6';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e3dc';
              e.currentTarget.style.background = 'white';
            }}
          >
            <ArrowRight size={16} />
            <span>{step === 0 ? 'إلغاء' : 'السابق'}</span>
          </button>

          {/* Center progress (desktop) */}
          <div
            className="hidden md:flex flex-col items-center"
            style={{ minWidth: 200 }}
          >
            <div
              className="font-semibold mb-1.5"
              style={{ fontSize: 12, color: '#7a7a8c' }}
            >
              {Math.round(((step + 1) / PROJECT_STEPS.length) * 100)}%
            </div>
            <div
              style={{
                width: 180,
                height: 4,
                borderRadius: 2,
                background: '#efece4',
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

          {/* Forward / submit button */}
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
                    ? 'جارٍ رفع الملفات...'
                    : 'جارٍ الإرسال...'
                  : 'إرسال المشروع'}
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
              <span>التالي</span>
              <ArrowLeft size={16} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
 *  Upload progress strip — shown beneath the form while files upload
 * ============================================================ */
function UploadProgress({ current, total, fileName }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div
      className="mt-5 p-4 rounded-[12px] animate-fade-up"
      style={{
        background: 'white',
        border: '1px solid #e5e3dc',
        boxShadow: '0 4px 14px rgba(15,17,41,0.04)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-semibold truncate"
          style={{ fontSize: 13, color: '#0f1129', maxWidth: '70%' }}
        >
          جارٍ رفع: {fileName}
        </span>
        <span style={{ fontSize: 12, color: '#7a7a8c', fontWeight: 600 }}>
          {current} / {total}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 5,
          borderRadius: 3,
          background: '#efece4',
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
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#fafaf6' }}
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
          className="font-display text-ink m-0 mb-3"
          style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}
        >
          تمّ إرسال المشروع بنجاح
        </h1>
        <p
          className="text-muted m-0 mb-2"
          style={{ fontSize: 15, lineHeight: 1.7 }}
        >
          مشروعك قيد المراجعة الآن. سنخبرك حالما يصبح متاحاً للشركاء.
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
          الحالة: قيد المراجعة
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onViewProjects}
            className="btn-primary"
            style={{ width: 'auto', flex: 1 }}
          >
            عرض مشاريعي
          </button>
          <button
            onClick={onHome}
            className="btn-secondary"
            style={{ width: 'auto', flex: 1 }}
          >
            الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}
