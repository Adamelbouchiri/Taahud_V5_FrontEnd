import React from 'react';
import {
  Edit2,
  CheckCircle2,
  Info,
  ListChecks,
  FileText,
} from 'lucide-react';
import { useTranslation } from '../../../i18n/LanguageContext';

/**
 * Final step — read-only review of all entered data with edit-jump
 * buttons per section. The customer reviews everything before
 * submitting. After submit, files are uploaded one-by-one.
 */
export default function StepReview({ form, onJumpToStep }) {
  const { t, lang } = useTranslation();
  const k = 'projects.create.steps.review';

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex gap-3 p-4 rounded-[12px]"
        style={{
          background: 'rgba(44,47,124,0.04)',
          border: '1px solid rgba(44,47,124,0.12)',
        }}
      >
        <Info
          size={18}
          strokeWidth={1.7}
          className="flex-shrink-0 mt-0.5"
          style={{ color: '#2c2f7c' }}
        />
        <div>
          <p
            className="m-0 mb-1"
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--text-ink)',
            }}
          >
            {t(`${k}.explainerTitle`)}
          </p>
          <p
            className="m-0"
            style={{
              fontSize: 13,
              color: 'var(--text-ink-soft)',
              lineHeight: 1.7,
            }}
          >
            {t(`${k}.explainerBody`)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3
            className="font-display m-0"
            style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-ink)' }}
          >
            {t(`${k}.headTitle`)}
          </h3>
          <p
            className="m-0 mt-1"
            style={{ fontSize: 13, color: 'var(--text-muted)' }}
          >
            {t(`${k}.headSubtitle`)}
          </p>
        </div>
        <CheckCircle2 size={22} style={{ color: '#136d4a' }} />
      </div>

      <ReviewBlock
        title={t(`${k}.sectionDetails`)}
        onEdit={() => onJumpToStep(0)}
        rows={[
          {
            label: t(`${k}.arenaField`),
            value: form.arena ? t(`arena.${form.arena}.label`) : '',
          },
          { label: t(`${k}.nameField`), value: form.name },
          { label: t(`${k}.typeField`), value: form.type },
          { label: t(`${k}.cityField`), value: form.city },
          { label: t(`${k}.descriptionField`), value: form.description, full: true },
        ]}
      />

      <ReviewBlock
        title={t(`${k}.sectionScope`)}
        onEdit={() => onJumpToStep(1)}
        rows={[
          { label: t(`${k}.scopeField`), value: form.scope, full: true },
          { label: t(`${k}.startDateField`), value: form.start_date },
          { label: t(`${k}.endDateField`), value: form.end_date },
          { label: t(`${k}.durationField`), value: form.expected_duration },
          {
            label: t(`${k}.budgetField`),
            value: form.budget
              ? `${formatNumber(form.budget, lang)} ${t('common.currency')}`
              : '',
          },
          { label: t(`${k}.experienceField`), value: form.experience },
        ]}
      />

      <FilesAndRequirementsBlock
        requirements={form.requirements}
        files={form.files}
        requiredDocuments={form.required_documents}
        isStartedExternally={form.is_started_externally}
        onEdit={() => onJumpToStep(2)}
      />
    </div>
  );
}

