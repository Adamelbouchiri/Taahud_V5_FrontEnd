import React from 'react';
import { Files, ListChecks, FileBadge, PlayCircle } from 'lucide-react';
import RequirementsList from '../RequirementsList';
import FilesUpload from '../FilesUpload';
import TextareaField from '../../form/TextareaField';

/* Suggested requirements based on what most projects need */
const REQUIREMENT_SUGGESTIONS = [
  'رخصة بناء سارية',
  'مخططات معتمدة من البلدية',
  'شهادة تأمين',
  'سجل تجاري',
  'شهادات سلامة',
  'مخططات تنفيذية',
  'عينات مواد',
];

/**
 * Step 3 of the create-project wizard.
 *
 * Adds to the create payload:
 *   - requirements (string[])       → server expands into project_requirments rows
 *   - files (File[])                → uploaded one-by-one AFTER project create
 *   - required_documents (string)   → free-form description of needed certificates
 *   - is_started_externally (bool)  → already in progress outside Taahud
 *
 * Everything in this step is optional. A customer can publish a project
 * with none of these and add them later from the detail page.
 */
export default function StepFilesAndRequirements({ form, update }) {
  return (
    <div className="flex flex-col gap-7">
      {/* Requirements */}
      <section>
        <SectionHeader
          icon={ListChecks}
          title="متطلبات المشروع"
          subtitle="أضف الوثائق والشهادات التي يجب على مقدّم الخدمة توفيرها."
        />
        <RequirementsList
          items={form.requirements}
          onChange={(next) => update('requirements', next)}
          suggestions={REQUIREMENT_SUGGESTIONS}
        />
      </section>

      <div style={{ borderTop: '1px solid #efece4' }} />

      {/* Required documents */}
      <section>
        <SectionHeader
          icon={FileBadge}
          title="المستندات المطلوبة"
          subtitle="وصف حرّ للوثائق الرسميّة المطلوبة (سجل تجاري، شهادة زكاة، ...) — اختياري."
        />
        <TextareaField
          label="الوثائق المطلوبة"
          rows={3}
          placeholder="مثال: سجل تجاري سعودي ساري، شهادة هيئة الزكاة والضريبة، تأمين عمّال."
          value={form.required_documents || ''}
          onChange={(e) => update('required_documents', e.target.value)}
          hint="اختياري — اتركه فارغاً إن لم يكن لديك متطلبات إضافية."
        />
      </section>

      <div style={{ borderTop: '1px solid #efece4' }} />

      {/* Files */}
      <section>
        <SectionHeader
          icon={Files}
          title="ملفات المشروع"
          subtitle="ارفق المخططات أو الصور أو أيّ مستندات تساعد الشركاء على فهم المشروع."
        />
        <FilesUpload
          files={form.files}
          onChange={(next) => update('files', next)}
        />
      </section>

      <div style={{ borderTop: '1px solid #efece4' }} />

      {/* Already started externally */}
      <section>
        <SectionHeader
          icon={PlayCircle}
          title="حالة المشروع"
          subtitle="هل بدأ العمل في المشروع خارج منصّة تعاهد؟"
        />
        <ToggleRow
          label="المشروع بدأ بالفعل خارج المنصّة"
          desc="فعّل هذا الخيار إذا كنت تبحث عن شريك لإكمال مشروع قائم."
          checked={!!form.is_started_externally}
          onChange={(v) => update('is_started_externally', v)}
        />
      </section>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'rgba(44,47,124,0.08)',
          color: '#2c2f7c',
        }}
      >
        <Icon size={18} strokeWidth={1.7} />
      </div>
      <div>
        <h3
          className="font-display text-ink m-0"
          style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-muted m-0 mt-1" style={{ fontSize: 13, lineHeight: 1.6 }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="w-full text-right transition-all"
      style={{
        padding: '14px 16px',
        background: checked ? 'rgba(19,109,74,0.06)' : 'white',
        border: `1.5px solid ${checked ? '#136d4a' : '#e5e3dc'}`,
        borderRadius: 12,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <span
        aria-hidden
        className="flex-shrink-0"
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          background: checked ? '#136d4a' : '#cbcec9',
          position: 'relative',
          transition: 'background 0.18s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'white',
            transition: 'left 0.18s ease',
            boxShadow: '0 2px 6px rgba(15,17,41,0.18)',
          }}
        />
      </span>
      <span className="flex-1 min-w-0">
        <span
          className="font-display font-bold block"
          style={{ fontSize: 14, color: checked ? '#0d5538' : '#0f1129' }}
        >
          {label}
        </span>
        <span
          className="block"
          style={{ fontSize: 12.5, color: '#7a7a8c', lineHeight: 1.55, marginTop: 2 }}
        >
          {desc}
        </span>
      </span>
    </button>
  );
}
