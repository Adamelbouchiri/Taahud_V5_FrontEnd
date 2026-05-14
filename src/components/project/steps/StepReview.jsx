import React from 'react';
import {
  Edit2,
  CheckCircle2,
  Info,
  ListChecks,
  FileText,
} from 'lucide-react';
import { arenaLabel } from '../../../config/projectConstants';

/**
 * Final step — read-only review of all entered data with edit-jump
 * buttons per section. The customer reviews everything before
 * submitting. After submit, files are uploaded one-by-one.
 */
export default function StepReview({ form, onJumpToStep }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Helper note */}
      <div
        className="flex gap-3 p-4 rounded-[12px]"
        style={{
          background: 'rgba(44,47,124,0.04)',
          border: '1px solid rgba(44,47,124,0.12)',
        }}
      >
        <Info
          size={18}
          strokeWidth={1.7}
          className="flex-shrink-0 mt-0.5"
          style={{ color: '#2c2f7c' }}
        />
        <div>
          <p
            className="m-0 mb-1"
            style={{ fontSize: 13.5, fontWeight: 600, color: '#0f1129' }}
          >
            ماذا يحدث بعد الإرسال؟
          </p>
          <p
            className="m-0"
            style={{ fontSize: 13, color: '#3a3a52', lineHeight: 1.7 }}
          >
            سيُعرض مشروعك على مقدّمي الخدمات والموردين الموثوقين. يمكنك مراجعة
            عروضهم واختيار الشريك المناسب من صفحة المشروع لاحقاً.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3
            className="font-display text-ink m-0"
            style={{ fontSize: 18, fontWeight: 700 }}
          >
            مراجعة البيانات
          </h3>
          <p className="text-muted m-0 mt-1" style={{ fontSize: 13 }}>
            تأكّد من صحة المعلومات قبل الإرسال.
          </p>
        </div>
        <CheckCircle2 size={22} style={{ color: '#136d4a' }} />
      </div>

      <ReviewBlock
        title="تفاصيل المشروع"
        onEdit={() => onJumpToStep(0)}
        rows={[
          { label: 'ساحة النشر', value: arenaLabel(form.arena) },
          { label: 'اسم المشروع', value: form.name },
          { label: 'النوع', value: form.type },
          { label: 'المدينة', value: form.city },
          { label: 'الوصف', value: form.description, full: true },
        ]}
      />

      <ReviewBlock
        title="النطاق والميزانية"
        onEdit={() => onJumpToStep(1)}
        rows={[
          { label: 'نطاق العمل', value: form.scope, full: true },
          { label: 'تاريخ البداية', value: form.start_date },
          { label: 'تاريخ الانتهاء', value: form.end_date },
          { label: 'المدة المتوقعة', value: form.expected_duration },
          {
            label: 'الميزانية',
            value: form.budget ? `${formatNumber(form.budget)} ر.س` : '',
          },
          { label: 'الخبرة المطلوبة', value: form.experience },
        ]}
      />

      {/* Requirements + Files block */}
      <FilesAndRequirementsBlock
        requirements={form.requirements}
        files={form.files}
        requiredDocuments={form.required_documents}
        isStartedExternally={form.is_started_externally}
        onEdit={() => onJumpToStep(2)}
      />
    </div>
  );
}

/* ============================================================
 *  Generic key-value review block
 * ============================================================ */
