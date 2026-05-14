import React, { useEffect, useState } from 'react';
import { ShieldOff, Sparkles } from 'lucide-react';
import { auth } from '../services';
import { arenaConfig, canViewArena } from '../config/projectConstants';
import { useTranslation } from '../i18n/LanguageContext';

/* ============================================================
 *  RequireArenaAccess
 *  ----------------------------------------------------------------
 *  Wraps /projects/:arena. Resolves the user, then renders one of:
 *    - allowed   → children
 *    - blocked   → role isn't in viewableBy
 *    - upgrade   → arena is paywalled and user hasn't paid
 *
 *  While waiting we render a placeholder so we don't flash arena
 *  content before the gate confirms.
 * ============================================================ */
export default function RequireArenaAccess({ arena, children }) {
  const cfg = arenaConfig(arena);
  const [state, setState] = useState('loading');
  const [accountType, setAccountType] = useState(null);

  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((u) => {
        if (cancelled) return;
        const at = u?.account_type || null;
        const paid = !!u?.has_isnad_upgrade;
        setAccountType(at);

        if (canViewArena(arena, at, paid)) {
          setState('allowed');
          return;
        }
        if (
          cfg.isUpgrade &&
          !paid &&
          (cfg.viewableBy || []).includes(at)
        ) {
          setState('upgrade');
          return;
        }
        setState('blocked');
      })
      .catch(() => {
        if (!cancelled) setState('blocked');
      });
    return () => {
      cancelled = true;
    };
  }, [arena, cfg.isUpgrade, cfg.viewableBy]);

  if (state === 'loading') return <ArenaSkeleton />;
  if (state === 'allowed') return children;
  if (state === 'upgrade') return <UpgradePanel arena={cfg} arenaSlug={arena} />;
  return <BlockedPanel arena={cfg} arenaSlug={arena} accountType={accountType} />;
}

function ArenaSkeleton() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div
        className="sticky top-0 z-30"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-default)',
          height: 96,
        }}
      />
      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div
            className="animate-pulse rounded-[20px] mb-8"
            style={{ height: 180, background: 'var(--border-soft)' }}
          />
          <div
            className="animate-pulse rounded-[14px] mb-6"
            style={{ height: 54, background: 'var(--border-soft)' }}
          />
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-[16px]"
                style={{ height: 270, background: 'var(--border-soft)' }}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function Centered({ icon: Icon, title, subtitle, color }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div
        className="sticky top-0 z-30"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-default)',
          height: 96,
        }}
      />
      <main className="flex-1 flex items-center justify-center py-12 px-6">
        <div
          className="flex flex-col items-center text-center py-16 px-8 rounded-[20px] animate-fade-up max-w-md w-full"
          style={{
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-default)',
          }}
        >
          <div
            className="flex items-center justify-center mb-5"
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: color ? `${color}15` : 'var(--bg-cream)',
              color: color || 'var(--text-muted)',
            }}
          >
            <Icon size={30} strokeWidth={1.6} />
          </div>
          <h3
            className="font-display m-0 mb-2"
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-ink)',
            }}
          >
            {title}
          </h3>
          <p
            className="m-0"
            style={{
              fontSize: 14,
              lineHeight: 1.75,
              color: 'var(--text-muted)',
            }}
          >
            {subtitle}
          </p>
        </div>
      </main>
    </div>
  );
}

function BlockedPanel({ arena, arenaSlug, accountType }) {
  const { t } = useTranslation();
  const arenaLabel = t(`arena.${arenaSlug}.label`);
  const role = accountType
    ? t(`accountType.${accountType}`)
    : t('accountType.unknown');
  return (
    <Centered
      icon={ShieldOff}
      title={t('projects.list.blocked')}
      subtitle={t('projects.list.blockedAccount', { role }).replace(
        '{arena}',
        arenaLabel
      )}
    />
  );
}

function UpgradePanel({ arena, arenaSlug }) {
  const { t } = useTranslation();
  const arenaLabel = t(`arena.${arenaSlug}.label`);
  const price = t(`arena.${arenaSlug}.upgradePrice`);
  return (
    <Centered
      icon={Sparkles}
      color={arena.color}
      title={t('projects.list.blockedIsnadTitle', { arena: arenaLabel })}
      subtitle={t('projects.list.blockedIsnadSubtitle', {
        arena: arenaLabel,
        price,
      })}
    />
  );
}
