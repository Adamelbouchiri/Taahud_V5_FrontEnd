import React, { useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  ScopePicker — scope of work as a chip picker.
 *  ----------------------------------------------------------------
 *  Was a free-text textarea, which asked the client to write a spec
 *  before they had one; in practice it came back empty or as one word.
 *  The scope of almost every project on the platform is one (or a few)
 *  of five trade categories, so offer those as toggles — same shape as
 *  the requirement chips the user already meets on this form — and keep
 *  a single "other" escape hatch for anything outside the list.
 *
 *  The BE column is still a plain string, so the selection is joined
 *  into one comma-separated value. Selected keys / free text live in
 *  local state rather than being parsed back out of that string: the
 *  "other" text may itself contain commas, which makes the round-trip
 *  ambiguous. The component stays mounted for the life of the form, so
 *  local state is enough — hence write-only: it emits `scope` through
 *  onChange and never reads it back.
 * ============================================================ */

const SCOPE_OPTION_KEYS = [
  'execution',
  'finishing',
  'restoration',
  'electrical',
  'maintenance',
];

export default function ScopePicker({ onChange, error }) {
  const { t, lang } = useTranslation();
  const k = 'projects.create.steps.scopeBudget';

  const [selected, setSelected] = useState([]);
  const [otherOn, setOtherOn] = useState(false);
  const [otherText, setOtherText] = useState('');

  const options = SCOPE_OPTION_KEYS.map((key) => ({
    key,
    label: t(`${k}.scopeOptions.${key}`),
  }));

  const sep = lang === 'ar' || lang === 'ur' ? '، ' : ', ';

  /* Single place that composes the string the BE stores, so every
     handler below stays a one-liner. Option order follows the list,
     not click order — the value reads the same however it was built. */
  const emit = (nextSelected, nextOtherOn, nextOtherText) => {
    const parts = options
      .filter((o) => nextSelected.includes(o.key))
      .map((o) => o.label);
    const extra = nextOtherOn ? nextOtherText.trim() : '';
    if (extra) parts.push(extra);
    onChange(parts.join(sep));
  };

  const toggle = (key) => {
    const next = selected.includes(key)
      ? selected.filter((x) => x !== key)
      : [...selected, key];
    setSelected(next);
    emit(next, otherOn, otherText);
  };

  const toggleOther = () => {
    const next = !otherOn;
    setOtherOn(next);
    emit(selected, next, otherText);
  };

  const changeOtherText = (text) => {
    setOtherText(text);
    emit(selected, otherOn, text);
  };

  return (
    <div>
      {/* No label: the section card above is already titled "scope of
          work", so a field label here repeated it verbatim. The hint
          under the chips still says what to do with them. */}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <ScopeChip
            key={o.key}
            label={o.label}
            active={selected.includes(o.key)}
            onClick={() => toggle(o.key)}
          />
        ))}
        <ScopeChip
          label={t(`${k}.scopeOther`)}
          active={otherOn}
          icon={Pencil}
          onClick={toggleOther}
        />
      </div>

      {otherOn && (
        <input
          type="text"
          value={otherText}
          onChange={(e) => changeOtherText(e.target.value)}
          placeholder={t(`${k}.scopeOtherPlaceholder`)}
          aria-label={t(`${k}.scopeOther`)}
          className="field field-no-icon mt-3 animate-fade-up"
        />
      )}

      {error ? (
        <p className="field-err">{error}</p>
      ) : (
        <p className="field-hint mt-2">{t(`${k}.scopeHint`)}</p>
      )}
    </div>
  );
}

function ScopeChip({ label, active, onClick, icon: Icon = Check }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all"
      style={{
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        background: active ? 'rgba(19,109,74,0.08)' : 'var(--bg-surface)',
        border: `1.5px solid ${active ? '#136d4a' : 'var(--border-default)'}`,
        color: active ? '#0d5538' : 'var(--text-ink-soft)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (active) return;
        e.currentTarget.style.borderColor = 'var(--border-strong)';
        e.currentTarget.style.background = 'var(--bg-canvas)';
      }}
      onMouseLeave={(e) => {
        if (active) return;
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.background = 'var(--bg-surface)';
      }}
    >
      <Icon size={13} strokeWidth={2.2} style={{ opacity: active ? 1 : 0.45 }} />
      {label}
    </button>
  );
}