function ReviewBlock({ title, rows, onEdit }) {
  const visibleRows = rows.filter((r) => r.value);

  return (
    <div
      className="rounded-[14px]"
      style={{ background: 'white', border: '1px solid #e5e3dc' }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid #efece4' }}
      >
        <h4
          className="font-display text-ink m-0"
          style={{ fontSize: 14.5, fontWeight: 700 }}
        >
          {title}
        </h4>
        <button
          type="button"
          onClick={onEdit}
          className="link inline-flex items-center gap-1.5 cursor-pointer bg-transparent border-0 p-0"
          style={{ fontSize: 12.5 }}
        >
          <Edit2 size={12} />
          تعديل
        </button>
      </div>

      <div className="px-5 py-4">
        {visibleRows.length === 0 ? (
          <p className="text-muted m-0" style={{ fontSize: 13 }}>
            لم يتمّ إدخال بيانات في هذا القسم.
          </p>
        ) : (
          <dl className="m-0 grid sm:grid-cols-2 gap-x-6 gap-y-3.5">
            {visibleRows.map((r) => (
              <div
                key={r.label}
                style={r.full ? { gridColumn: '1 / -1' } : undefined}
              >
                <dt
                  className="font-medium uppercase mb-1"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    color: '#7a7a8c',
                  }}
                >
                  {r.label}
                </dt>
                <dd
                  className="m-0"
                  style={{
                    fontSize: 13.5,
                    color: '#0f1129',
                    lineHeight: 1.6,
                  }}
                >
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 *  Files & requirements summary
 * ============================================================ */
function FilesAndRequirementsBlock({
  requirements = [],
  files = [],
  requiredDocuments = '',
  isStartedExternally = false,
  onEdit,
}) {
  const isEmpty =
    requirements.length === 0 &&
    files.length === 0 &&
    !requiredDocuments &&
    !isStartedExternally;

  return (
    <div
      className="rounded-[14px]"
      style={{ background: 'white', border: '1px solid #e5e3dc' }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid #efece4' }}
      >
        <h4
          className="font-display text-ink m-0"
          style={{ fontSize: 14.5, fontWeight: 700 }}
        >
          الملفات والمتطلبات
        </h4>
        <button
          type="button"
          onClick={onEdit}
          className="link inline-flex items-center gap-1.5 cursor-pointer bg-transparent border-0 p-0"
          style={{ fontSize: 12.5 }}
        >
          <Edit2 size={12} />
          تعديل
        </button>
      </div>

      <div className="px-5 py-4">
        {isEmpty ? (
          <p className="text-muted m-0" style={{ fontSize: 13 }}>
            لم تتمّ إضافة ملفات أو متطلبات.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
            {/* Requirements column */}
            <div>
              <div
                className="font-medium uppercase mb-3 flex items-center gap-1.5"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  color: '#7a7a8c',
                }}
              >
                <ListChecks size={12} />
                المتطلبات ({requirements.length})
              </div>
              {requirements.length > 0 ? (
                <ul className="m-0 p-0 space-y-1.5">
                  {requirements.map((r, i) => (
                    <li
                      key={i}
                      className="list-none flex items-start gap-2"
                      style={{
                        fontSize: 13,
                        color: '#0f1129',
                        lineHeight: 1.55,
                      }}
                    >
                      <span
                        className="flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: 'rgba(19,109,74,0.1)',
                          color: '#136d4a',
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </span>
                      {r}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted m-0" style={{ fontSize: 12.5 }}>
                  لا توجد متطلبات.
                </p>
              )}
            </div>

            {/* Files column */}
            <div>
              <div
                className="font-medium uppercase mb-3 flex items-center gap-1.5"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  color: '#7a7a8c',
                }}
              >
                <FileText size={12} />
                الملفات ({files.length})
              </div>
              {files.length > 0 ? (
                <ul className="m-0 p-0 space-y-1.5">
                  {files.map((f, i) => (
                    <li
                      key={i}
                      className="list-none flex items-center justify-between gap-2"
                      style={{
                        fontSize: 13,
                        color: '#0f1129',
                        lineHeight: 1.55,
                      }}
                    >
                      <span className="truncate">{f.name}</span>
                      <span
                        className="flex-shrink-0"
                        style={{ fontSize: 11.5, color: '#7a7a8c' }}
                      >
                        {formatSize(f.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted m-0" style={{ fontSize: 12.5 }}>
                  لا توجد ملفات.
                </p>
              )}
            </div>

            {requiredDocuments && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div
                  className="font-medium uppercase mb-2"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    color: '#7a7a8c',
                  }}
                >
                  الوثائق المطلوبة
                </div>
                <p
                  className="m-0"
                  style={{ fontSize: 13, color: '#0f1129', lineHeight: 1.65 }}
                >
                  {requiredDocuments}
                </p>
              </div>
            )}

            {isStartedExternally && (
              <div style={{ gridColumn: '1 / -1' }}>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full font-semibold"
                  style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    background: 'rgba(19,109,74,0.08)',
                    color: '#0d5538',
                    border: '1px solid rgba(19,109,74,0.18)',
                  }}
                >
                  <CheckCircle2 size={12} />
                  المشروع بدأ بالفعل خارج المنصّة
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */
function formatNumber(n) {
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return n;
  return new Intl.NumberFormat('ar-SA').format(num);
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
