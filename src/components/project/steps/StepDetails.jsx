import React, { useState } from 'react';
import {
  FileText,
  Tag,
  MapPin,
  Lock,
  Sparkles,
  X,
  Check,
  BellRing,
  Cloud,
} from 'lucide-react';
import Field from '../../form/Field';
import SelectField from '../../form/SelectField';
import TextareaField from '../../form/TextareaField';
import {
  PROJECT_TYPES,
  ARENAS,
  canPostArena,
  arenaLockReason,
} from '../../../config/projectConstants';
import { CITIES } from '../../../config/constants';

export default function StepDetails({ form, update, errors, accountType }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Arena picker — knows the user's account type to pre-select,
          lock ineligible options, and gate the إسناد upgrade card. */}
      <ArenaPicker
        value={form.arena}
        onChange={(val) => update('arena', val)}
        error={errors.arena}
        accountType={accountType}
      />

      <Field
        label="اسم المشروع"
        icon={FileText}
        placeholder="مثال: تجديد فيلا في حي النخيل"
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
        error={errors.name}
        hint="اختر اسماً واضحاً يصف مشروعك."
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <SelectField
          label="نوع المشروع"
          icon={Tag}
          options={PROJECT_TYPES}
          value={form.type}
          onChange={(e) => update('type', e.target.value)}
          error={errors.type}
          placeholder="اختر النوع"
        />

        <SelectField
          label="المدينة"
          icon={MapPin}
          options={CITIES}
          value={form.city}
          onChange={(e) => update('city', e.target.value)}
          error={errors.city}
          placeholder="اختر المدينة"
        />
      </div>

      <TextareaField
        label="وصف المشروع"
        rows={5}
        placeholder="اكتب وصفاً مفصّلاً عن مشروعك، الأهداف، والمواقع المعنيّة..."
        value={form.description}
        onChange={(e) => update('description', e.target.value)}
        error={errors.description}
        hint="اختياري — لكن وصفٌ جيّد يساعد الشركاء على فهم احتياجاتك."
      />
    </div>
  );
}

/* ============================================================
 *  ArenaPicker — five radio cards for project arena.
 *  ----------------------------------------------------------------
 *  Behavior per arena:
 *    - normal arena, eligible:    selectable
 *    - normal arena, ineligible:  greyed, lock icon + reason tooltip
 *    - إسناد upgrade arena:        always visible; click opens an
 *                                  upgrade modal instead of selecting
 *
 *  The chosen value is stored on the project's `arena` field.
 * ============================================================ */
