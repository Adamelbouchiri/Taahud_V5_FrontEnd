import React from 'react';
import { Files, ListChecks, FileBadge, PlayCircle } from 'lucide-react';
import RequirementsList from '../RequirementsList';
import FilesUpload from '../FilesUpload';
import TextareaField from '../../form/TextareaField';
import { useTranslation } from '../../../i18n/LanguageContext';

/* Suggested requirements baked into the dictionary so they
 * translate alongside the rest of the wizard. Keys are stable
 * across languages; the displayed string comes from t(). */
const REQUIREMENT_SUGGESTION_KEYS = [
  'permit',
  'cityPlans',
  'insurance',
  'commercialReg',
  'safety',
  'execPlans',
  'samples',
];

/**
 * Step 3 of the create-project wizard.
 *
 * Adds to the create payload:
 *   - requirements (string[])       → server expands into project_requirments rows
 *   - files (File[])                → uploaded one-by-one AFTER project create
 *   - required_documents (string)   → free-form description of needed certificates
 *   - is_started_externally (bool)  → already in progress outside Taahud
 *
 * Everything in this step is optional.
 */
export default function StepFilesAndRequirements({ form, update }) {
  const { t } = useTranslation();
  const k = 'projects.create.steps.filesReqs';
  const suggestions = REQUIREMENT_SUGGESTION_KEYS.map((key) =>
    t(`projects.create.suggestions.${key}`)
  );

  return (
    <div className="flex flex-col gap-7">
      <section>
        <SectionHeader
          icon={ListChecks}
          title={t(`${k}.requirementsTitle`)}
          subtitle={t(`${k}.requirementsSubtitle`)}
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
          title={t(`${k}.documentsLabel`)}
          subtitle={t(`${k}.documentsHint`)}
        />
        <TextareaField
          label={t(`${k}.documentsLabel`)}
          rows={3}
          placeholder={t(`${k}.documentsPlaceholder`)}
          value={form.required_documents || ''}
          onChange={(e) => update('required_documents', e.target.value)}
          hint={t(`${k}.documentsHint`)}
        />
      </section>

      <div style={{ borderTop: '1px solid var(--border-soft)' }} />

      <section>
        <SectionHeader
          icon={Files}
          title={t(`${k}.filesTitle`)}
          subtitle={t(`${k}.filesSubtitle`)}
        />
        <FilesUpload
          files={form.files}
          onChange={(next) => update('files', next)}
        />
      </section>

      <div style={{ borderTop: '1px solid var(--border-soft)' }} />

      <section>
        <SectionHeader
          icon={PlayCircle}
          title={t(`${k}.startedExternallyTitle`)}
          subtitle={t(`${k}.startedExternallyDesc`)}
        />
        <ToggleRow
          label={t(`${k}.startedExternallyTitle`)}
          desc={t(`${k}.startedExternallyDesc`)}
          checked={!!form.is_started_externally}
          onChange={(v) => update('is_started_externally', v)}
        />
      </section>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'rgba(44,47,124,0.08)',
          color: 'var(--text-brand)',
        }}
      >
        <Icon size={18} strokeWidth={1.7} />
      </div>
      <div>
        <h3
          className="font-display m-0"
          style={{
            fontSize: 17,
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
              fontSize: 13,
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
