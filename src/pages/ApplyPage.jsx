import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Send,
  Wallet,
  MapPin,
  Tag,
  Clock,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Info,
  AlertCircle,
  ListChecks,
  User,
} from 'lucide-react';
import Logo from '../components/Logo';
import TextareaField from '../components/form/TextareaField';
import { projects as projectsApi, applications as applicationsApi } from '../services';

/* ============================================================
 *  ApplyPage — submit an application to a single project.
 *  Route: /projects/:id/apply
 *
 *  Form fields map to the `applications` migration:
 *    - cover_letter   (required, text)
 *    - bid_amount     (required, integer)
 *    - delevery_date  (required, string — date input)
 *
 *  Backend manages: user_id, project_id (from URL), status,
 *  is_accepted, timestamps.
 * ============================================================ */

export default function ApplyPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [coverLetter, setCoverLetter] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  /* Load the project so we can show context next to the form */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    projectsApi
      .get(id)
      .then((p) => {
        if (cancelled) return;
        if (p.status !== 'open_for_bids') {
          setLoadError('هذا المشروع لم يعد مفتوحاً للعروض.');
          return;
        }
        if (p.has_applied) {
          setLoadError('لقد قدّمت طلباً سابقاً على هذا المشروع.');
          return;
        }
        setProject(p);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'تعذّر تحميل المشروع.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* Validation */
  const validate = () => {
    const e = {};
    if (!coverLetter.trim() || coverLetter.trim().length < 30) {
      e.cover_letter = 'الرجاء كتابة رسالة لا تقلّ عن ٣٠ حرفاً.';
    }
    if (!bidAmount) {
      e.bid_amount = 'الرجاء إدخال قيمة العرض.';
    } else if (Number(bidAmount) <= 0) {
      e.bid_amount = 'قيمة العرض يجب أن تكون رقماً موجباً.';
    }
    if (!deliveryDate) {
      e.delivery_date = 'الرجاء تحديد تاريخ التسليم.';
    } else if (new Date(deliveryDate) < new Date(new Date().toDateString())) {
      e.delivery_date = 'تاريخ التسليم يجب أن يكون في المستقبل.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* Submit */
  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      // Note: backend column is `delevery_date` (sic). Match it exactly.
      await applicationsApi.applicant.submit(Number(id), {
        cover_letter: coverLetter.trim(),
        bid_amount: Math.round(Number(bidAmount)),
        delevery_date: deliveryDate,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'تعذّر إرسال الطلب. حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ----- Render states ----- */

  if (loading) return <Shell><LoadingState /></Shell>;
  if (loadError) return <Shell><ErrorState message={loadError} onBack={() => navigate('/projects')} /></Shell>;
  if (submitted) return <Shell><SuccessState project={project} onBrowse={() => navigate('/projects')} onMyApps={() => navigate('/dashboard')} /></Shell>;

  return (
    <Shell>
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-8 lg:py-12">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-2 mb-6 text-muted"
          style={{ fontSize: 13 }}
        >
          <Link to="/projects" className="link" style={{ fontWeight: 500 }}>
            تصفّح المشاريع
          </Link>
          <ArrowLeft size={13} className="text-muted" />
          <span className="text-ink font-medium">تقديم طلب</span>
        </nav>

        {/* Title */}
        <div className="mb-8 animate-fade-up">
          <div
            className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(19,109,74,0.08)',
              color: '#0d5538',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            <Send size={12} />
            تقديم طلب
          </div>
          <h1
            className="font-display text-ink m-0 mb-2"
            style={{
              fontSize: 'clamp(28px, 3.4vw, 38px)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
            }}
          >
            قدّم عرضك للعميل
          </h1>
          <p
            className="text-muted m-0"
            style={{ fontSize: 14.5, lineHeight: 1.7, maxWidth: 600 }}
          >
            رسالةٌ واضحة وعرضٌ منطقي يزيدان من فرصة قبول طلبك. سيراجع العميل عرضك
            وقد يتواصل معك للتفاصيل.
          </p>
        </div>

        {/* Two-column grid: form (left visually = first in DOM in RTL) | summary */}
        <div className="grid lg:grid-cols-[1.4fr,1fr] gap-6 lg:gap-8">
          {/* Form column */}
          <form onSubmit={submit} className="animate-fade-up">
            <div
              className="p-7 lg:p-8 rounded-[18px]"
              style={{
                background: 'white',
                border: '1px solid #e5e3dc',
                boxShadow: '0 4px 14px rgba(15,17,41,0.04)',
              }}
            >
              {submitError && (
                <div
                  className="p-3.5 rounded-[11px] mb-5"
                  style={{
                    background: 'rgba(185,28,28,0.06)',
                    border: '1px solid rgba(185,28,28,0.18)',
                    color: '#b91c1c',
                    fontSize: 13.5,
                  }}
                >
                  {submitError}
                </div>
              )}

              <SectionHeader
                title="رسالة التعريف"
                subtitle="عرّف بنفسك وبأعمالك السابقة بما يثبت قدرتك على إنجاز المشروع."
              />

              <TextareaField
                label="الرسالة"
                rows={7}
                placeholder="مثال: لدينا فريق متخصص أنجز ١٥ مشروعاً مماثلاً خلال السنوات الثلاث الماضية، نلتزم بالمواعيد ونعتمد..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                error={errors.cover_letter}
                hint={`${coverLetter.length} / يفضّل ٣٠ حرفاً على الأقل`}
              />

              <div className="my-6 border-t" style={{ borderColor: '#efece4' }} />

              <SectionHeader
                title="العرض المالي والزمني"
                subtitle="حدّد قيمة العرض وتاريخ التسليم المتوقّع."
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <BidAmountField
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  error={errors.bid_amount}
                  customerBudget={project.budget}
                />
                <DeliveryDateField
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  error={errors.delivery_date}
                />
              </div>

              {/* Submission notice */}
              <div
                className="flex gap-3 mt-7 p-4 rounded-[12px]"
                style={{
                  background: 'rgba(44,47,124,0.04)',
                  border: '1px solid rgba(44,47,124,0.12)',
                }}
              >
                <Info
                  size={17}
                  strokeWidth={1.7}
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: '#2c2f7c' }}
                />
                <p
                  className="m-0"
                  style={{
                    fontSize: 13,
                    color: '#3a3a52',
                    lineHeight: 1.7,
                  }}
                >
                  بعد الإرسال، يصبح طلبك قيد الانتظار حتى يردّ العميل. لا يمكنك
                  تعديل الطلب لاحقاً، لكن يمكنك سحبه من صفحة "طلباتي".
                </p>
              </div>
            </div>

            {/* Action bar */}
            <div className="flex justify-between items-center mt-5 flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/projects')}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-[10px] font-semibold transition-all"
                style={{
                  fontSize: 14,
                  background: 'white',
                  border: '1px solid #e5e3dc',
                  color: '#3a3a52',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                <ArrowRight size={16} />
                إلغاء
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-[10px] text-white font-semibold transition-all"
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
                {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
                {!submitting && <Send size={15} />}
              </button>
            </div>
          </form>

          {/* Project summary sidebar */}
          <ProjectSummary project={project} />
        </div>
      </div>
    </Shell>
  );
}

/* ============================================================
 *  Layout shell (top bar)
 * ============================================================ */
function Shell({ children }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#fafaf6' }}>
      <header
        className="sticky top-0 z-40 bg-white"
        style={{ borderBottom: '1px solid #e5e3dc' }}
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-[96px] flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-transparent border-0 p-0 cursor-pointer"
            aria-label="الرئيسية"
          >
            <Logo height={68} />
          </button>
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] font-medium transition-colors text-ink-soft hover:bg-cream"
            style={{ fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <ArrowRight size={15} />
            <span>عودة للتصفّح</span>
          </button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

/* ============================================================
 *  Project summary sidebar
 * ============================================================ */
function ProjectSummary({ project }) {
  return (
    <aside className="animate-fade-up lg:sticky lg:top-[88px] lg:self-start">
      <div
        className="rounded-[18px] overflow-hidden"
        style={{ background: 'white', border: '1px solid #e5e3dc' }}
      >
        {/* Header strip */}
        <div
          className="px-6 py-5"
          style={{
            background: 'linear-gradient(150deg, #2c2f7c 0%, #1f2258 100%)',
            color: 'white',
          }}
        >
          <div
            className="font-semibold uppercase mb-2"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            تقديم لمشروع
          </div>
          <h2
            className="font-display m-0"
            style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.35 }}
          >
            {project.name}
          </h2>
        </div>

        {/* Owner */}
        {project.owner && (
          <div
            className="flex items-center gap-3 px-6 py-4"
            style={{ borderBottom: '1px solid #efece4' }}
          >
            <div
              className="flex items-center justify-center font-display font-bold flex-shrink-0"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(44,47,124,0.08)',
                color: '#2c2f7c',
                fontSize: 16,
              }}
            >
              {project.owner.name?.[0] || '؟'}
            </div>
            <div className="min-w-0">
              <div
                className="font-semibold truncate"
                style={{ fontSize: 13.5, color: '#0f1129' }}
              >
                {project.owner.name}
              </div>
              <div className="flex items-center gap-1" style={{ fontSize: 11.5, color: '#7a7a8c' }}>
                <User size={11} strokeWidth={1.8} />
                {ownerTypeLabel(project.owner.account_type)}
              </div>
            </div>
          </div>
        )}

        {/* Key facts */}
        <div className="px-6 py-5 grid grid-cols-2 gap-x-5 gap-y-4">
          <Fact icon={Tag} label="النوع" value={project.type} />
          <Fact icon={MapPin} label="المدينة" value={project.city} />
          {project.budget != null && (
            <Fact
              icon={Wallet}
              label="ميزانية العميل"
              value={`${formatNumber(project.budget)} ر.س`}
            />
          )}
          {project.expected_duration && (
            <Fact
              icon={Clock}
              label="المدة المتوقعة"
              value={project.expected_duration}
            />
          )}
          {project.start_date && (
            <Fact
              icon={Calendar}
              label="تاريخ البداية"
              value={formatDate(project.start_date)}
            />
          )}
          {project.end_date && (
            <Fact
              icon={Calendar}
              label="تاريخ الانتهاء"
              value={formatDate(project.end_date)}
            />
          )}
        </div>

        {/* Description */}
        {project.description && (
          <div
            className="px-6 py-5"
            style={{ borderTop: '1px solid #efece4' }}
          >
            <div
              className="font-semibold uppercase mb-2"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.1em',
                color: '#7a7a8c',
              }}
            >
              الوصف
            </div>
            <p
              className="m-0"
              style={{ fontSize: 13.5, color: '#3a3a52', lineHeight: 1.75 }}
            >
              {project.description}
            </p>
          </div>
        )}

        {/* Scope */}
        {project.scope && (
          <div
            className="px-6 py-5"
            style={{ borderTop: '1px solid #efece4' }}
          >
            <div
              className="font-semibold uppercase mb-2"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.1em',
                color: '#7a7a8c',
              }}
            >
              نطاق العمل
            </div>
            <p
              className="m-0"
              style={{ fontSize: 13.5, color: '#3a3a52', lineHeight: 1.75 }}
            >
              {project.scope}
            </p>
          </div>
        )}

        {/* Requirements */}
        {project.requirements && project.requirements.length > 0 && (
          <div
            className="px-6 py-5"
            style={{ borderTop: '1px solid #efece4' }}
          >
            <div
              className="flex items-center gap-1.5 font-semibold uppercase mb-3"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.1em',
                color: '#7a7a8c',
              }}
            >
              <ListChecks size={12} strokeWidth={1.8} />
              المتطلبات
            </div>
            <ul className="m-0 p-0 space-y-2">
              {project.requirements.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 list-none"
                  style={{ fontSize: 13, color: '#3a3a52', lineHeight: 1.6 }}
                >
                  <span
                    className="flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: 'rgba(19,109,74,0.1)',
                      color: '#136d4a',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ============================================================
 *  Small atoms
 * ============================================================ */

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h3
        className="font-display text-ink m-0 mb-1"
        style={{ fontSize: 16, fontWeight: 700 }}
      >
        {title}
      </h3>
      {subtitle && (
        <p className="text-muted m-0" style={{ fontSize: 13, lineHeight: 1.6 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon
        size={14}
        strokeWidth={1.7}
        className="flex-shrink-0 mt-0.5 text-muted"
      />
      <div className="min-w-0">
        <div
          className="font-medium uppercase mb-0.5"
          style={{ fontSize: 10, letterSpacing: '0.08em', color: '#7a7a8c' }}
        >
          {label}
        </div>
        <div
          className="font-semibold truncate"
          style={{ fontSize: 13, color: '#0f1129' }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function BidAmountField({ value, onChange, error, customerBudget }) {
  const num = Number(value);
  const showHint =
    !error &&
    customerBudget &&
    value &&
    !Number.isNaN(num) &&
    num !== customerBudget;
  const diff = num - customerBudget;

  return (
    <div className="animate-fade-up">
      <label className="field-label">قيمة العرض (بالريال)</label>
      <div className="flex gap-2">
        <span className="phone-cc">ر.س</span>
        <input
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          placeholder="مثال: 100000"
          value={value}
          onChange={onChange}
          className={`field field-no-icon ${error ? 'error' : ''}`}
          style={{ flex: 1 }}
        />
      </div>
      {error && <p className="field-err">{error}</p>}
      {showHint && (
        <p
          className="m-0 mt-1.5"
          style={{
            fontSize: 12,
            color: diff < 0 ? '#0d5538' : diff > 0 ? '#9c4221' : '#7a7a8c',
            fontWeight: 500,
          }}
        >
          {diff < 0
            ? `أقل من ميزانية العميل بـ ${formatNumber(Math.abs(diff))} ر.س`
            : `أعلى من ميزانية العميل بـ ${formatNumber(diff)} ر.س`}
        </p>
      )}
      {!error && !showHint && (
        <p className="field-hint">رقم صحيح بدون فواصل عشرية.</p>
      )}
    </div>
  );
}

function DeliveryDateField({ value, onChange, error }) {
  const today = new Date().toISOString().split('T')[0];
  return (
    <div className="animate-fade-up">
      <label className="field-label">تاريخ التسليم</label>
      <div className="relative">
        <div className="absolute top-1/2 -translate-y-1/2 end-[14px] text-muted pointer-events-none flex">
          <Calendar size={17} strokeWidth={1.7} />
        </div>
        <input
          type="date"
          min={today}
          value={value}
          onChange={onChange}
          className={`field ${error ? 'error' : ''}`}
        />
      </div>
      {error && <p className="field-err">{error}</p>}
      {!error && (
        <p className="field-hint">التاريخ المتوقّع لإنجاز المشروع.</p>
      )}
    </div>
  );
}

/* ============================================================
 *  Loading / error / success states
 * ============================================================ */

function LoadingState() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-12">
      <div
        className="grid lg:grid-cols-[1.4fr,1fr] gap-6 lg:gap-8 animate-pulse"
      >
        <div
          className="p-8 rounded-[18px]"
          style={{ background: 'white', border: '1px solid #e5e3dc' }}
        >
          <div style={{ height: 18, width: '40%', background: '#efece4', borderRadius: 6, marginBottom: 12 }} />
          <div style={{ height: 13, width: '70%', background: '#efece4', borderRadius: 6, marginBottom: 24 }} />
          <div style={{ height: 140, background: '#efece4', borderRadius: 11 }} />
        </div>
        <div
          className="p-6 rounded-[18px]"
          style={{ background: 'white', border: '1px solid #e5e3dc' }}
        >
          <div style={{ height: 16, width: '60%', background: '#efece4', borderRadius: 6, marginBottom: 12 }} />
          <div style={{ height: 13, width: '85%', background: '#efece4', borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onBack }) {
  return (
    <div className="max-w-md mx-auto py-20 px-6 text-center">
      <div
        className="mx-auto mb-5 flex items-center justify-center"
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'rgba(185,28,28,0.08)',
          color: '#b91c1c',
        }}
      >
        <AlertCircle size={28} strokeWidth={1.7} />
      </div>
      <h2
        className="font-display text-ink m-0 mb-2"
        style={{ fontSize: 22, fontWeight: 700 }}
      >
        تعذّر فتح صفحة التقديم
      </h2>
      <p className="text-muted m-0 mb-7" style={{ fontSize: 14, lineHeight: 1.7 }}>
        {message}
      </p>
      <button
        onClick={onBack}
        className="btn-primary"
        style={{ width: 'auto' }}
      >
        العودة للتصفّح
      </button>
    </div>
  );
}

function SuccessState({ project, onBrowse, onMyApps }) {
  return (
    <div className="max-w-md mx-auto py-20 px-6 text-center animate-fade-up">
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
        style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}
      >
        تمّ إرسال طلبك بنجاح
      </h1>
      <p
        className="text-muted m-0 mb-8"
        style={{ fontSize: 14.5, lineHeight: 1.7 }}
      >
        تمّ إرسال طلبك لمشروع{' '}
        <span className="text-ink font-semibold">{project?.name}</span>. سنخبرك
        حالما يردّ العميل.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button onClick={onMyApps} className="btn-primary" style={{ width: 'auto', flex: 1 }}>
          عرض طلباتي
        </button>
        <button onClick={onBrowse} className="btn-secondary" style={{ width: 'auto', flex: 1 }}>
          العودة للتصفّح
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 *  Helpers
 * ============================================================ */

function ownerTypeLabel(t) {
  if (t === 'developer') return 'مطوّر عقاري';
  if (t === 'individual') return 'عميل';
  return 'صاحب المشروع';
}

function formatNumber(n) {
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return n;
  return new Intl.NumberFormat('ar-SA').format(num);
}

function formatDate(d) {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(d));
  } catch {
    return d;
  }
}
