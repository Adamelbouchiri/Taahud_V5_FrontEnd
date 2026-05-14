import React, { useEffect, useState } from 'react';
import { ShieldOff, Sparkles } from 'lucide-react';
import { auth } from '../services';
import { arenaConfig, canViewArena } from '../config/projectConstants';

/* ============================================================
 *  RequireArenaAccess
 *  ----------------------------------------------------------------
 *  Wraps a per-arena route (/projects/:arena). Loads the user via
 *  auth.me() and ONLY renders children once access is confirmed.
 *
 *  Three resolved states:
 *    - allowed   → render children
 *    - blocked   → role isn't in viewableBy → "غير متاحة لحسابك"
 *    - upgrade   → arena is paywalled (إسناد) and user hasn't paid
 *                  → upgrade pitch panel
 *
 *  While we wait for auth.me() we render a quiet placeholder. This
 *  removes the brief flash of arena content (or sidebar tabs) that
 *  used to happen on refresh before the role landed — the gate
 *  blocks render until the answer is known.
 * ============================================================ */
export default function RequireArenaAccess({ arena, children }) {
  const cfg = arenaConfig(arena);
  // 'loading' | 'allowed' | 'blocked' | 'upgrade'
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
        // إسناد case: role is eligible but hasn't paid → show
        // upgrade pitch instead of "not allowed".
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
        // Couldn't resolve the user. Treat as blocked so we don't
        // accidentally render a gated arena to an anonymous client.
        if (!cancelled) setState('blocked');
      });
    return () => { cancelled = true; };
  }, [arena, cfg.isUpgrade, cfg.viewableBy]);

  if (state === 'loading') return <ArenaSkeleton />;
  if (state === 'allowed') return children;
  if (state === 'upgrade') return <UpgradePanel arena={cfg} />;
  return <BlockedPanel arena={cfg} accountType={accountType} />;
}

function ArenaSkeleton() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#fafaf6' }}>
      <div
        className="sticky top-0 z-30 bg-white"
        style={{ borderBottom: '1px solid #e5e3dc', height: 96 }}
      />
      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div
            className="animate-pulse rounded-[20px] mb-8"
            style={{ height: 180, background: '#efece4' }}
          />
          <div
            className="animate-pulse rounded-[14px] mb-6"
            style={{ height: 54, background: '#efece4' }}
          />
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-[16px]"
                style={{ height: 270, background: '#efece4' }}
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
    <div className="min-h-screen flex flex-col" style={{ background: '#fafaf6' }}>
      <div
        className="sticky top-0 z-30 bg-white"
        style={{ borderBottom: '1px solid #e5e3dc', height: 96 }}
      />
      <main className="flex-1 flex items-center justify-center py-12 px-6">
        <div
          className="flex flex-col items-center text-center py-16 px-8 rounded-[20px] animate-fade-up max-w-md w-full"
          style={{ background: 'white', border: '1px dashed #e5e3dc' }}
        >
          <div
            className="flex items-center justify-center mb-5"
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: color ? `${color}15` : '#f4f1e9',
              color: color || '#7a7a8c',
            }}
          >
            <Icon size={30} strokeWidth={1.6} />
          </div>
          <h3
            className="font-display text-ink m-0 mb-2"
            style={{ fontSize: 22, fontWeight: 700 }}
          >
            {title}
          </h3>
          <p
            className="text-muted m-0"
            style={{ fontSize: 14, lineHeight: 1.75 }}
          >
            {subtitle}
          </p>
        </div>
      </main>
    </div>
  );
}

function BlockedPanel({ arena, accountType }) {
  return (
    <Centered
      icon={ShieldOff}
      title="غير متاحة لحسابك"
      subtitle={`ساحة "${arena.label}" غير متاحة لنوع حسابك (${accountTypeLabel(accountType)}).`}
    />
  );
}

function UpgradePanel({ arena }) {
  return (
    <Centered
      icon={Sparkles}
      color={arena.color}
      title={`${arena.label} — ترقية اختياريّة`}
      subtitle={`وصول حصري إلى المشاريع الكبرى والفرص التمويليّة (${arena.upgradePrice}). فعّل الترقية من صفحة الباقات لعرض هذه الساحة.`}
    />
  );
}

function accountTypeLabel(t) {
  switch (t) {
    case 'individual': return 'عميل';
    case 'developer': return 'مطوّر عقاري';
    case 'entrepreneur': return 'مقاول';
    case 'engineering': return 'مكتب هندسي';
    case 'supplier': return 'مورّد';
    case 'financier': return 'جهة تمويليّة';
    default: return 'غير محدّد';
  }
}
