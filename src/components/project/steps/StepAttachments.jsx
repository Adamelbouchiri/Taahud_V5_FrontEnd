import React from 'react';
import FilesUpload from '../FilesUpload';
import { useTranslation } from '../../../i18n/LanguageContext';

/**
 * Third section of the single-page create-project form.
 *
 * Adds to the create payload:
 *   - files (File[])                → uploaded one-by-one AFTER project create
 *   - is_started_externally (bool)  → already in progress outside Taahud
 *
 * Was StepFilesAndRequirements: the requirements list and the
 * required-documents textarea were removed from the client-facing create
 * form (both asked the client to write a spec they don't have yet — what
 * they can answer is now covered by the scope chips in section 2). Both
 * fields still exist on the project and are still editable from the edit
 * and admin forms.
 *
 * No headings in here: the section card above already carries the
 * "المرفقات" title and its description, and the toggle below labels
 * itself — repeating either printed the same sentence twice on screen.
 *
 * Everything in this step is optional.
 */
export default function StepAttachments({ form, update }) {
  const { t } = useTranslation();
  const k = 'projects.create.steps.filesReqs';

  return (
    <div className="flex flex-col gap-7">
      <FilesUpload
        files={form.files}
        onChange={(next) => update('files', next)}
      />

      <div style={{ borderTop: '1px solid var(--border-soft)' }} />

      <ToggleRow
        label={t(`${k}.startedExternallyTitle`)}
        desc={t(`${k}.startedExternallyDesc`)}
        checked={!!form.is_started_externally}
        onChange={(v) => update('is_started_externally', v)}
      />
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
