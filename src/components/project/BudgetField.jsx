import React from 'react';
import { EyeOff } from 'lucide-react';
import FieldLabel from '../form/FieldLabel';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  BudgetField — number input with the SAR prefix pill.
 *  ----------------------------------------------------------------
 *  Sits with the required fields in the details section, not with
 *  scope/timeline, because budget is the one money field the BE still
 *  makes mandatory — grouping it with the other four required fields
 *  is what lets the form say "done, you can publish" after one block.
 *
 *  Its dictionary keys stay under `steps.scopeBudget` on purpose: the
 *  copy didn't change, only where the field renders. Moving the keys
 *  would churn four dictionaries for no user-visible gain.
 * ============================================================ */
export default function BudgetField({ value, onChange, error }) {
  const { t } = useTranslation();
  const k = 'projects.create.steps.scopeBudget';

  return (
    <div className="animate-fade-up">
      <FieldLabel label={t(`${k}.budgetLabel`)} required />
      <div className="flex gap-2">
        <span className="phone-cc">{t('common.currency')}</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder={t(`${k}.budgetPlaceholder`)}
          value={value}
          onChange={onChange}
          className={`field field-no-icon ${error ? 'error' : ''}`}
          style={{ flex: 1 }}
        />
      </div>
      {error && <p className="field-err">{error}</p>}
      {!error && <p className="field-hint">{t(`${k}.budgetHint`)}</p>}
      <p
        role="note"
        className="flex items-center gap-1.5 m-0 mt-2 rounded-[8px]"
        style={{
          padding: '6px 10px',
          fontSize: 12.5,
          lineHeight: 1.6,
          color: 'var(--text-brand)',
          background: 'rgba(44,47,124,0.06)',
          border: '1px solid rgba(44,47,124,0.14)',
        }}
      >
        <EyeOff size={14} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
        {t(`${k}.budgetPrivate`)}
      </p>
    </div>
  );
}
