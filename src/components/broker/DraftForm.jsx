import React from 'react';
import {
  MapPin,
  Tag,
  Calendar,
  Clock,
  Award,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import Field from '../form/Field';
import FieldLabel from '../form/FieldLabel';
import SelectField from '../form/SelectField';
import TextareaField from '../form/TextareaField';
import { cityOptions } from '../../config/cityTranslations';
import {
  ARENAS,
  PROJECT_TYPES,
  PROJECT_DURATIONS,
  EXPERIENCE_LEVELS,
} from '../../config/projectConstants';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  DraftForm — the project fields of a broker draft.
 *  ----------------------------------------------------------------
 *  Shared by all three editors of the same row: the broker creating
 *  the draft, the broker refining it, and the owner reviewing it
 *  before publishing. One component because the field set is
 *  identical in all three — only who may submit differs, and that's
 *  the caller's business (see isDraftWithBroker / isDraftWithOwner).
 *
 *  Same five required fields the BE enforces on any project — arena,
 *  name, type, city, budget — with the rest optional and labelled as
 *  such, matching CreateProjectPage's flattened form.
 *
 *  The arena is fixed to الساحة الخاصة. An invited owner is always an
 *  individual, and `private` is the only arena individuals may post
 *  in (see ARENAS.postableBy in config/projectConstants.js) — the
 *  public arena is system-locked, أرينا is developer-only, and
 *  التضامن / إسناد would need the OWNER to hold a subscription the
 *  broker can't see. Offering any of them would just produce a 403 at
 *  publish time.
 *
 *  Scope is a plain textarea rather than the chip ScopePicker used on
 *  the create wizard — that picker is write-only (no value prop), so
 *  it can't render an existing draft's scope back for editing.
 *
 *  Validation lives in validateDraft() below so all three callers
 *  enforce the same rules and show the same messages.
 * ============================================================ */

/* The only arena a broker draft can go to. Kept as a list rather than
   a bare string so adding a second one later is a one-line change. */
export const DRAFT_ARENAS = ARENAS.filter((a) => a.value === 'private');

const DEFAULT_ARENA = DRAFT_ARENAS[0]?.value || 'private';

/* Snap an arena to one the draft form actually offers. A draft saved
   before the picker was narrowed can hold something else (أرينا, say),
   and the form must not display "الساحة الخاصة" while quietly
   submitting the old value — saving normalizes the row instead. */
function allowedArena(value) {
  return DRAFT_ARENAS.some((a) => a.value === value) ? value : DEFAULT_ARENA;
}

export const EMPTY_DRAFT = {
  arena: DEFAULT_ARENA,
  name: '',
  type: '',
  city: '',
  budget: '',
  description: '',
  scope: '',
  start_date: '',
  expected_duration: '',
  experience: '',
};

/* Turn a Project resource into form state. Dates arrive as ISO
   timestamps but <input type="date"> only accepts YYYY-MM-DD. */
export function draftToForm(project) {
  if (!project) return { ...EMPTY_DRAFT };
  return {
    arena: allowedArena(project.arena),
    name: project.name || '',
    type: project.type || '',
    city: project.city || '',
    budget: project.budget !== null && project.budget !== undefined
      ? String(project.budget)
      : '',
    description: project.description || '',
    scope: project.scope || '',
    start_date: (project.start_date || '').slice(0, 10),
    expected_duration: project.expected_duration || '',
    experience: project.experience || '',
  };
}

/**
 * The five fields the BE requires, checked in one pass.
 * @returns {Record<string,string>} field → message; empty when valid.
 */
export function validateDraft(form, t) {
  const e = {};
  if (!form.arena) e.arena = t('projects.create.validate.arena');
  if (!form.name?.trim()) e.name = t('projects.create.validate.name');
  if (!form.type) e.type = t('projects.create.validate.type');
  if (!form.city) e.city = t('projects.create.validate.city');
  if (!String(form.budget).trim()) {
    e.budget = t('projects.create.validate.budgetRequired');
  } else if (Number(form.budget) < 0) {
    e.budget = t('projects.create.validate.budgetPositive');
  }
  return e;
}

/* The draft's destination, stated rather than asked. Carries the
   arena's own accent so it reads as the same object the arena cards
   and project badges elsewhere use. */
function FixedArena({ arena, label }) {
  const { t } = useTranslation();
  return (
    <div>
      <FieldLabel label={label} />
      <div
        className="flex items-center gap-2.5 px-4 py-3 rounded-[11px]"
        style={{
          background: arena.accentSoft,
          border: `1px solid ${arena.color}33`,
        }}
      >
        <ShieldCheck
          size={16}
          strokeWidth={1.9}
          style={{ color: arena.color, flexShrink: 0 }}
        />
        <span
          className="font-semibold"
          style={{ fontSize: 13.5, color: 'var(--text-ink)' }}
        >
          {t(`arena.${arena.value}.label`)}
        </span>
      </div>
    </div>
  );
}

export default function DraftForm({ form, update, errors = {}, disabled }) {
  const { t, lang } = useTranslation();
  const k = 'projects.create.steps';

  return (
    <fieldset
      disabled={disabled}
      style={{
        border: 'none',
        padding: 0,
        margin: 0,
        // A disabled fieldset still renders at full strength, which
        // reads as "editable" on a handed-off draft. Dim it instead.
        opacity: disabled ? 0.65 : 1,
      }}
      className="flex flex-col gap-5"
    >
      {/* With a single arena a dropdown is a false choice — and its
          blank placeholder is selectable, so it can only ever fail
          validation on a field the broker doesn't get to decide. Show
          the destination instead, and fall back to a real picker if a
          second arena is ever added to DRAFT_ARENAS. */}
      {DRAFT_ARENAS.length === 1 ? (
        <FixedArena arena={DRAFT_ARENAS[0]} label={t(`${k}.details.arenaSectionTitle`)} />
      ) : (
        <SelectField
          label={t(`${k}.details.arenaSectionTitle`)}
          required
          options={DRAFT_ARENAS.map((a) => ({
            value: a.value,
            label: t(`arena.${a.value}.label`),
          }))}
          value={form.arena}
          onChange={(e) => update('arena', e.target.value)}
          error={errors.arena}
        />
      )}

      <Field
        label={t(`${k}.details.nameLabel`)}
        placeholder={t(`${k}.details.namePlaceholder`)}
        required
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
        error={errors.name}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label={t(`${k}.details.typeLabel`)}
          icon={Tag}
          required
          options={PROJECT_TYPES}
          placeholder={t(`${k}.details.typePlaceholder`)}
          value={form.type}
          onChange={(e) => update('type', e.target.value)}
          error={errors.type}
        />
        <SelectField
          label={t(`${k}.details.cityLabel`)}
          icon={MapPin}
          required
          options={cityOptions(lang)}
          placeholder={t(`${k}.details.cityPlaceholder`)}
          value={form.city}
          onChange={(e) => update('city', e.target.value)}
          error={errors.city}
        />
      </div>

      <Field
        label={t(`${k}.scopeBudget.budgetLabel`)}
        icon={Wallet}
        type="number"
        min="0"
        required
        placeholder={t(`${k}.scopeBudget.budgetPlaceholder`)}
        value={form.budget}
        onChange={(e) => update('budget', e.target.value)}
        error={errors.budget}
      />

      <TextareaField
        label={t(`${k}.details.descriptionLabel`)}
        placeholder={t(`${k}.details.descriptionPlaceholder`)}
        rows={4}
        required={false}
        value={form.description}
        onChange={(e) => update('description', e.target.value)}
      />

      <TextareaField
        label={t(`${k}.scopeBudget.scopeLabel`)}
        rows={3}
        required={false}
        value={form.scope}
        onChange={(e) => update('scope', e.target.value)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label={t(`${k}.scopeBudget.startDate`)}
          icon={Calendar}
          type="date"
          required={false}
          value={form.start_date}
          onChange={(e) => update('start_date', e.target.value)}
        />
        <SelectField
          label={t(`${k}.scopeBudget.durationLabel`)}
          icon={Clock}
          required={false}
          options={PROJECT_DURATIONS}
          placeholder={t(`${k}.scopeBudget.durationPlaceholder`)}
          value={form.expected_duration}
          onChange={(e) => update('expected_duration', e.target.value)}
        />
      </div>

      <SelectField
        label={t(`${k}.scopeBudget.experienceLabel`)}
        icon={Award}
        required={false}
        options={EXPERIENCE_LEVELS}
        placeholder={t(`${k}.scopeBudget.experiencePlaceholder`)}
        value={form.experience}
        onChange={(e) => update('experience', e.target.value)}
      />
    </fieldset>
  );
}
