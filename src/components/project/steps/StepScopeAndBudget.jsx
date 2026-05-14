import React from 'react';
import {
  Calendar,
  Clock,
  Award,
} from 'lucide-react';
import Field from '../../form/Field';
import SelectField from '../../form/SelectField';
import TextareaField from '../../form/TextareaField';
import {
  PROJECT_DURATIONS,
  EXPERIENCE_LEVELS,
} from '../../../config/projectConstants';

export default function StepScopeAndBudget({ form, update, errors }) {
  return (
    <div className="flex flex-col gap-7">
      {/* Scope */}
      <TextareaField
        label="نطاق العمل"
        rows={5}
        placeholder="حدّد بالتفصيل نطاق العمل المطلوب، المراحل، والنتائج المتوقعة..."
        value={form.scope}
        onChange={(e) => update('scope', e.target.value)}
        error={errors.scope}
        hint="كلّما كان النطاق أوضح، كانت العروض أدقّ."
      />

      {/* Timeline section */}
      <div>
        <SectionHeader
          title="الجدول الزمني"
          subtitle="حدّد تواريخ البداية والنهاية أو المدة المتوقعة"
        />

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field
            label="تاريخ البداية"
            icon={Calendar}
            type="date"
            value={form.start_date}
            onChange={(e) => update('start_date', e.target.value)}
            error={errors.start_date}
          />
          <Field
            label="تاريخ الانتهاء"
            icon={Calendar}
            type="date"
            value={form.end_date}
            onChange={(e) => update('end_date', e.target.value)}
            error={errors.end_date}
          />
        </div>

        <SelectField
          label="المدة المتوقعة"
          icon={Clock}
          options={PROJECT_DURATIONS}
          value={form.expected_duration}
          onChange={(e) => update('expected_duration', e.target.value)}
          placeholder="اختر المدة"
        />
      </div>

      {/* Budget & requirements section */}
      <div>
        <SectionHeader
          title="الميزانية والمتطلبات"
          subtitle="بياناتٌ تساعد الشركاء على تقديم عروض دقيقة"
        />

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <BudgetField
            value={form.budget}
            onChange={(e) => update('budget', e.target.value)}
            error={errors.budget}
          />

          <SelectField
            label="الخبرة المطلوبة"
            icon={Award}
            options={EXPERIENCE_LEVELS}
            value={form.experience}
            onChange={(e) => update('experience', e.target.value)}
            placeholder="اختر مستوى الخبرة"
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- Local helpers ---------- */

function SectionHeader({ title, subtitle }) {
  return (
    <div
      className="flex items-end justify-between mb-4 pb-3"
      style={{ borderBottom: '1px solid #efece4' }}
    >
      <div>
        <h3
          className="font-display text-ink m-0"
          style={{ fontSize: 16, fontWeight: 700 }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-muted m-0 mt-1" style={{ fontSize: 12.5 }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function BudgetField({ value, onChange, error }) {
  return (
    <div className="animate-fade-up">
      <label className="field-label">الميزانية المتوقعة</label>
      <div className="flex gap-2">
        <span className="phone-cc">ر.س</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="100000"
          value={value}
          onChange={onChange}
          className={`field field-no-icon ${error ? 'error' : ''}`}
          style={{ flex: 1 }}
        />
      </div>
      {error && <p className="field-err">{error}</p>}
      {!error && (
        <p className="field-hint">
          إجمالي الميزانية المخصّصة للمشروع.
        </p>
      )}
    </div>
  );
}
