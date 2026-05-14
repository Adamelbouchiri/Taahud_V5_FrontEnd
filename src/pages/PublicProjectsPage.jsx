import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Compass,
  AlertCircle,
  ArrowDownUp,
  LayoutDashboard,
  ShieldOff,
  Sparkles,
} from 'lucide-react';
import Logo from '../components/Logo';
import OpenProjectCard from '../components/project/OpenProjectCard';
import { CITIES } from '../config/constants';
import {
  PROJECT_TYPES,
  ARENAS,
  arenaConfig,
  canViewArena,
} from '../config/projectConstants';
import { projects as projectsApi, auth } from '../services';

/* ============================================================
 *  PublicProjectsPage — /projects (hub) and /projects/:arena
 *  ----------------------------------------------------------------
 *  Two modes:
 *    - Hub (no arenaSlug): tabs filtered by canViewArena().
 *    - Locked (arenaSlug set): one arena, hero header, access gate.
 *
 *  Lives OUTSIDE the dashboard so it has its own topbar and can
 *  load the user's account_type via auth.me() directly (the
 *  UserContext only wraps the dashboard layout).
 * ============================================================ */

const SORT_OPTIONS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'budget_high', label: 'أعلى ميزانية' },
  { value: 'budget_low', label: 'أقل ميزانية' },
];

