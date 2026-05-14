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
import LanguageThemeSwitcher from '../components/LanguageThemeSwitcher';
import Field from '../components/form/Field';
import SelectField from '../components/form/SelectField';
import TextareaField from '../components/form/TextareaField';
import RequirementsList from '../components/project/RequirementsList';
import FilesUpload from '../components/project/FilesUpload';
import {
  PROJECT_TYPES,
  PROJECT_DURATIONS,
  EXPERIENCE_LEVELS,
} from '../config/projectConstants';
import { CITIES } from '../config/constants';
import { projects as projectsApi } from '../services';
import { UserProvider, useUser } from '../contexts/UserContext';
import { useTranslation } from '../i18n/LanguageContext';

/* ============================================================
 *  EditProjectPage — /projects/:id/edit
 * ============================================================ */

const REQUIREMENT_SUGGESTION_KEYS = [
  'permit',
  'cityPlans',
  'insurance',
  'commercialReg',
  'safety',
  'execPlans',
  'samples',
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
  const { t } = useTranslation();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [existingFiles, setExistingFiles] = useState([]);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [fileError, setFileError] = useState('');

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
        if (!cancelled) setLoadError(err.message || t('projects.edit.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  if (loading) return <Shell><LoadingState /></Shell>;
  if (loadError || !project)
    return (
      <Shell>
        <ErrorState message={loadError} onBack={() => navigate(-1)} />
      </Shell>
    );

  const isOwner = user && project.user_id === user.id;
  if (user && !isOwner) {
    return (
      <Shell>
        <ErrorState
          message={t('projects.edit.notOwnerError')}
          onBack={() => navigate(`/projects/${id}`)}
        />
      </Shell>
    );
  }

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = t('projects.create.validate.name');
    if (!form.type) e.type = t('projects.create.validate.type');
    if (!form.city) e.city = t('projects.create.validate.city');
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      e.end_date = t('projects.create.validate.dateOrder');
    }
    if (form.budget !== '' && Number(form.budget) < 0) {
      e.budget = t('projects.create.validate.budgetPositive');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

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
      setSubmitError(err.message || t('projects.edit.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

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
          err.message ||
            t('projects.edit.fileUploadError', { name: pendingUploads[i].name })
        );
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
    setExistingFiles(snapshot.filter((f) => f.id !== fileId));
    try {
      await projectsApi.removeFile(id, fileId);
    } catch (err) {
      setExistingFiles(snapshot);
      setFileError(err.message || t('projects.edit.fileDeleteError'));
    }
  };

  if (!form) return null;

  const suggestions = REQUIREMENT_SUGGESTION_KEYS.map((key) =>
    t(`projects.create.suggestions.${key}`)
  );

  return (
    <Shell>
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div className="max-w-[860px] mx-auto px-6 lg:px-10 h-[96px] flex items-center justify-between">
          <Logo height={68} />

          <div className="flex items-center gap-2">
            <LanguageThemeSwitcher compact />
            <button
              type="button"
              onClick={() => navigate(`/projects/${id}`)}
              aria-label={t('projects.edit.cancelAria')}
              className="inline-flex items-center justify-center transition-colors"
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

      <main
        className="py-8 lg:py-12"
        style={{ background: 'var(--bg-canvas)' }}
      >
        <div className="max-w-[860px] mx-auto px-6 lg:px-10">
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
              {t('projects.edit.eyebrow')}
            </div>
            <h1
              className="font-display m-0 mb-2"
              style={{
                fontSize: 'clamp(26px, 3.4vw, 36px)',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                color: 'var(--text-ink)',
              }}
            >
              {project.name}
            </h1>
            <p
              className="m-0"
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: 'var(--text-muted)',
              }}
            >
              {t('projects.edit.subtitlePrefix')}
              <strong style={{ color: 'var(--text-ink)' }}>
                {t(`arena.${form.arena}.label`)}
              </strong>
              {t('projects.edit.subtitleSuffix')}
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

          <Card title={t('projects.edit.sections.details')}>
            <div className="flex flex-col gap-5">
              <Field
                label={t('projects.create.steps.details.nameLabel')}
                icon={FileText}
                placeholder={t('projects.create.steps.details.namePlaceholder')}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                error={errors.name}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <SelectField
                  label={t('projects.create.steps.details.typeLabel')}
                  icon={Tag}
                  options={PROJECT_TYPES}
                  value={form.type}
                  onChange={(e) => update('type', e.target.value)}
                  error={errors.type}
                  placeholder={t('projects.create.steps.details.typePlaceholder')}
                />
                <SelectField
                  label={t('projects.create.steps.details.cityLabel')}
                  icon={MapPin}
                  options={CITIES}
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  error={errors.city}
                  placeholder={t('projects.create.steps.details.cityPlaceholder')}
                />
              </div>

              <TextareaField
                label={t('projects.create.steps.details.descriptionLabel')}
                rows={5}
                placeholder={t('projects.edit.descriptionPlaceholder')}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </div>
          </Card>

          <Card title={t('projects.edit.sections.scopeBudget')}>
            <div className="flex flex-col gap-5">
              <TextareaField
                label={t('projects.create.steps.scopeBudget.scopeLabel')}
                rows={4}
                placeholder={t('projects.edit.scopePlaceholder')}
                value={form.scope}
                onChange={(e) => update('scope', e.target.value)}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label={t('projects.create.steps.scopeBudget.startDate')}
                  icon={Calendar}
                  type="date"
                  value={form.start_date}
                  onChange={(e) => update('start_date', e.target.value)}
                />
                <Field
                  label={t('projects.create.steps.scopeBudget.endDate')}
                  icon={Calendar}
                  type="date"
                  value={form.end_date}
                  onChange={(e) => update('end_date', e.target.value)}
                  error={errors.end_date}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <SelectField
                  label={t('projects.create.steps.scopeBudget.durationLabel')}
                  icon={Clock}
                  options={PROJECT_DURATIONS}
                  value={form.expected_duration}
                  onChange={(e) => update('expected_duration', e.target.value)}
                  placeholder={t(
                    'projects.create.steps.scopeBudget.durationPlaceholder'
                  )}
                />
                <Field
                  label={t('projects.edit.budgetLabel', {
                    currency: t('common.currency'),
                  })}
                  icon={Wallet}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder={t('projects.edit.budgetPlaceholder')}
                  value={form.budget}
                  onChange={(e) => update('budget', e.target.value)}
                  error={errors.budget}
                />
              </div>

              <SelectField
                label={t('projects.create.steps.scopeBudget.experienceLabel')}
                icon={Award}
                options={EXPERIENCE_LEVELS}
                value={form.experience}
                onChange={(e) => update('experience', e.target.value)}
                placeholder={t(
                  'projects.create.steps.scopeBudget.experiencePlaceholder'
                )}
              />
            </div>
          </Card>

          <Card title={t('projects.edit.sections.requirements')}>
            <div className="flex flex-col gap-7">
              <section>
                <SectionHeader
                  icon={ListChecks}
                  title={t('projects.edit.requirementsBlock.title')}
                  subtitle={t('projects.edit.requirementsBlock.subtitle')}
                />
                <RequirementsList
                  items={form.requirements}
                  onChange={(next) => update('requirements', next)}
                  suggestions={suggestions}
                />
              </section>

              <div style={{ borderTop: '1px solid var(--border-soft)' }} />

              <section>
                <SectionHeader
                  icon={FileBadge}
                  title={t('projects.edit.documentsBlock.title')}
                  subtitle={t('projects.edit.documentsBlock.subtitle')}
                />
                <TextareaField
                  label={t('projects.edit.documentsBlock.title')}
                  rows={3}
                  placeholder={t('projects.edit.documentsBlock.placeholder')}
                  value={form.required_documents}
                  onChange={(e) => update('required_documents', e.target.value)}
                />
              </section>

              <div style={{ borderTop: '1px solid var(--border-soft)' }} />

              <section>
                <SectionHeader
                  icon={PlayCircle}
                  title={t('projects.edit.statusBlock.title')}
                  subtitle={t('projects.edit.statusBlock.subtitle')}
                />
                <ToggleRow
                  label={t('projects.edit.statusBlock.toggleLabel')}
                  desc={t('projects.edit.statusBlock.toggleDesc')}
                  checked={form.is_started_externally}
                  onChange={(v) => update('is_started_externally', v)}
                />
              </section>
            </div>
          </Card>

          <Card title={t('projects.edit.sections.files')}>
            <SectionHeader
              icon={Files}
              title={t('projects.edit.filesBlock.currentTitle')}
              subtitle={t('projects.edit.filesBlock.currentSubtitle')}
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
              <p
                className="m-0 mb-5"
                style={{ fontSize: 13, color: 'var(--text-muted)' }}
              >
                {t('projects.edit.filesBlock.empty')}
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

            <div
              style={{
                borderTop: '1px solid var(--border-soft)',
                paddingTop: 20,
              }}
            >
              <SectionHeader
                icon={UploadCloud}
                title={t('projects.edit.filesBlock.addTitle')}
                subtitle={t('projects.edit.filesBlock.addSubtitle')}
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
                    ? t('projects.edit.filesBlock.uploadingProgress', {
                        current: uploadingIdx + 1,
                        total: pendingUploads.length,
                      })
                    : t('projects.edit.filesBlock.uploadCta', {
                        count: pendingUploads.length,
                      })}
                </button>
              )}
            </div>
          </Card>

          <div className="flex justify-between items-center mt-6 flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(`/projects/${id}`)}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-[10px] font-semibold transition-all"
              style={{
                fontSize: 14,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              <ArrowRight size={16} />
              {t('projects.edit.cancelCta')}
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
              {submitting
                ? t('projects.edit.savingCta')
                : t('projects.edit.saveCta')}
              {!submitting && <Save size={15} />}
            </button>
          </div>
        </div>
      </main>
    </Shell>
  );
}

