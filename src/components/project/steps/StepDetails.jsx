import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Tag,
  MapPin,
  Lock,
  Sparkles,
  X,
  Check,
  Cloud,
} from 'lucide-react';
import Field from '../../form/Field';
import FieldLabel from '../../form/FieldLabel';
import SelectField from '../../form/SelectField';
import TextareaField from '../../form/TextareaField';
import BudgetField from '../BudgetField';
import {
  PROJECT_TYPES,
  ARENAS,
  canPostArena,
  arenaLockReason,
} from '../../../config/projectConstants';
import { cityOptions } from '../../../config/cityTranslations';
import { useTranslation } from '../../../i18n/LanguageContext';
import arDict from '../../../i18n/dictionaries/ar';
import enDict from '../../../i18n/dictionaries/en';
import zhDict from '../../../i18n/dictionaries/zh';
import urDict from '../../../i18n/dictionaries/ur';

const DICTS = { ar: arDict, en: enDict, zh: zhDict, ur: urDict };

export default function StepDetails({
  form,
  update,
  errors,
  accountType,
  accountLoaded = true,
  addons = {},
}) {
  const { t, lang } = useTranslation();
  const k = 'projects.create.steps.details';

  return (
    <div className="flex flex-col gap-5">
      <ArenaPicker
        value={form.arena}
        onChange={(val) => update('arena', val)}
        error={errors.arena}
        accountType={accountType}
        accountLoaded={accountLoaded}
        addons={addons}
      />

      <Field
        label={t(`${k}.nameLabel`)}
        icon={FileText}
        required
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
          required
          options={PROJECT_TYPES}
          value={form.type}
          onChange={(e) => update('type', e.target.value)}
          error={errors.type}
          placeholder={t(`${k}.typePlaceholder`)}
        />

        <SelectField
          label={t(`${k}.cityLabel`)}
          icon={MapPin}
          required
          options={cityOptions(lang)}
          value={form.city}
          onChange={(e) => update('city', e.target.value)}
          error={errors.city}
          placeholder={t(`${k}.cityPlaceholder`)}
        />
      </div>

      {/* Budget lives here rather than with scope/timeline: it's the
          fifth and last field the BE requires, so keeping it in this
          block is what makes everything below genuinely skippable. */}
      <div className="grid sm:grid-cols-2 gap-4">
        <BudgetField
          value={form.budget}
          onChange={(e) => update('budget', e.target.value)}
          error={errors.budget}
        />
      </div>

      <TextareaField
        label={t(`${k}.descriptionLabel`)}
        rows={5}
        required={false}
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
function ArenaPicker({ value, onChange, error, accountType, accountLoaded, addons = {} }) {
  const { t } = useTranslation();
  // Slug of the gated arena whose upgrade modal is open, or null.
  const [upgradeArena, setUpgradeArena] = useState(null);
  // Slug of the system-locked arena whose explainer modal is open.
  // Separate from `upgradeArena` because the two modals answer
  // different questions: "what do I get if I pay" vs "why can't I
  // post here at all".
  const [infoArena, setInfoArena] = useState(null);

  if (!accountLoaded) return <ArenaPickerSkeleton t={t} />;

  return (
    <div>
      <FieldLabel
        label={t('projects.create.steps.details.arenaSectionTitle')}
        required
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {ARENAS.map((a) => {
          const active = value === a.value;
          const isUpgrade = !!a.isUpgrade;
          const systemLocked = !!a.systemLocked;
          // True when the user already owns this gated arena's add-on
          // (or the arena isn't gated). When owned, the upgrade card
          // becomes a normal selectable arena.
          const hasAddon = !a.addonCode || !!addons[a.addonCode];
          // Render the upsell treatment only for gated arenas the user
          // hasn't unlocked yet.
          const showUpgrade = isUpgrade && !hasAddon;

          if (
            isUpgrade &&
            accountType &&
            !a.postableBy.includes(accountType)
          ) {
            return null;
          }

          const eligible = canPostArena(a.value, accountType, addons);
          // Pull the lock-reason text from i18n if the underlying config
          // exposes one for this arena, otherwise fall back to a generic.
          const lockReason =
            arenaLockReason(a.value, accountType) &&
            t(`arena.${a.value}.lockReason`);
          const locked = !eligible;

          const arenaLabel = t(`arena.${a.value}.label`);
          const arenaDesc = t(`arena.${a.value}.desc`);

          const handleClick = () => {
            if (showUpgrade) {
              setUpgradeArena(a.value);
              return;
            }
            // System-locked arenas (الساحة العامة) can't be posted to by
            // anyone — no add-on unlocks them, the listings come from
            // external sources. The click used to do nothing at all,
            // which left users tapping a dead tile with only a 10px
            // cloud icon to explain it. Explain it properly instead.
            if (systemLocked) {
              setInfoArena(a.value);
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
              // Not "disabled" when it opens an explainer — it does
              // something, it just doesn't select the arena.
              aria-disabled={locked && !isUpgrade && !systemLocked}
              aria-haspopup={showUpgrade || systemLocked ? 'dialog' : undefined}
              className="text-start transition-all relative overflow-hidden"
              style={{
                padding: '14px 16px',
                background: bg,
                border: `1.5px solid ${border}`,
                borderRadius: 12,
                cursor:
                  locked && !showUpgrade && !systemLocked
                    ? 'not-allowed'
                    : 'pointer',
                opacity: locked && !showUpgrade ? 0.78 : 1,
                minHeight: 96,
              }}
              onMouseEnter={(e) => {
                if (active) return;
                // Both modal-opening tiles get a colored hover border so
                // they read as clickable despite the locked styling.
                if (showUpgrade || systemLocked) {
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
              {showUpgrade ? (
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
                  paddingInlineEnd: showUpgrade || locked ? 48 : 0,
                }}
              >
                {arenaDesc}
              </div>

              {(locked || showUpgrade) && (
                <div
                  className="mt-2 inline-flex items-center gap-1.5"
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: a.color,
                    letterSpacing: '0.02em',
                  }}
                >
                  {showUpgrade ? (
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

      {upgradeArena && (
        <ArenaUpgradeModal
          arenaSlug={upgradeArena}
          onClose={() => setUpgradeArena(null)}
        />
      )}

      {infoArena && (
        <ArenaInfoModal
          arenaSlug={infoArena}
          onClose={() => setInfoArena(null)}
        />
      )}
    </div>
  );
}

/* ============================================================
 *  ArenaPickerSkeleton — shown until auth.me() resolves so the
 *  arena tiles don't flash from "all open" to "locked per role".
 *  Mirrors the real grid's column count and tile height for a
 *  visually-stable swap-in.
 * ============================================================ */
function ArenaPickerSkeleton({ t }) {
  return (
    <div>
      <label className="field-label">
        {t('projects.create.steps.details.arenaSectionTitle')}
      </label>
      <div
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5"
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse relative overflow-hidden"
            style={{
              minHeight: 96,
              borderRadius: 12,
              border: '1.5px solid var(--border-soft)',
              background: 'var(--bg-canvas)',
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                height: 12,
                width: '45%',
                background: 'var(--border-soft)',
                borderRadius: 6,
                marginBottom: 10,
              }}
            />
            <div
              style={{
                height: 10,
                width: '90%',
                background: 'var(--border-soft)',
                borderRadius: 6,
                marginBottom: 6,
              }}
            />
            <div
              style={{
                height: 10,
                width: '70%',
                background: 'var(--border-soft)',
                borderRadius: 6,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 *  ArenaUpgradeModal — shown when a user without the add-on tries to
 *  post in a gated arena (إسناد / التضامن). Arena label + price come
 *  from the arena config so the same modal serves both add-ons.
 * ============================================================ */
function ArenaUpgradeModal({ arenaSlug, onClose }) {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const k = 'projects.create.steps.details.isnadModal';
  // Subtitle + bullets are arena-specific so the إسناد and التضامن
  // modals each describe their own add-on (the chrome is shared).
  const dict = DICTS[lang] || DICTS.ar;
  const isSolidarity = arenaSlug === 'solidarity';
  const arenaCopy = isSolidarity
    ? dict?.solidarityAddon
    : dict?.projects?.create?.steps?.details?.isnadModal;
  const subtitle = arenaCopy?.subtitle || t(`${k}.subtitle`);
  const bullets = Array.isArray(arenaCopy?.bullets) ? arenaCopy.bullets : [];
  const goSubscribe = () => {
    onClose();
    navigate('/subscribe');
  };
  const arenaLabel = t(`arena.${arenaSlug}.label`);
  const price = t(`arena.${arenaSlug}.upgradePrice`);
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
          {subtitle}
        </p>

        <ul className="m-0 p-0 mb-5 flex flex-col gap-2.5">
          {bullets.map((b, i) => (
            <Bullet key={i}>{b}</Bullet>
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
            onClick={goSubscribe}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[11px] text-white font-semibold transition-all flex-1"
            style={{
              fontSize: 13.5,
              background: '#0d5538',
              border: '1px solid #0d5538',
              cursor: 'pointer',
              boxShadow: '0 8px 18px rgba(13,85,56,0.30)',
            }}
          >
            <Sparkles size={14} strokeWidth={1.9} />
            {t('subscribe.page.subscribeCta')}
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

/* ============================================================
 *  ArenaInfoModal — shown when someone clicks a SYSTEM-LOCKED arena
 *  (الساحة العامة). Deliberately not the upgrade modal: there is no
 *  add-on to buy here. These listings are aggregated from external
 *  platforms, so nobody posts to this arena through Taahud — the modal
 *  explains that and points at the feed instead of selling anything.
 *
 *  Chrome mirrors ArenaUpgradeModal rather than sharing a shell with
 *  it: the paywall modal is a live billing path and this change had no
 *  reason to touch it. Worth folding into one shell if a third variant
 *  ever shows up.
 * ============================================================ */
function ArenaInfoModal({ arenaSlug, onClose }) {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const k = 'projects.create.steps.details.publicModal';
  // Bullets are an ARRAY, and t() only resolves strings — read them
  // straight off the dictionary the same way the upgrade modal does.
  const dict = DICTS[lang] || DICTS.ar;
  const bullets =
    dict?.projects?.create?.steps?.details?.publicModal?.bullets;
  const bulletList = Array.isArray(bullets) ? bullets : [];

  const arena = ARENAS.find((a) => a.value === arenaSlug);
  const color = arena?.color || '#2c2f7c';
  const arenaLabel = t(`arena.${arenaSlug}.label`);

  const goBrowse = () => {
    onClose();
    navigate(`/projects/${arenaSlug}`);
  };

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
              background: color,
              color: 'white',
              boxShadow: `0 12px 26px ${color}52`,
            }}
          >
            <Cloud size={26} strokeWidth={1.7} />
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
          {bulletList.map((b, i) => (
            <Bullet key={i} color={color} bg={`${color}1a`}>
              {b}
            </Bullet>
          ))}
        </ul>

        {/* Where to post instead — the actionable half of the message.
            Without it the modal only says "not here". */}
        <div
          className="mb-5 p-3.5 rounded-[12px]"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div
            className="font-semibold uppercase mb-1"
            style={{ fontSize: 10, letterSpacing: '0.08em', color }}
          >
            {t(`${k}.insteadLabel`)}
          </div>
          <div
            style={{
              fontSize: 12.5,
              lineHeight: 1.6,
              color: 'var(--text-ink-soft)',
            }}
          >
            {t(`${k}.insteadBody`)}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={goBrowse}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[11px] text-white font-semibold transition-all flex-1"
            style={{
              fontSize: 13.5,
              background: color,
              border: `1px solid ${color}`,
              cursor: 'pointer',
              boxShadow: `0 8px 18px ${color}4d`,
            }}
          >
            <Cloud size={14} strokeWidth={1.9} />
            {t(`${k}.browseCta`)}
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

/* Defaults keep the upgrade modal's green exactly as it was; the
   info modal passes the arena's own color instead. */
function Bullet({ children, color = '#0d5538', bg = 'rgba(13,85,56,0.10)' }) {
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
          background: bg,
          color,
          marginTop: 1,
        }}
      >
        <Check size={12} strokeWidth={2.4} />
      </span>
      <span>{children}</span>
    </li>
  );
}
