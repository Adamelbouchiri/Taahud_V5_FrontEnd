import React from 'react';
import { Calendar, Clock, Award } from 'lucide-react';
import Field from '../../form/Field';
import SelectField from '../../form/SelectField';
import ScopePicker from '../ScopePicker';
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
      {/* Scope used to be a textarea. It's a fixed set of trades in
          practice, so it's a chip picker now — see ScopePicker. */}
      <ScopePicker
        onChange={(val) => update('scope', val)}
        error={errors.scope}
      />

      <div>
        <SectionHeader
          title={t(`${k}.timelineTitle`)}
          subtitle={t(`${k}.timelineSubtitle`)}
        />

        {/* End date was dropped from this form: the client rarely knows
            it up front, and the expected duration next to it answers the
            same question without asking them to guess a date. */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label={t(`${k}.startDate`)}
            icon={Calendar}
            type="date"
            required={false}
            value={form.start_date}
            onChange={(e) => update('start_date', e.target.value)}
            error={errors.start_date}
          />

          <SelectField
            label={t(`${k}.durationLabel`)}
            icon={Clock}
            required={false}
            options={PROJECT_DURATIONS}
            value={form.expected_duration}
            onChange={(e) => update('expected_duration', e.target.value)}
            placeholder={t(`${k}.durationPlaceholder`)}
          />
        </div>
      </div>

      {/* Budget used to share this group. It moved up to the details
          section (the required block) — what's left here is experience,
          which is optional like everything else below. */}
      <div>
        <SectionHeader
          title={t(`${k}.experienceTitle`)}
          subtitle={t(`${k}.experienceSubtitle`)}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField
            label={t(`${k}.experienceLabel`)}
            icon={Award}
            required={false}
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

