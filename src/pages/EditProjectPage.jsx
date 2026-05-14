import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X,
  Save,
  AlertCircle,
  ArrowRight,
  FileText,
  Tag,
  MapPin,
  Calendar,
  Wallet,
  Clock,
  Award,
  ListChecks,
  Files,
  FileBadge,
  PlayCircle,
  Trash2,
  CheckCircle2,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  UploadCloud,
} from 'lucide-react';
import Logo from '../components/Logo';
import Field from '../components/form/Field';
import SelectField from '../components/form/SelectField';
import TextareaField from '../components/form/TextareaField';
import RequirementsList from '../components/project/RequirementsList';
import FilesUpload from '../components/project/FilesUpload';
import {
  PROJECT_TYPES,
  PROJECT_DURATIONS,
  EXPERIENCE_LEVELS,
  arenaLabel,
} from '../config/projectConstants';
import { CITIES } from '../config/constants';
import { projects as projectsApi } from '../services';
import { UserProvider, useUser } from '../contexts/UserContext';

/* ============================================================
 *  EditProjectPage — /projects/:id/edit
 *  ----------------------------------------------------------------
 *  Single-page form. The owner edits data fields and requirements;
 *  status + progress are managed by the backend (accept-application,
 *  partner flows). Files are added/removed live via the file
 *  endpoints — uploads happen immediately so the user can see them
 *  in the existing-files list right away.
 *
 *  Backed by:
 *    GET    /api/projects/:id
 *    PATCH  /api/projects/:id
 *    POST   /api/projects/:id/files
 *    DELETE /api/projects/:id/files/:fileId
 *
 *  Provides its own UserProvider so isOwner can be checked without
 *  depending on the dashboard layout (this is a standalone route).
 * ============================================================ */

const REQUIREMENT_SUGGESTIONS = [
  'رخصة بناء سارية',
  'مخططات معتمدة من البلدية',
  'شهادة تأمين',
  'سجل تجاري',
  'شهادات سلامة',
  'مخططات تنفيذية',
  'عينات مواد',
];

export default function EditProjectPageRoute() {
  return (
    <UserProvider>
      <EditProjectPage />
    </UserProvider>
  );
}

function EditProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Editable form state — initialized from the loaded project.
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Live file list (existing on the server). Separate from the form
  // because uploads/deletes happen immediately.
  const [existingFiles, setExistingFiles] = useState([]);
  const [pendingUploads, setPendingUploads] = useState([]); // File[]
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [fileError, setFileError] = useState('');

  /* -------------------------------------------------------------
   * Load the project once.
   * ----------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    projectsApi
      .get(id)
      .then((p) => {
        if (cancelled) return;
        setProject(p);
        setExistingFiles(p.files || []);
        setForm({
          name: p.name || '',
          type: p.type || '',
          arena: p.arena || '',
          city: p.city || '',
          description: p.description || '',
          scope: p.scope || '',
          start_date: p.start_date || '',
          end_date: p.end_date || '',
          expected_duration: p.expected_duration || '',
          budget: p.budget ?? '',
          experience: p.experience || '',
          required_documents: p.required_documents || '',
          is_started_externally: !!p.is_started_externally,
          requirements: Array.isArray(p.requirements) ? p.requirements : [],
        });
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

  if (loading) return <Shell><LoadingState /></Shell>;
  if (loadError || !project)
    return (
      <Shell>
        <ErrorState message={loadError} onBack={() => navigate(-1)} />
      </Shell>
    );

  // Only the owner can edit. The BE will 403 too, but we block in
  // the UI to avoid showing a form they can't submit.
  const isOwner = user && project.user_id === user.id;
  if (!user) {
    // Still loading user — render nothing risky. The form is gated.
  }
  if (user && !isOwner) {
    return (
      <Shell>
        <ErrorState
          message="لا تملك صلاحية تعديل هذا المشروع."
          onBack={() => navigate(`/projects/${id}`)}
        />
      </Shell>
    );
  }

  /* -------------------------------------------------------------
   * Field updates + validation
   * ----------------------------------------------------------- */
  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'اسم المشروع مطلوب';
    if (!form.type) e.type = 'النوع مطلوب';
    if (!form.city) e.city = 'المدينة مطلوبة';
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      e.end_date = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية';
    }
    if (form.budget !== '' && Number(form.budget) < 0) {
      e.budget = 'الميزانية يجب أن تكون رقماً موجباً';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* -------------------------------------------------------------
   * Save — PATCH /api/projects/:id
   * Send only the editable fields. BE manages user_id, status,
   * progress, partner_id, timestamps.
   * ----------------------------------------------------------- */
  const handleSave = async () => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        // arena stays editable in case the user wants to re-target.
        // BE allows it but enforces postableBy on the server side.
        arena: form.arena,
        city: form.city,
        description: form.description || null,
        scope: form.scope || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        expected_duration: form.expected_duration || null,
        budget: form.budget === '' ? null : Number(form.budget),
        experience: form.experience || null,
        required_documents: form.required_documents || null,
        is_started_externally: !!form.is_started_externally,
        requirements: form.requirements,
      };
      await projectsApi.update(id, payload);
      navigate(`/projects/${id}`);
    } catch (err) {
      setSubmitError(err.message || 'تعذّر حفظ التعديلات. حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------------------------------------------
   * Files — upload + delete live
   * ----------------------------------------------------------- */
  const handleUploadNew = async () => {
    if (pendingUploads.length === 0) return;
    setFileError('');
    for (let i = 0; i < pendingUploads.length; i++) {
      setUploadingIdx(i);
      try {
        const uploaded = await projectsApi.uploadFile(id, pendingUploads[i]);
        setExistingFiles((prev) => [...prev, uploaded]);
      } catch (err) {
        setFileError(
          err.message || `تعذّر رفع الملف "${pendingUploads[i].name}".`
        );
        // Stop the loop on error; the user can retry the rest.
        setUploadingIdx(null);
        return;
      }
    }
    setUploadingIdx(null);
    setPendingUploads([]);
  };

  const handleDeleteExisting = async (fileId) => {
    setFileError('');
    const snapshot = existingFiles;
    // Optimistic removal.
    setExistingFiles(snapshot.filter((f) => f.id !== fileId));
    try {
      await projectsApi.removeFile(id, fileId);
    } catch (err) {
      setExistingFiles(snapshot);
      setFileError(err.message || 'تعذّر حذف الملف.');
    }
  };

  if (!form) return null; // shouldn't happen after loading guard

  return (
    <Shell>
      <header
        className="sticky top-0 z-40 bg-white"
        style={{ borderBottom: '1px solid #e5e3dc' }}
      >
        <div className="max-w-[860px] mx-auto px-6 lg:px-10 h-[96px] flex items-center justify-between">
          <Logo height={68} />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/projects/${id}`)}
              aria-label="إلغاء التعديل"
              className="inline-flex items-center justify-center transition-colors"
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

      <main className="py-8 lg:py-12" style={{ background: '#fafaf6' }}>
        <div className="max-w-[860px] mx-auto px-6 lg:px-10">
          {/* Title */}
          <div className="mb-8 animate-fade-up">
            <div
              className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(44,47,124,0.08)',
                color: '#1f2258',
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              <Save size={12} />
              تعديل المشروع
            </div>
            <h1
              className="font-display text-ink m-0 mb-2"
              style={{
                fontSize: 'clamp(26px, 3.4vw, 36px)',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
              }}
            >
              {project.name}
            </h1>
            <p
              className="text-muted m-0"
              style={{ fontSize: 14, lineHeight: 1.7 }}
            >
              الحالة والتقدّم تُدار تلقائيّاً من الخادم — لا يمكن تعديلها من هنا.
              الساحة الحالية: <strong>{arenaLabel(form.arena)}</strong>.
            </p>
          </div>

          {submitError && (
            <Banner kind="error">
              <AlertCircle
                size={17}
                strokeWidth={1.8}
                className="flex-shrink-0 mt-0.5"
              />
              {submitError}
            </Banner>
          )}

          {/* ===== Section 1: details ===== */}
          <Card title="تفاصيل المشروع">
            <div className="flex flex-col gap-5">
              <Field
                label="اسم المشروع"
                icon={FileText}
                placeholder="مثال: تجديد فيلا في حي النخيل"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                error={errors.name}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <SelectField
                  label="نوع المشروع"
                  icon={Tag}
                  options={PROJECT_TYPES}
                  value={form.type}
                  onChange={(e) => update('type', e.target.value)}
                  error={errors.type}
                  placeholder="اختر النوع"
                />
                <SelectField
                  label="المدينة"
                  icon={MapPin}
                  options={CITIES}
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  error={errors.city}
                  placeholder="اختر المدينة"
                />
              </div>

              <TextareaField
                label="وصف المشروع"
                rows={5}
                placeholder="اكتب وصفاً مفصّلاً عن مشروعك..."
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </div>
          </Card>

          {/* ===== Section 2: scope, dates, budget ===== */}
          <Card title="النطاق والميزانية">
            <div className="flex flex-col gap-5">
              <TextareaField
                label="نطاق العمل"
                rows={4}
                placeholder="ما الذي يشمله المشروع تحديداً؟"
                value={form.scope}
                onChange={(e) => update('scope', e.target.value)}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="تاريخ البداية"
                  icon={Calendar}
                  type="date"
                  value={form.start_date}
                  onChange={(e) => update('start_date', e.target.value)}
                />
                <Field
                  label="تاريخ الانتهاء"
                  icon={Calendar}
                  type="date"
                  value={form.end_date}
                  onChange={(e) => update('end_date', e.target.value)}
                  error={errors.end_date}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <SelectField
                  label="المدّة المتوقّعة"
                  icon={Clock}
                  options={PROJECT_DURATIONS}
                  value={form.expected_duration}
                  onChange={(e) => update('expected_duration', e.target.value)}
                  placeholder="اختر المدّة"
                />
                <Field
                  label="الميزانية (ر.س)"
                  icon={Wallet}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder="مثال: 250000"
                  value={form.budget}
                  onChange={(e) => update('budget', e.target.value)}
                  error={errors.budget}
                />
              </div>

              <SelectField
                label="الخبرة المطلوبة"
                icon={Award}
                options={EXPERIENCE_LEVELS}
                value={form.experience}
                onChange={(e) => update('experience', e.target.value)}
                placeholder="اختر مستوى الخبرة"
              />
            </div>
          </Card>

          {/* ===== Section 3: requirements + docs + external flag ===== */}
          <Card title="المتطلبات والوثائق">
            <div className="flex flex-col gap-7">
              <section>
                <SectionHeader
                  icon={ListChecks}
                  title="متطلّبات المشروع"
                  subtitle="الوثائق والشهادات المطلوبة من مقدّم الخدمة."
                />
                <RequirementsList
                  items={form.requirements}
                  onChange={(next) => update('requirements', next)}
                  suggestions={REQUIREMENT_SUGGESTIONS}
                />
              </section>

              <div style={{ borderTop: '1px solid #efece4' }} />

              <section>
                <SectionHeader
                  icon={FileBadge}
                  title="المستندات المطلوبة"
                  subtitle="نص حرّ يصف الوثائق الرسميّة المطلوبة."
                />
                <TextareaField
                  label="الوثائق المطلوبة"
                  rows={3}
                  placeholder="مثال: سجل تجاري سعودي ساري، شهادة الزكاة، تأمين عمّال."
                  value={form.required_documents}
                  onChange={(e) => update('required_documents', e.target.value)}
                />
              </section>

              <div style={{ borderTop: '1px solid #efece4' }} />

              <section>
                <SectionHeader
                  icon={PlayCircle}
                  title="حالة المشروع"
                  subtitle="هل بدأ العمل بالفعل خارج منصّة تعاهد؟"
                />
                <ToggleRow
                  label="المشروع بدأ بالفعل خارج المنصّة"
                  desc="فعّل هذا الخيار إذا كنت تبحث عن شريك لإكمال مشروع قائم."
                  checked={form.is_started_externally}
                  onChange={(v) => update('is_started_externally', v)}
                />
              </section>
            </div>
          </Card>

          {/* ===== Section 4: files ===== */}
          <Card title="ملفات المشروع">
            <SectionHeader
              icon={Files}
              title="الملفات الحاليّة"
              subtitle="الملفات الموجودة على المشروع. الحذف نهائي ولا يمكن التراجع عنه."
            />

            {fileError && (
              <Banner kind="error">
                <AlertCircle
                  size={17}
                  strokeWidth={1.8}
                  className="flex-shrink-0 mt-0.5"
                />
                {fileError}
              </Banner>
            )}

            {existingFiles.length === 0 ? (
              <p className="text-muted m-0 mb-5" style={{ fontSize: 13 }}>
                لا توجد ملفات حالياً.
              </p>
            ) : (
              <ul className="m-0 p-0 mb-6 flex flex-col gap-2">
                {existingFiles.map((f) => (
                  <ExistingFileRow
                    key={f.id}
                    file={f}
                    onDelete={() => handleDeleteExisting(f.id)}
                  />
                ))}
              </ul>
            )}

            <div style={{ borderTop: '1px solid #efece4', paddingTop: 20 }}>
              <SectionHeader
                icon={UploadCloud}
                title="إضافة ملفات جديدة"
                subtitle="اختر الملفات ثم اضغط على زر الرفع."
              />
              <FilesUpload
                files={pendingUploads}
                onChange={(next) => setPendingUploads(next)}
              />

              {pendingUploads.length > 0 && (
                <button
                  type="button"
                  onClick={handleUploadNew}
                  disabled={uploadingIdx !== null}
                  className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold transition-all"
                  style={{
                    fontSize: 13.5,
                    background: '#136d4a',
                    border: '1px solid #136d4a',
                    cursor: uploadingIdx !== null ? 'wait' : 'pointer',
                    opacity: uploadingIdx !== null ? 0.7 : 1,
                    boxShadow: '0 6px 14px rgba(19,109,74,0.22)',
                  }}
                >
                  <UploadCloud size={15} strokeWidth={1.9} />
                  {uploadingIdx !== null
                    ? `جارٍ الرفع... (${uploadingIdx + 1}/${pendingUploads.length})`
                    : `رفع ${pendingUploads.length} ملف`}
                </button>
              )}
            </div>
          </Card>

          {/* Bottom action bar */}
          <div
            className="flex justify-between items-center mt-6 flex-wrap gap-3"
          >
            <button
              type="button"
              onClick={() => navigate(`/projects/${id}`)}
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
              type="button"
              onClick={handleSave}
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
              {submitting ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
              {!submitting && <Save size={15} />}
            </button>
          </div>
        </div>
      </main>
    </Shell>
  );
}

/* ============================================================
 *  Layout shell — handles its own background
 * ============================================================ */
function Shell({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#fafaf6' }}>
      {children}
    </div>
  );
}

/* ============================================================
 *  Reusable section card
 * ============================================================ */
function Card({ title, children }) {
  return (
    <section
      className="rounded-[18px] mb-6 animate-fade-up"
      style={{
        background: 'white',
        border: '1px solid #e5e3dc',
        boxShadow: '0 4px 14px rgba(15,17,41,0.04)',
      }}
    >
      <div
        className="px-6 lg:px-8 py-5"
        style={{ borderBottom: '1px solid #efece4' }}
      >
        <h2
          className="font-display text-ink m-0"
          style={{ fontSize: 16, fontWeight: 700 }}
        >
          {title}
        </h2>
      </div>
      <div className="px-6 lg:px-8 py-6">{children}</div>
    </section>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: 'rgba(44,47,124,0.08)',
          color: '#2c2f7c',
        }}
      >
        <Icon size={17} strokeWidth={1.7} />
      </div>
      <div>
        <h3
          className="font-display text-ink m-0"
          style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className="text-muted m-0 mt-1"
            style={{ fontSize: 12.5, lineHeight: 1.6 }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function Banner({ kind = 'error', children }) {
  const styles =
    kind === 'error'
      ? {
          background: 'rgba(185,28,28,0.06)',
          border: '1px solid rgba(185,28,28,0.18)',
          color: '#b91c1c',
        }
      : {
          background: 'rgba(19,109,74,0.06)',
          border: '1px solid rgba(19,109,74,0.18)',
          color: '#0d5538',
        };

  return (
    <div
      className="p-3.5 rounded-[11px] mb-5 flex items-start gap-2 animate-fade-up"
      style={{ ...styles, fontSize: 13.5 }}
    >
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="w-full text-right transition-all"
      style={{
        padding: '14px 16px',
        background: checked ? 'rgba(19,109,74,0.06)' : 'white',
        border: `1.5px solid ${checked ? '#136d4a' : '#e5e3dc'}`,
        borderRadius: 12,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <span
        aria-hidden
        className="flex-shrink-0"
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          background: checked ? '#136d4a' : '#cbcec9',
          position: 'relative',
          transition: 'background 0.18s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'white',
            transition: 'left 0.18s ease',
            boxShadow: '0 2px 6px rgba(15,17,41,0.18)',
          }}
        />
      </span>
      <span className="flex-1 min-w-0">
        <span
          className="font-display font-bold block"
          style={{ fontSize: 14, color: checked ? '#0d5538' : '#0f1129' }}
        >
          {label}
        </span>
        <span
          className="block"
          style={{ fontSize: 12.5, color: '#7a7a8c', lineHeight: 1.55, marginTop: 2 }}
        >
          {desc}
        </span>
      </span>
    </button>
  );
}

/* ============================================================
 *  Row for an existing (server-side) file
 * ============================================================ */
function ExistingFileRow({ file, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  const name =
    file.original_name ||
    file.file_path?.split('/').pop() ||
    file.url?.split('/').pop() ||
    `ملف #${file.id}`;
  const ext = name.split('.').pop()?.toLowerCase();
  const href = file.url || file.file_path;

  let Icon = FileText;
  let color = '#7a7a8c';
  let bg = '#f4f1e9';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    Icon = ImageIcon;
    color = '#2c2f7c';
    bg = 'rgba(44,47,124,0.08)';
  } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
    Icon = FileSpreadsheet;
    color = '#136d4a';
    bg = 'rgba(19,109,74,0.08)';
  } else if (ext === 'zip' || ext === 'rar') {
    Icon = FileArchive;
    color = '#3a3d99';
    bg = 'rgba(58,61,153,0.08)';
  } else if (ext === 'pdf') {
    color = '#b91c1c';
    bg = 'rgba(185,28,28,0.06)';
  }

  return (
    <li
      className="list-none flex items-center gap-3 px-4 py-3 rounded-[11px]"
      style={{ background: '#fafaf6', border: '1px solid #efece4' }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: bg,
          color,
        }}
      >
        <Icon size={16} strokeWidth={1.7} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="font-semibold truncate"
          style={{ fontSize: 13, color: '#0f1129' }}
        >
          {name}
        </div>
        {file.size_bytes != null && (
          <div style={{ fontSize: 11.5, color: '#7a7a8c', marginTop: 1 }}>
            {formatSize(file.size_bytes)}
          </div>
        )}
      </div>

      {confirming ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              onDelete();
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-white font-semibold transition-colors"
            style={{
              fontSize: 12,
              background: '#b91c1c',
              border: '1px solid #b91c1c',
              cursor: 'pointer',
            }}
          >
            <CheckCircle2 size={12} />
            تأكيد
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="inline-flex items-center px-3 py-1.5 rounded-[8px] font-semibold transition-colors"
            style={{
              fontSize: 12,
              background: 'white',
              border: '1px solid #e5e3dc',
              color: '#3a3a52',
              cursor: 'pointer',
            }}
          >
            تراجع
          </button>
        </div>
      ) : (
        <>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center transition-colors"
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: 'white',
                border: '1px solid #e5e3dc',
                color: '#3a3a52',
                flexShrink: 0,
                textDecoration: 'none',
              }}
              aria-label={`عرض ${name}`}
            >
              <FileText size={14} strokeWidth={1.8} />
            </a>
          )}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`حذف ${name}`}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: 'white',
              border: '1px solid #e5e3dc',
              color: '#7a7a8c',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(185,28,28,0.3)';
              e.currentTarget.style.color = '#b91c1c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e3dc';
              e.currentTarget.style.color = '#7a7a8c';
            }}
          >
            <Trash2 size={14} strokeWidth={1.8} />
          </button>
        </>
      )}
    </li>
  );
}

/* ============================================================
 *  States
 * ============================================================ */

function LoadingState() {
  return (
    <div className="max-w-[860px] mx-auto px-6 lg:px-10 py-12 animate-pulse">
      <div
        style={{
          height: 32,
          width: 240,
          background: '#efece4',
          borderRadius: 8,
          marginBottom: 28,
        }}
      />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 220,
            background: 'white',
            border: '1px solid #e5e3dc',
            borderRadius: 18,
            marginBottom: 20,
          }}
        />
      ))}
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
        تعذّر فتح صفحة التعديل
      </h2>
      <p
        className="text-muted m-0 mb-7"
        style={{ fontSize: 14, lineHeight: 1.7 }}
      >
        {message || 'المشروع غير موجود أو ليس لديك صلاحية الوصول إليه.'}
      </p>
      <button onClick={onBack} className="btn-primary" style={{ width: 'auto' }}>
        رجوع
      </button>
    </div>
  );
}

function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
