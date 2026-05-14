import React, { useState } from 'react';
import { Plus, X, ListChecks } from 'lucide-react';

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
  const [draft, setDraft] = useState('');

  const add = (value) => {
    const v = (value ?? draft).trim();
    if (!v) return;
    if (items.some((x) => x.toLowerCase() === v.toLowerCase())) {
      // already exists — clear draft silently
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
      {/* Existing items */}
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
                style={{ fontSize: 13.5, color: '#0f1129', lineHeight: 1.5 }}
              >
                {item}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`إزالة ${item}`}
                className="flex items-center justify-center transition-colors"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'transparent',
                  border: 'none',
                  color: '#7a7a8c',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#7a7a8c';
                }}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder="مثال: رخصة بناء سارية"
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
            background: draft.trim() ? '#2c2f7c' : '#efece4',
            color: draft.trim() ? 'white' : '#7a7a8c',
            border: `1px solid ${draft.trim() ? '#2c2f7c' : '#efece4'}`,
            cursor: draft.trim() ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap',
          }}
        >
          <Plus size={15} strokeWidth={2} />
          إضافة
        </button>
      </div>

      {items.length === 0 && (
        <p className="field-hint mt-2 flex items-center gap-1.5">
          <ListChecks size={12} />
          اضغط Enter بعد كل متطلب لإضافته للقائمة.
        </p>
      )}

      {/* Suggestion chips */}
      {unusedSuggestions.length > 0 && (
        <div className="mt-4">
          <div
            className="font-semibold uppercase mb-2"
            style={{
              fontSize: 10.5,
              letterSpacing: '0.1em',
              color: '#7a7a8c',
            }}
          >
            اقتراحات
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
                  background: 'white',
                  border: '1px solid #e5e3dc',
                  color: '#3a3a52',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#136d4a';
                  e.currentTarget.style.background = 'rgba(19,109,74,0.04)';
                  e.currentTarget.style.color = '#0d5538';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e3dc';
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = '#3a3a52';
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
