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
import { useTranslation } from '../../../i18n/LanguageContext';

export default function StepDetails({ form, update, errors, accountType }) {
  const { t } = useTranslation();
  const k = 'projects.create.steps.details';

  return (
    <div className="flex flex-col gap-5">
      <ArenaPicker
        value={form.arena}
        onChange={(val) => update('arena', val)}
        error={errors.arena}
        accountType={accountType}
      />

      <Field
        label={t(`${k}.nameLabel`)}
        icon={FileText}
        placeholder={t(`${k}.namePlaceholder`)}
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
        error={errors.name}
        hint={t(`${k}.nameHint`)}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <SelectField
          label={t(`${k}.typeLabel`)}
          icon={Tag}
          options={PROJECT_TYPES}
          value={form.type}
          onChange={(e) => update('type', e.target.value)}
          error={errors.type}
          placeholder={t(`${k}.typePlaceholder`)}
        />

        <SelectField
          label={t(`${k}.cityLabel`)}
          icon={MapPin}
          options={CITIES}
          value={form.city}
          onChange={(e) => update('city', e.target.value)}
          error={errors.city}
          placeholder={t(`${k}.cityPlaceholder`)}
        />
      </div>

      <TextareaField
        label={t(`${k}.descriptionLabel`)}
        rows={5}
        placeholder={t(`${k}.descriptionPlaceholder`)}
        value={form.description}
        onChange={(e) => update('description', e.target.value)}
        error={errors.description}
        hint={t(`${k}.descriptionHint`)}
      />
    </div>
  );
}

/* ============================================================
 *  ArenaPicker
 * ============================================================ */
function ArenaPicker({ value, onChange, error, accountType }) {
  const { t } = useTranslation();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [notified, setNotified] = useState(false);

  return (
    <div>
      <label className="field-label">
        {t('projects.create.steps.details.arenaSectionTitle')}
      </label>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {ARENAS.map((a) => {
          const active = value === a.value;
          const isUpgrade = !!a.isUpgrade;
          const systemLocked = !!a.systemLocked;

          if (
            isUpgrade &&
            accountType &&
            !a.postableBy.includes(accountType)
          ) {
            return null;
          }

          const eligible = isUpgrade ? false : canPostArena(a.value, accountType);
          // Pull the lock-reason text from i18n if the underlying config
          // exposes one for this arena, otherwise fall back to a generic.
          const lockReason =
            arenaLockReason(a.value, accountType) &&
            t(`arena.${a.value}.lockReason`);
          const locked = !eligible;

          const arenaLabel = t(`arena.${a.value}.label`);
          const arenaDesc = t(`arena.${a.value}.desc`);

          const handleClick = () => {
            if (isUpgrade) {
              setUpgradeOpen(true);
              return;
            }
            if (locked) return;
            onChange(a.value);
          };

          const bg = active
            ? a.accentSoft
            : locked
            ? 'var(--bg-canvas)'
            : 'var(--bg-surface)';
          const border = active
            ? a.color
            : locked
            ? 'var(--border-soft)'
            : 'var(--border-default)';

          return (
            <button
              type="button"
              key={a.value}
              onClick={handleClick}
              aria-pressed={active}
              aria-disabled={locked && !isUpgrade}
              className="text-start transition-all relative overflow-hidden"
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
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={(e) => {
                if (active) return;
                e.currentTarget.style.borderColor = border;
              }}
            >
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
                  {t('projects.create.steps.details.arenaUpgradeBadge')}
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
                    background: systemLocked
                      ? 'rgba(44,47,124,0.08)'
                      : 'var(--border-soft)',
                    color: systemLocked ? a.color : 'var(--text-muted)',
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
                  color: active
                    ? a.color
                    : locked
                    ? 'var(--text-muted)'
                    : 'var(--text-ink)',
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
                {arenaLabel}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: locked ? 'var(--text-muted)' : 'var(--text-muted)',
                  lineHeight: 1.55,
                  paddingInlineEnd: isUpgrade || locked ? 48 : 0,
                }}
              >
                {arenaDesc}
              </div>

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
                      {t(`arena.${a.value}.upgradePrice`)}
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
 *  IsnadUpgradeModal
 * ============================================================ */
function IsnadUpgradeModal({ onClose, notified, onNotify }) {
  const { t } = useTranslation();
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const k = 'projects.create.steps.details.isnadModal';
  const arenaLabel = t('arena.isnad.label');
  const price = t('arena.isnad.upgradePrice');
  // Split out the price number + unit so the layout matches RTL/LTR.
  const priceParts = price.split('/');
  const priceValue = priceParts[0]?.trim() || price;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-up"
      style={{
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 18,
          maxWidth: 480,
          width: '100%',
          padding: '28px 26px 22px',
          boxShadow: 'var(--shadow-elevated)',
          border: '1px solid var(--border-default)',
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
            aria-label={t('projects.create.steps.details.closeAria')}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-ink-soft)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'var(--bg-cream)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'var(--bg-canvas)')
            }
          >
            <X size={15} strokeWidth={1.9} />
          </button>
        </div>

        <h2
          className="font-display m-0 mb-2"
          style={{
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1.3,
            color: 'var(--text-ink)',
          }}
        >
          {arenaLabel}
          {t(`${k}.titleSuffix`)}
        </h2>
        <p
          className="m-0 mb-4"
          style={{
            fontSize: 13.5,
            lineHeight: 1.7,
            color: 'var(--text-ink-soft)',
          }}
        >
          {t(`${k}.subtitle`)}
        </p>

        <ul className="m-0 p-0 mb-5 flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <Bullet key={i}>{t(`${k}.bullets.${i}`)}</Bullet>
          ))}
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
              style={{
                fontSize: 10,
                letterSpacing: '0.08em',
                color: '#0d5538',
              }}
            >
              {t(`${k}.priceLabel`)}
            </div>
            <div
              className="font-display font-bold"
              style={{ fontSize: 17, color: 'var(--text-ink)' }}
            >
              {priceValue}{' '}
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}
              >
                {t(`${k}.pricePer`)}
              </span>
            </div>
          </div>
          <div
            className="font-semibold"
            style={{ fontSize: 11.5, color: '#0d5538' }}
          >
            {t(`${k}.optionalBadge`)}
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
                {t(`${k}.notifyDone`)}
              </>
            ) : (
              <>
                <BellRing size={14} strokeWidth={1.9} />
                {t(`${k}.notify`)}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-[11px] font-semibold transition-all"
            style={{
              fontSize: 13.5,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-ink-soft)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.background = 'var(--bg-canvas)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.background = 'var(--bg-surface)';
            }}
          >
            {t(`${k}.ok`)}
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
      style={{ fontSize: 13, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}
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