/* ============================================================
 *  Shell
 * ============================================================ */
function Shell({ children }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-canvas)' }}
    >
      {children}
    </div>
  );
}

/* ============================================================
 *  Card
 * ============================================================ */
function Card({ title, children }) {
  return (
    <section
      className="rounded-[18px] mb-6 animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        className="px-6 lg:px-8 py-5"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        <h2
          className="font-display m-0"
          style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-ink)' }}
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
          className="font-display m-0"
          style={{
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.3,
            color: 'var(--text-ink)',
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className="m-0 mt-1"
            style={{
              fontSize: 12.5,
              lineHeight: 1.6,
              color: 'var(--text-muted)',
            }}
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
          color: 'var(--accent-danger)',
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
      className="w-full text-start transition-all"
      style={{
        padding: '14px 16px',
        background: checked ? 'rgba(19,109,74,0.06)' : 'var(--bg-surface)',
        border: `1.5px solid ${checked ? '#136d4a' : 'var(--border-default)'}`,
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
          style={{
            fontSize: 14,
            color: checked ? '#0d5538' : 'var(--text-ink)',
          }}
        >
          {label}
        </span>
        <span
          className="block"
          style={{
            fontSize: 12.5,
            color: 'var(--text-muted)',
            lineHeight: 1.55,
            marginTop: 2,
          }}
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
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);

  const name =
    file.original_name ||
    file.file_path?.split('/').pop() ||
    file.url?.split('/').pop() ||
    t('projects.edit.fileFallback', { id: file.id });
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
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-soft)',
      }}
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
          style={{ fontSize: 13, color: 'var(--text-ink)' }}
        >
          {name}
        </div>
        {file.size_bytes != null && (
          <div
            style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}
          >
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
            {t('projects.edit.filesBlock.confirmDelete')}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="inline-flex items-center px-3 py-1.5 rounded-[8px] font-semibold transition-colors"
            style={{
              fontSize: 12,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-ink-soft)',
              cursor: 'pointer',
            }}
          >
            {t('projects.edit.filesBlock.cancelDelete')}
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
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
                flexShrink: 0,
                textDecoration: 'none',
              }}
              aria-label={t('projects.edit.filesBlock.viewAria', { name })}
            >
              <FileText size={14} strokeWidth={1.8} />
            </a>
          )}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={t('projects.edit.filesBlock.deleteAria', { name })}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(185,28,28,0.3)';
              e.currentTarget.style.color = 'var(--accent-danger)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.color = 'var(--text-muted)';
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
          background: 'var(--border-soft)',
          borderRadius: 8,
          marginBottom: 28,
        }}
      />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 220,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 18,
            marginBottom: 24,
          }}
        />
      ))}
    </div>
  );
}

function ErrorState({ message, onBack }) {
  const { t } = useTranslation();
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
        className="font-display m-0 mb-2"
        style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-ink)' }}
      >
        {t('projects.details.loadErrorTitle')}
      </h2>
      <p
        className="m-0 mb-7"
        style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {message || t('projects.details.loadErrorFallback')}
      </p>
      <button onClick={onBack} className="btn-primary" style={{ width: 'auto' }}>
        {t('projects.details.back')}
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
