import React, { useState } from 'react';
import { Plus, X, ListChecks } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

/**
 * Editable list of requirement strings.
 * Each item maps to a row in the `project_requirments` table.
 * Backend receives them as a flat string[] inside the create payload.
 */
export default function RequirementsList({
  items = [],
  onChange,
  suggestions = [],
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const add = (value) => {
    const v = (value ?? draft).trim();
    if (!v) return;
    if (items.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...items, v]);
    setDraft('');
  };

  const remove = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  };

  const unusedSuggestions = suggestions.filter(
    (s) => !items.some((x) => x.toLowerCase() === s.toLowerCase())
  );

  return (
    <div>
      {items.length > 0 && (
        <ul className="m-0 p-0 mb-3 flex flex-col gap-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="list-none flex items-center gap-3 px-4 py-3 rounded-[11px] animate-fade-up"
              style={{
                background: 'rgba(19,109,74,0.04)',
                border: '1px solid rgba(19,109,74,0.18)',
              }}
            >
              <span
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#136d4a',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ✓
              </span>
              <span
                className="flex-1 break-words"
                style={{
                  fontSize: 13.5,
                  color: 'var(--text-ink)',
                  lineHeight: 1.5,
                }}
              >
                {item}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={t('projects.requirements.removeAria', { item })}
                className="flex items-center justify-center transition-colors"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-surface)';
                  e.currentTarget.style.color = 'var(--accent-danger)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t('projects.requirements.placeholder')}
          className="field field-no-icon"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          onClick={() => add()}
          disabled={!draft.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-4 rounded-[11px] font-semibold transition-all"
          style={{
            fontSize: 13.5,
            background: draft.trim() ? '#2c2f7c' : 'var(--border-soft)',
            color: draft.trim() ? 'white' : 'var(--text-muted)',
            border: `1px solid ${draft.trim() ? '#2c2f7c' : 'var(--border-soft)'}`,
            cursor: draft.trim() ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap',
          }}
        >
          <Plus size={15} strokeWidth={2} />
          {t('projects.requirements.addCta')}
        </button>
      </div>

      {items.length === 0 && (
        <p className="field-hint mt-2 flex items-center gap-1.5">
          <ListChecks size={12} />
          {t('projects.requirements.hint')}
        </p>
      )}

      {unusedSuggestions.length > 0 && (
        <div className="mt-4">
          <div
            className="font-semibold uppercase mb-2"
            style={{
              fontSize: 10.5,
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
            }}
          >
            {t('projects.requirements.suggestionsTitle')}
          </div>
          <div className="flex flex-wrap gap-2">
            {unusedSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition-all"
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-ink-soft)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#136d4a';
                  e.currentTarget.style.background = 'rgba(19,109,74,0.04)';
                  e.currentTarget.style.color = '#0d5538';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.background = 'var(--bg-surface)';
                  e.currentTarget.style.color = 'var(--text-ink-soft)';
                }}
              >
                <Plus size={12} strokeWidth={2} />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
