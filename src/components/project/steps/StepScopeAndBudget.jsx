import React from 'react';
import { Calendar, Clock, Award } from 'lucide-react';
import Field from '../../form/Field';
import SelectField from '../../form/SelectField';
import TextareaField from '../../form/TextareaField';
import {
  PROJECT_DURATIONS,
  EXPERIENCE_LEVELS,
} from '../../../config/projectConstants';
import { useTranslation } from '../../../i18n/LanguageContext';

export default function StepScopeAndBudget({ form, update, errors }) {
  const { t } = useTranslation();
  const k = 'projects.create.steps.scopeBudget';

  return (
    <div className="flex flex-col gap-7">
      <TextareaField
        label={t(`${k}.scopeLabel`)}
        rows={5}
        placeholder={t(`${k}.scopePlaceholder`)}
        value={form.scope}
        onChange={(e) => update('scope', e.target.value)}
        error={errors.scope}
        hint={t(`${k}.scopeHint`)}
      />

      <div>
        <SectionHeader
          title={t(`${k}.timelineTitle`)}
          subtitle={t(`${k}.timelineSubtitle`)}
        />

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field
            label={t(`${k}.startDate`)}
            icon={Calendar}
            type="date"
            value={form.start_date}
            onChange={(e) => update('start_date', e.target.value)}
            error={errors.start_date}
          />
          <Field
            label={t(`${k}.endDate`)}
            icon={Calendar}
            type="date"
            value={form.end_date}
            onChange={(e) => update('end_date', e.target.value)}
            error={errors.end_date}
          />
        </div>

        <SelectField
          label={t(`${k}.durationLabel`)}
          icon={Clock}
          options={PROJECT_DURATIONS}
          value={form.expected_duration}
          onChange={(e) => update('expected_duration', e.target.value)}
          placeholder={t(`${k}.durationPlaceholder`)}
        />
      </div>

      <div>
        <SectionHeader
          title={t(`${k}.budgetReqsTitle`)}
          subtitle={t(`${k}.budgetReqsSubtitle`)}
        />

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <BudgetField
            value={form.budget}
            onChange={(e) => update('budget', e.target.value)}
            error={errors.budget}
            t={t}
            kBase={k}
          />

          <SelectField
            label={t(`${k}.experienceLabel`)}
            icon={Award}
            options={EXPERIENCE_LEVELS}
            value={form.experience}
            onChange={(e) => update('experience', e.target.value)}
            placeholder={t(`${k}.experiencePlaceholder`)}
          />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div
      className="flex items-end justify-between mb-4 pb-3"
      style={{ borderBottom: '1px solid var(--border-soft)' }}
    >
      <div>
        <h3
          className="font-display m-0"
          style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-ink)' }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className="m-0 mt-1"
            style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function BudgetField({ value, onChange, error, t, kBase }) {
  return (
    <div className="animate-fade-up">
      <label className="field-label">{t(`${kBase}.budgetLabel`)}</label>
      <div className="flex gap-2">
        <span className="phone-cc">{t('common.currency')}</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder={t(`${kBase}.budgetPlaceholder`)}
          value={value}
          onChange={onChange}
          className={`field field-no-icon ${error ? 'error' : ''}`}
          style={{ flex: 1 }}
        />
      </div>
      {error && <p className="field-err">{error}</p>}
      {!error && <p className="field-hint">{t(`${kBase}.budgetHint`)}</p>}
    </div>
  );
}