function ArenaPicker({ value, onChange, error, accountType }) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [notified, setNotified] = useState(false);

  return (
    <div>
      <label className="field-label">ساحة النشر</label>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {ARENAS.map((a) => {
          const active = value === a.value;
          const isUpgrade = !!a.isUpgrade;
          const systemLocked = !!a.systemLocked;

          // Upgrade-gated arenas only render for accounts in their
          // postableBy list. We know account_type at this point; if
          // it's still loading, render to avoid hiding cards that
          // belong here. (Screenshot 2026-05-12 153348: only the
          // real-estate developer can post in إسناد.)
          if (
            isUpgrade &&
            accountType &&
            !a.postableBy.includes(accountType)
          ) {
            return null;
          }

          const eligible = isUpgrade ? false : canPostArena(a.value, accountType);
          const lockReason = arenaLockReason(a.value, accountType);
          const locked = !eligible;

          const handleClick = () => {
            if (isUpgrade) {
              setUpgradeOpen(true);
              return;
            }
            if (locked) return;
            onChange(a.value);
          };

          // Background / border depend on three states: active, locked, normal.
          const bg = active
            ? a.accentSoft
            : locked
            ? '#fafaf6'
            : 'white';
          const border = active
            ? a.color
            : locked
            ? '#efece4'
            : '#e5e3dc';

          return (
            <button
              type="button"
              key={a.value}
              onClick={handleClick}
              aria-pressed={active}
              aria-disabled={locked && !isUpgrade}
              className="text-right transition-all relative overflow-hidden"
              style={{
                padding: '14px 16px',
                background: bg,
                border: `1.5px solid ${border}`,
                borderRadius: 12,
                cursor: locked && !isUpgrade ? 'not-allowed' : 'pointer',
                opacity: locked && !isUpgrade ? 0.78 : 1,
                minHeight: 96,
              }}
              onMouseEnter={(e) => {
                if (active) return;
                if (isUpgrade) {
                  e.currentTarget.style.borderColor = a.color;
                  return;
                }
                if (locked) return;
                e.currentTarget.style.borderColor = '#cfcdc4';
              }}
              onMouseLeave={(e) => {
                if (active) return;
                e.currentTarget.style.borderColor = border;
              }}
            >
              {/* Top-right corner badge: upgrade price or lock icon */}
              {isUpgrade ? (
                <span
                  className="absolute font-bold inline-flex items-center gap-1"
                  style={{
                    top: 10,
                    insetInlineEnd: 10,
                    background: a.color,
                    color: 'white',
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 999,
                    letterSpacing: '0.02em',
                  }}
                >
                  <Sparkles size={10} strokeWidth={2.2} />
                  ترقية
                </span>
              ) : locked ? (
                <span
                  className="absolute flex items-center justify-center"
                  style={{
                    top: 10,
                    insetInlineEnd: 10,
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    background: systemLocked ? 'rgba(44,47,124,0.08)' : '#efece4',
                    color: systemLocked ? a.color : '#7a7a8c',
                  }}
                  title={lockReason}
                  aria-label={lockReason}
                >
                  {systemLocked ? (
                    <Cloud size={12} strokeWidth={2} />
                  ) : (
                    <Lock size={11} strokeWidth={2} />
                  )}
                </span>
              ) : null}

              <div
                className="font-display font-bold mb-1 inline-flex items-center gap-2"
                style={{
                  fontSize: 14,
                  color: active ? a.color : locked ? '#7a7a8c' : '#0f1129',
                }}
              >
                <span
                  className="rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    background: a.color,
                    opacity: locked && !active ? 0.5 : 1,
                  }}
                />
                {a.label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: locked ? '#9a9aac' : '#7a7a8c',
                  lineHeight: 1.55,
                  paddingInlineEnd: isUpgrade || locked ? 48 : 0,
                }}
              >
                {a.desc}
              </div>

              {/* Footer hint when locked or upgrade */}
              {(locked || isUpgrade) && (
                <div
                  className="mt-2 inline-flex items-center gap-1.5"
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: a.color,
                    letterSpacing: '0.02em',
                  }}
                >
                  {isUpgrade ? (
                    <>
                      <Sparkles size={10.5} strokeWidth={2} />
                      {a.upgradePrice}
                    </>
                  ) : systemLocked ? (
                    <>
                      <Cloud size={10.5} strokeWidth={2} />
                      {lockReason}
                    </>
                  ) : (
                    <>
                      <Lock size={10.5} strokeWidth={2} />
                      {lockReason}
                    </>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="field-err">{error}</p>}

      {/* إسناد upgrade modal */}
      {upgradeOpen && (
        <IsnadUpgradeModal
          onClose={() => {
            setUpgradeOpen(false);
            setNotified(false);
          }}
          notified={notified}
          onNotify={() => setNotified(true)}
        />
      )}
    </div>
  );
}

/* ============================================================
 *  IsnadUpgradeModal — informational modal explaining the إسناد
 *  upgrade. Doesn't select the arena (no billing yet); instead
 *  lets the user opt-in for a launch notification.
 * ============================================================ */
function IsnadUpgradeModal({ onClose, notified, onNotify }) {
  // Close on Escape
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-up"
      style={{
        background: 'rgba(15,17,41,0.45)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 18,
          maxWidth: 480,
          width: '100%',
          padding: '28px 26px 22px',
          boxShadow: '0 30px 70px rgba(15,17,41,0.30)',
          border: '1px solid #e5e3dc',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #0d5538, #136d4a)',
              color: 'white',
              boxShadow: '0 12px 26px rgba(13,85,56,0.32)',
            }}
          >
            <Sparkles size={26} strokeWidth={1.7} />
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="flex items-center justify-center transition-colors"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: '#fafaf6',
              border: '1px solid #e5e3dc',
              color: '#3a3a52',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#efece4')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fafaf6')}
          >
            <X size={15} strokeWidth={1.9} />
          </button>
        </div>

        <h2
          className="font-display text-ink m-0 mb-2"
          style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}
        >
          ساحة إسناد — ترقية اختياريّة
        </h2>
        <p
          className="text-ink-soft m-0 mb-4"
          style={{ fontSize: 13.5, lineHeight: 1.7 }}
        >
          وصول حصري إلى المشاريع الكبرى والفرص التمويليّة التي تتجاوز قيمتها
          ١٠٠ مليون ر.س، مع جهات تمويلية معتمدة ومشاريع مؤسّسية.
        </p>

        <ul className="m-0 p-0 mb-5 flex flex-col gap-2.5">
          <Bullet>مشاريع كبرى ومناقصات مؤسّسيّة.</Bullet>
          <Bullet>وصول مباشر إلى الجهات التمويليّة المعتمدة.</Bullet>
          <Bullet>لا تُحتسب ضمن سعر الباقة الأساسيّة.</Bullet>
        </ul>

        <div
          className="flex items-center justify-between gap-3 mb-5 p-3.5 rounded-[12px]"
          style={{
            background: 'rgba(13,85,56,0.06)',
            border: '1px solid rgba(13,85,56,0.18)',
          }}
        >
          <div>
            <div
              className="font-semibold uppercase mb-0.5"
              style={{ fontSize: 10, letterSpacing: '0.08em', color: '#0d5538' }}
            >
              سعر الترقية
            </div>
            <div
              className="font-display font-bold"
              style={{ fontSize: 17, color: '#0f1129' }}
            >
              600 ر.س{' '}
              <span style={{ fontSize: 12, color: '#7a7a8c', fontWeight: 500 }}>
                / شهر
              </span>
            </div>
          </div>
          <div
            className="font-semibold"
            style={{ fontSize: 11.5, color: '#0d5538' }}
          >
            إضافة اختياريّة
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onNotify}
            disabled={notified}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[11px] text-white font-semibold transition-all flex-1"
            style={{
              fontSize: 13.5,
              background: notified ? '#136d4a' : '#0d5538',
              border: `1px solid ${notified ? '#136d4a' : '#0d5538'}`,
              cursor: notified ? 'default' : 'pointer',
              boxShadow: '0 8px 18px rgba(13,85,56,0.30)',
            }}
          >
            {notified ? (
              <>
                <Check size={14} strokeWidth={2.4} />
                تمّ تفعيل التنبيه
              </>
            ) : (
              <>
                <BellRing size={14} strokeWidth={1.9} />
                نبّهني عند توفّر الترقية
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-[11px] font-semibold transition-all"
            style={{
              fontSize: 13.5,
              background: 'white',
              border: '1px solid #e5e3dc',
              color: '#3a3a52',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#cfcdc4';
              e.currentTarget.style.background = '#fafaf6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e3dc';
              e.currentTarget.style.background = 'white';
            }}
          >
            حسناً
          </button>
        </div>
      </div>
    </div>
  );
}

function Bullet({ children }) {
  return (
    <li
      className="list-none flex items-start gap-2.5"
      style={{ fontSize: 13, color: '#3a3a52', lineHeight: 1.6 }}
    >
      <span
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          background: 'rgba(13,85,56,0.10)',
          color: '#0d5538',
          marginTop: 1,
        }}
      >
        <Check size={12} strokeWidth={2.4} />
      </span>
      <span>{children}</span>
    </li>
  );
}
