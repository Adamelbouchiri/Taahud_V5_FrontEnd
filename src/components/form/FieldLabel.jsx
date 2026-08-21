import React from 'react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  FieldLabel — a `.field-label` that can state whether the field
 *  is required.
 *  ----------------------------------------------------------------
 *  `required` is deliberately THREE-state:
 *
 *    true      → red asterisk
 *    false     → muted "(optional)"
 *    undefined → no marker at all
 *
 *  The undefined case matters: every existing caller that doesn't
 *  opt in keeps rendering exactly as it did. Only forms that want
 *  to make the required/optional split explicit pass the prop.
 *
 *  The marker carries an aria-label so screen readers hear a word
 *  rather than "asterisk" (and so the muted "(optional)" text isn't
 *  the only signal for sighted-but-colorblind users either).
 * ============================================================ */
export default function FieldLabel({ label, required, htmlFor }) {
  const { t } = useTranslation();
  if (label == null || label === '') return null;

  return (
    <label className="field-label" htmlFor={htmlFor}>
      {label}
      {required === true && (
        <span
          aria-label={t('form.requiredLabel')}
          title={t('form.requiredLabel')}
          style={{
            marginInlineStart: 4,
            color: 'var(--accent-danger)',
            fontWeight: 700,
          }}
        >
          *
        </span>
      )}
      {required === false && (
        <span
          style={{
            marginInlineStart: 6,
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-muted)',
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          {t('form.optionalLabel')}
        </span>
      )}
    </label>
  );
}