function ReviewBlock({ title, rows, onEdit }) {
  const { t } = useTranslation();
  const visibleRows = rows.filter((r) => r.value);

  return (
    <div
      className="rounded-[14px]"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        <h4
          className="font-display m-0"
          style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-ink)' }}
        >
          {title}
        </h4>
        <button
          type="button"
          onClick={onEdit}
          className="link inline-flex items-center gap-1.5 cursor-pointer bg-transparent border-0 p-0"
          style={{ fontSize: 12.5 }}
        >
          <Edit2 size={12} />
          {t('projects.create.steps.review.editStep')}
        </button>
      </div>

      <div className="px-5 py-4">
        {visibleRows.length === 0 ? (
          <p
            className="m-0"
            style={{ fontSize: 13, color: 'var(--text-muted)' }}
          >
            {t('projects.create.steps.review.emptyBlock')}
          </p>
        ) : (
          <dl className="m-0 grid sm:grid-cols-2 gap-x-6 gap-y-3.5">
            {visibleRows.map((r) => (
              <div
                key={r.label}
                style={r.full ? { gridColumn: '1 / -1' } : undefined}
              >
                <dt
                  className="font-medium uppercase mb-1"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                  }}
                >
                  {r.label}
                </dt>
                <dd
                  className="m-0"
                  style={{
                    fontSize: 13.5,
                    color: 'var(--text-ink)',
                    lineHeight: 1.6,
                  }}
                >
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

function FilesAndRequirementsBlock({
  requirements = [],
  files = [],
  requiredDocuments = '',
  isStartedExternally = false,
  onEdit,
}) {
  const { t } = useTranslation();
  const k = 'projects.create.steps.review';
  const isEmpty =
    requirements.length === 0 &&
    files.length === 0 &&
    !requiredDocuments &&
    !isStartedExternally;

  return (
    <div
      className="rounded-[14px]"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        <h4
          className="font-display m-0"
          style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-ink)' }}
        >
          {t(`${k}.sectionFiles`)}
        </h4>
        <button
          type="button"
          onClick={onEdit}
          className="link inline-flex items-center gap-1.5 cursor-pointer bg-transparent border-0 p-0"
          style={{ fontSize: 12.5 }}
        >
          <Edit2 size={12} />
          {t(`${k}.editStep`)}
        </button>
      </div>

      <div className="px-5 py-4">
        {isEmpty ? (
          <p
            className="m-0"
            style={{ fontSize: 13, color: 'var(--text-muted)' }}
          >
            {t(`${k}.emptyFilesReqs`)}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <div
                className="font-medium uppercase mb-3 flex items-center gap-1.5"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                }}
              >
                <ListChecks size={12} />
                {t(`${k}.reqsHeading`, { count: requirements.length })}
              </div>
              {requirements.length > 0 ? (
                <ul className="m-0 p-0 space-y-1.5">
                  {requirements.map((r, i) => (
                    <li
                      key={i}
                      className="list-none flex items-start gap-2"
                      style={{
                        fontSize: 13,
                        color: 'var(--text-ink)',
                        lineHeight: 1.55,
                      }}
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
                      {r}
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  className="m-0"
                  style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
                >
                  {t(`${k}.noRequirements`)}
                </p>
              )}
            </div>

            <div>
              <div
                className="font-medium uppercase mb-3 flex items-center gap-1.5"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                }}
              >
                <FileText size={12} />
                {t(`${k}.filesHeading`, { count: files.length })}
              </div>
              {files.length > 0 ? (
                <ul className="m-0 p-0 space-y-1.5">
                  {files.map((f, i) => (
                    <li
                      key={i}
                      className="list-none flex items-center justify-between gap-2"
                      style={{
                        fontSize: 13,
                        color: 'var(--text-ink)',
                        lineHeight: 1.55,
                      }}
                    >
                      <span className="truncate">{f.name}</span>
                      <span
                        className="flex-shrink-0"
                        style={{ fontSize: 11.5, color: 'var(--text-muted)' }}
                      >
                        {formatSize(f.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  className="m-0"
                  style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
                >
                  {t(`${k}.noFiles`)}
                </p>
              )}
            </div>

            {requiredDocuments && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div
                  className="font-medium uppercase mb-2"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                  }}
                >
                  {t(`${k}.requiredDocsHeading`)}
                </div>
                <p
                  className="m-0"
                  style={{
                    fontSize: 13,
                    color: 'var(--text-ink)',
                    lineHeight: 1.65,
                  }}
                >
                  {requiredDocuments}
                </p>
              </div>
            )}

            {isStartedExternally && (
              <div style={{ gridColumn: '1 / -1' }}>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full font-semibold"
                  style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    background: 'rgba(19,109,74,0.08)',
                    color: '#0d5538',
                    border: '1px solid rgba(19,109,74,0.18)',
                  }}
                >
                  <CheckCircle2 size={12} />
                  {t(`${k}.startedExternallyBadge`)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function localeFor(lang) {
  if (lang === 'en') return 'en-US';
  if (lang === 'zh') return 'zh-CN';
  return 'ar-SA';
}

function formatNumber(n, lang) {
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return n;
  return new Intl.NumberFormat(localeFor(lang)).format(num);
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