export default function PublicProjectsPage({ arenaSlug = null }) {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState(null);
  // إسناد is gated by a paid upgrade flag on the user record.
  // Without it, canViewArena hides إسناد from tabs and blocks
  // the /projects/isnad route.
  const [hasIsnadUpgrade, setHasIsnadUpgrade] = useState(false);
  const [accountLoaded, setAccountLoaded] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Hub mode picks the first viewable arena once the user is loaded.
  // Locked mode (arenaSlug) just uses the slug as-is.
  const [arena, setArena] = useState(arenaSlug || 'public');
  const [city, setCity] = useState('all');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');

  // Load the user's account_type so we can filter the arena tabs
  // and enforce viewableBy on the locked single-arena view.
  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((u) => {
        if (cancelled) return;
        setAccountType(u?.account_type || null);
        setHasIsnadUpgrade(!!u?.has_isnad_upgrade);
        setAccountLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAccountLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Hub mode: when account type lands, switch to the first arena
  // the user can actually view. Avoids a flash of "no projects" on
  // a tab they're not allowed to see.
  useEffect(() => {
    if (arenaSlug) return; // locked mode
    if (!accountLoaded) return;
    if (canViewArena(arena, accountType, hasIsnadUpgrade)) return;
    const first = ARENAS.find((a) => canViewArena(a.value, accountType, hasIsnadUpgrade));
    if (first) setArena(first.value);
  }, [accountLoaded, accountType, hasIsnadUpgrade, arena, arenaSlug]);

  // Sync arena to slug when the route changes (e.g. user clicks
  // between sidebar arena links).
  useEffect(() => {
    if (arenaSlug) setArena(arenaSlug);
  }, [arenaSlug]);

  // Locked mode access gate. Block the fetch when not allowed.
  const blocked =
    arenaSlug != null &&
    accountLoaded &&
    accountType &&
    !canViewArena(arenaSlug, accountType, hasIsnadUpgrade);

  useEffect(() => {
    if (blocked) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    projectsApi
      .browse({ arena, city, type, sort })
      .then((data) => !cancelled && setItems(data))
      .catch((err) => !cancelled && setError(err.message || 'تعذّر تحميل المشاريع.'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [arena, city, type, sort, blocked]);

  const visible = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const clearFilters = () => {
    setSearch('');
    setCity('all');
    setType('all');
  };

  const currentArena = arenaConfig(arena);
  const viewableArenas = ARENAS.filter((a) => canViewArena(a.value, accountType, hasIsnadUpgrade));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#fafaf6' }}>
      <Topbar onLogo={() => navigate('/')} onDashboard={() => navigate('/dashboard')} />

      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          {arenaSlug ? (
            <ArenaHero arena={currentArena} />
          ) : (
            <HubHeader desc={currentArena.desc} />
          )}

          {/* Tabs only on the hub. Locked mode shows one arena.
              Wait for the user to load before rendering tabs —
              otherwise we'd briefly show ALL arenas (canViewArena
              returns true while accountType is null) before
              filtering kicks in. Show a placeholder strip instead. */}
          {!arenaSlug && !accountLoaded && <TabsSkeleton />}
          {!arenaSlug && accountLoaded && (
            <ArenaTabs
              arenas={viewableArenas}
              value={arena}
              onChange={setArena}
            />
          )}

          {blocked ? (
            <ArenaBlocked
              arena={currentArena}
              accountType={accountType}
              hasIsnadUpgrade={hasIsnadUpgrade}
            />
          ) : viewableArenas.length === 0 && !arenaSlug ? (
            <ArenaBlocked arena={null} accountType={accountType} hasIsnadUpgrade={hasIsnadUpgrade} />
          ) : (
            <>
              <Toolbar
                city={city}
                setCity={setCity}
                type={type}
                setType={setType}
                sort={sort}
                setSort={setSort}
                search={search}
                setSearch={setSearch}
                count={visible.length}
                loading={loading}
              />

              {loading ? (
                <SkeletonGrid />
              ) : error ? (
                <Centered icon={AlertCircle} title="حدث خطأ" subtitle={error} />
              ) : visible.length === 0 ? (
                <EmptyState search={search} onClear={clearFilters} />
              ) : (
                <div
                  className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 stagger"
                  key={`grid-${arena}`}
                >
                  {visible.map((p) => (
                    <div key={p.id} className="animate-fade-up">
                      <OpenProjectCard
                        project={p}
                        onView={(project) => navigate(`/projects/${project.id}`)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ============================================================
 *  Topbar
 * ============================================================ */
function Topbar({ onLogo, onDashboard }) {
  return (
    <header
      className="sticky top-0 z-30 bg-white"
      style={{ borderBottom: '1px solid #e5e3dc' }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-[96px] flex items-center justify-between">
        <button onClick={onLogo} className="bg-transparent border-0 p-0 cursor-pointer" aria-label="الرئيسية">
          <Logo height={68} />
        </button>
        <button
          onClick={onDashboard}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] font-semibold transition-all"
          style={{
            fontSize: 13,
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
          <LayoutDashboard size={15} strokeWidth={1.8} />
          لوحة التحكّم
        </button>
      </div>
    </header>
  );
}

/* ============================================================
 *  HubHeader — used at /projects
 * ============================================================ */
function HubHeader({ desc }) {
  return (
    <div className="mb-7 lg:mb-9 animate-fade-up">
      <div
        className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(44,47,124,0.08)',
          color: '#1f2258',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}
      >
        <Compass size={12} />
        ساحات المشاريع
      </div>
      <h1
        className="font-display text-ink m-0 mb-2"
        style={{
          fontSize: 'clamp(28px, 3.6vw, 40px)',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
        }}
      >
        تصفّح المشاريع
      </h1>
      <p
        className="text-muted m-0"
        style={{ fontSize: 14.5, lineHeight: 1.7, maxWidth: 600 }}
      >
        {desc}
      </p>
    </div>
  );
}

/* ============================================================
 *  ArenaHero — bold per-arena header used at /projects/:arena
 *  Each arena's color drives the hero gradient + accent.
 * ============================================================ */
function ArenaHero({ arena }) {
  return (
    <div
      className="relative overflow-hidden mb-8 lg:mb-10 p-7 lg:p-9 rounded-[20px] animate-slide-up-soft"
      key={arena.value}
      style={{
        background: `linear-gradient(135deg, ${arena.color} 0%, ${darken(arena.color)} 100%)`,
        color: 'white',
        boxShadow: `0 18px 40px ${arena.color}33`,
        transition: 'box-shadow 400ms ease',
      }}
    >
      {/* Decorative dot */}
      <div
        className="absolute"
        style={{
          insetInlineEnd: -60,
          top: -60,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="absolute"
        style={{
          insetInlineEnd: 40,
          bottom: -40,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          pointerEvents: 'none',
        }}
      />

      <div className="relative">
        <div
          className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.16)',
            color: 'white',
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.05em',
            backdropFilter: 'blur(2px)',
          }}
        >
          <Sparkles size={12} strokeWidth={2} />
          {arena.shortLabel || 'ساحة'}
        </div>
        <h1
          className="font-display m-0 mb-2"
          style={{
            fontSize: 'clamp(28px, 3.8vw, 42px)',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
          }}
        >
          {arena.label}
        </h1>
        <p
          className="m-0"
          style={{
            fontSize: 14.5,
            lineHeight: 1.75,
            maxWidth: 720,
            opacity: 0.92,
          }}
        >
          {arena.desc}
        </p>
      </div>
    </div>
  );
}

/* Darken a hex color for the hero gradient end-stop. Keeps the
   hero feeling like one continuous arena, not a flat color. */
function darken(hex) {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m) return hex;
  const [r, g, b] = m.map((h) => Math.max(0, parseInt(h, 16) - 36));
  return `rgb(${r}, ${g}, ${b})`;
}

/* ============================================================
 *  Toolbar
 * ============================================================ */
function Toolbar({
  city, setCity, type, setType, sort, setSort,
  search, setSearch, count, loading,
}) {
  return (
    <div className="mb-6">
      <div
        className="p-3 rounded-[14px] flex flex-col lg:flex-row lg:items-center gap-3"
        style={{ background: 'white', border: '1px solid #e5e3dc' }}
      >
        <div className="relative flex-1 min-w-0">
          <div className="absolute top-1/2 -translate-y-1/2 end-[14px] text-muted pointer-events-none flex">
            <Search size={16} strokeWidth={1.7} />
          </div>
          <input
            type="text"
            placeholder="ابحث في المشاريع المفتوحة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field"
            style={{
              padding: '10px 40px 10px 14px',
              fontSize: 13.5,
              border: 'none',
              background: '#fafaf6',
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="المدينة"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            options={[
              { value: 'all', label: 'كل المدن' },
              ...CITIES.map((c) => ({ value: c, label: c })),
            ]}
          />
          <FilterSelect
            label="النوع"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: 'all', label: 'كل الأنواع' },
              ...PROJECT_TYPES.map((t) => ({ value: t, label: t })),
            ]}
          />
          <FilterSelect
            label="ترتيب"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            options={SORT_OPTIONS}
            icon={ArrowDownUp}
          />
        </div>
      </div>

      {!loading && (
        <div
          className="flex items-center justify-between flex-wrap gap-3 mt-4 px-1"
          style={{ fontSize: 12.5, color: '#7a7a8c' }}
        >
          <span>
            <span className="font-bold text-ink">{count}</span>{' '}
            {count === 1 ? 'مشروع متاح' : 'مشروع متاحة'}
          </span>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, icon: Icon }) {
  return (
    <div className="relative">
      {Icon && (
        <div
          className="absolute top-1/2 -translate-y-1/2 end-3 pointer-events-none flex"
          style={{ color: '#7a7a8c' }}
        >
          <Icon size={14} strokeWidth={1.7} />
        </div>
      )}
      <select
        value={value}
        onChange={onChange}
        aria-label={label}
        className="appearance-none rounded-[10px] cursor-pointer"
        style={{
          padding: Icon ? '9px 32px 9px 30px' : '9px 32px 9px 14px',
          fontSize: 13,
          fontWeight: 500,
          background: '#fafaf6',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237a7a8c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'left 12px center',
          border: '1px solid #efece4',
          color: '#0f1129',
          fontFamily: 'inherit',
          minWidth: 130,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ============================================================
 *  Skeleton + empty
 * ============================================================ */
function SkeletonGrid() {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="p-6 rounded-[16px] animate-pulse"
          style={{ background: 'white', border: '1px solid #e5e3dc', height: 270 }}
        />
      ))}
    </div>
  );
}

function EmptyState({ search, onClear }) {
  return (
    <Centered
      icon={Compass}
      title={search ? 'لا توجد نتائج تطابق بحثك' : 'لا توجد مشاريع مفتوحة حالياً'}
      subtitle={
        search
          ? 'جرّب كلماتٍ أخرى أو أعد تعيين الفلاتر للحصول على نتائج أكثر.'
          : 'تحقّق لاحقاً من المشاريع الجديدة، أو أعد تعيين الفلاتر.'
      }
      cta={{ label: 'إعادة تعيين الفلاتر', onClick: onClear }}
    />
  );
}

function Centered({ icon: Icon, title, subtitle, cta }) {
  return (
    <div
      className="flex flex-col items-center text-center py-20 px-6 rounded-[18px] animate-fade-up"
      style={{ background: 'white', border: '1px dashed #e5e3dc' }}
    >
      <div
        className="flex items-center justify-center mb-5"
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: '#f4f1e9',
          color: '#7a7a8c',
        }}
      >
        <Icon size={28} strokeWidth={1.6} />
      </div>
      <h3
        className="font-display text-ink m-0 mb-2"
        style={{ fontSize: 20, fontWeight: 700 }}
      >
        {title}
      </h3>
      <p
        className="text-muted m-0 max-w-md"
        style={{ fontSize: 14, lineHeight: 1.7 }}
      >
        {subtitle}
      </p>
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-[10px] font-semibold transition-all"
          style={{
            background: 'white',
            fontSize: 13.5,
            border: '1px solid #e5e3dc',
            color: '#3a3a52',
            cursor: 'pointer',
          }}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

/* ============================================================
 *  ArenaBlocked — shown when account_type isn't in arena.viewableBy
 *  or when an upgrade-gated arena hasn't been purchased.
 * ============================================================ */
function ArenaBlocked({ arena, accountType, hasIsnadUpgrade }) {
  // إسناد is paywalled. If the user otherwise qualifies (role is in
  // viewableBy) but hasn't paid, surface the upgrade pitch instead
  // of the generic "غير متاحة لحسابك" message.
  if (
    arena?.isUpgrade &&
    !hasIsnadUpgrade &&
    (arena.viewableBy || []).includes(accountType)
  ) {
    return (
      <Centered
        icon={Sparkles}
        title={`${arena.label} — ترقية اختياريّة`}
        subtitle={`وصول حصري إلى المشاريع الكبرى والفرص التمويليّة (${arena.upgradePrice}). فعّل الترقية من صفحة الباقات لعرض هذه الساحة.`}
      />
    );
  }
  const subtitle = arena
    ? `هذه الساحة غير متاحة لنوع حسابك (${accountTypeLabel(accountType)}).`
    : 'لا توجد ساحة متاحة لنوع حسابك حالياً.';
  return (
    <Centered
      icon={ShieldOff}
      title="غير متاحة لحسابك"
      subtitle={subtitle}
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

/* ============================================================
 *  TabsSkeleton — placeholder while we resolve the user's role.
 *  Prevents the brief flash of all-arenas tabs on refresh.
 * ============================================================ */
function TabsSkeleton() {
  return (
    <div className="flex gap-2 mb-6 overflow-hidden pb-1 -mx-1 px-1">
      {[120, 110, 130].map((w, i) => (
        <div
          key={i}
          className="animate-pulse rounded-[12px]"
          style={{ width: w, height: 44, background: '#efece4' }}
        />
      ))}
    </div>
  );
}

/* ============================================================
 *  ArenaTabs — selector at the top of the hub view. Hides arenas
 *  the user can't view (per the V5 viewableBy matrix).
 * ============================================================ */
function ArenaTabs({ arenas, value, onChange }) {
  return (
    <div
      className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1 smooth-scroll"
      style={{ scrollbarWidth: 'none' }}
    >
      {arenas.map((a) => {
        const active = value === a.value;
        return (
          <button
            type="button"
            key={a.value}
            onClick={() => onChange(a.value)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] font-semibold transition-all whitespace-nowrap"
            style={{
              fontSize: 13.5,
              background: active ? a.color : 'white',
              color: active ? 'white' : '#3a3a52',
              border: `1.5px solid ${active ? a.color : '#e5e3dc'}`,
              cursor: 'pointer',
              boxShadow: active ? `0 6px 14px ${a.color}30` : 'none',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.borderColor = a.color;
                e.currentTarget.style.color = a.color;
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.borderColor = '#e5e3dc';
                e.currentTarget.style.color = '#3a3a52';
              }
            }}
          >
            <span
              className="rounded-full"
              style={{
                width: 8,
                height: 8,
                background: active ? 'white' : a.color,
                opacity: active ? 1 : 0.85,
              }}
            />
            {a.label}
          </button>
        );
      })}
    </div>
  );
}
