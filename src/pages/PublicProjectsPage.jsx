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
import LanguageThemeSwitcher from '../components/LanguageThemeSwitcher';
import OpenProjectCard from '../components/project/OpenProjectCard';
import { CITIES } from '../config/constants';
import { cityLabel } from '../config/cityTranslations';
import {
  PROJECT_TYPES,
  ARENAS,
  arenaConfig,
  canViewArena,
} from '../config/projectConstants';
import { projects as projectsApi, auth } from '../services';
import useArenaAddons from '../hooks/useArenaAddons';
import { useTranslation } from '../i18n/LanguageContext';

/* ============================================================
 *  PublicProjectsPage — /projects (hub) and /projects/:arena
 *  ----------------------------------------------------------------
 *  Two modes:
 *    - Hub (no arenaSlug): tabs filtered by canViewArena().
 *    - Locked (arenaSlug set): one arena, hero header, access gate.
 *
 *  Lives OUTSIDE the dashboard so it has its own topbar and can
 *  load the user's account_type via auth.me() directly.
 * ============================================================ */

// Budget is sealed from browsers until the owner accepts (see
// canSeeProjectBudget) — sorting by a hidden number would be
// confusing UX, so we expose only the "newest" sort here.
const SORT_KEYS = ['newest'];
const SORT_VALUE_TO_KEY = {
  newest: 'newest',
};

export default function PublicProjectsPage({ arenaSlug = null, accessGranted = false }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [accountType, setAccountType] = useState(null);
  const [userId, setUserId] = useState(null);
  // Arena add-ons (isnad / solidarity) the user owns — drives which
  // arenas are viewable. Resolved from active subscriptions.
  const { addons } = useArenaAddons();
  const [accountLoaded, setAccountLoaded] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [arena, setArena] = useState(arenaSlug || 'public');
  const [city, setCity] = useState('all');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((u) => {
        if (cancelled) return;
        setAccountType(u?.account_type || null);
        setUserId(u?.id ?? null);
        setAccountLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAccountLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (arenaSlug) return;
    if (!accountLoaded) return;
    if (canViewArena(arena, accountType, addons)) return;
    const first = ARENAS.find((a) =>
      canViewArena(a.value, accountType, addons)
    );
    if (first) setArena(first.value);
  }, [accountLoaded, accountType, addons, arena, arenaSlug]);

  useEffect(() => {
    if (arenaSlug) setArena(arenaSlug);
  }, [arenaSlug]);

  // `accessGranted` means an upstream route guard (RequireArenaAccess)
  // already verified access for this arena, so we trust it and never
  // show the in-page block — avoids a redundant gate (and its
  // "activate the add-on" box) double-firing while add-on state loads.
  const blocked =
    !accessGranted &&
    arenaSlug != null &&
    accountLoaded &&
    accountType &&
    !canViewArena(arenaSlug, accountType, addons);

  useEffect(() => {
    if (blocked) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    projectsApi
      .browse({ arena, city, type, sort })
      .then((data) => !cancelled && setItems(data))
      .catch(
        (err) => !cancelled && setError(err.message || t('projects.list.loadError'))
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [arena, city, type, sort, blocked]);

  // Client-side filter. The BE only supports `arena` / `status` /
  // `mine` / pagination (FRONTEND_INTEGRATION.md §10.2) — `city`,
  // `type`, and the free-text `search` are applied here against
  // the array returned from /api/projects. Keep this filter chain
  // in sync with the UI controls in <Toolbar />.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (city !== 'all' && (p.city || '').toLowerCase() !== city.toLowerCase()) {
        return false;
      }
      if (type !== 'all' && (p.type || '').toLowerCase() !== type.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.type || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    });
  }, [items, search, city, type]);

  const clearFilters = () => {
    setSearch('');
    setCity('all');
    setType('all');
  };

  const currentArena = arenaConfig(arena);
  const viewableArenas = ARENAS.filter((a) =>
    canViewArena(a.value, accountType, addons)
  );

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <Topbar onLogo={() => navigate('/')} onDashboard={() => navigate('/dashboard')} />

      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          {arenaSlug ? (
            <ArenaHero arena={currentArena} arenaSlug={arena} />
          ) : (
            <HubHeader desc={t(`arena.${arena}.desc`)} />
          )}

          {/* Arena switching lives in the dashboard sidebar only —
              browsing /projects shows whatever arena the URL targets
              (or the default fallback in hub mode) without an
              in-page tab strip that would let users hop sideways. */}

          {blocked ? (
            <ArenaBlocked
              arena={currentArena}
              arenaSlug={arena}
              accountType={accountType}
              addons={addons}
            />
          ) : viewableArenas.length === 0 && !arenaSlug ? (
            <ArenaBlocked
              arena={null}
              arenaSlug={null}
              accountType={accountType}
              addons={addons}
            />
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
                <Centered
                  icon={AlertCircle}
                  title={t('projects.list.errorTitle')}
                  subtitle={error}
                />
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
                        currentUserId={userId}
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
  const { t } = useTranslation();
  return (
    <header
      className="sticky top-0 z-30"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-[96px] flex items-center justify-between">
        <button
          onClick={onLogo}
          className="bg-transparent border-0 p-0 cursor-pointer"
          aria-label={t('nav.backHome')}
        >
          <Logo height={68} />
        </button>
        <div className="flex items-center gap-2">
          <LanguageThemeSwitcher compact />
          <button
            onClick={onDashboard}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] font-semibold transition-all"
            style={{
              fontSize: 13,
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
            <LayoutDashboard size={15} strokeWidth={1.8} />
            {t('nav.dashboard')}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
 *  HubHeader — /projects
 * ============================================================ */
function HubHeader({ desc }) {
  const { t } = useTranslation();
  return (
    <div className="mb-7 lg:mb-9 animate-fade-up">
      <div
        className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(44,47,124,0.08)',
          color: 'var(--text-brand-deep)',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}
      >
        <Compass size={12} />
        {t('projects.list.hubEyebrow')}
      </div>
      <h1
        className="font-display m-0 mb-2"
        style={{
          fontSize: 'clamp(28px, 3.6vw, 40px)',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
          color: 'var(--text-ink)',
        }}
      >
        {t('projects.list.hubTitle')}
      </h1>
      <p
        className="m-0"
        style={{
          fontSize: 14.5,
          lineHeight: 1.7,
          maxWidth: 600,
          color: 'var(--text-muted)',
        }}
      >
        {desc}
      </p>
    </div>
  );
}

/* ============================================================
 *  ArenaHero — /projects/:arena
 * ============================================================ */
function ArenaHero({ arena, arenaSlug }) {
  const { t } = useTranslation();
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
          {t(`arena.${arenaSlug}.short`) || t('projects.list.hubEyebrow')}
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
          {t(`arena.${arenaSlug}.label`)}
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
          {t(`arena.${arenaSlug}.desc`)}
        </p>
      </div>
    </div>
  );
}

function darken(hex) {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m) return hex;
  const [r, g, b] = m.map((h) => Math.max(0, parseInt(h, 16) - 36));
  return `rgb(${r}, ${g}, ${b})`;
}

/* ============================================================
 *  Toolbar
 * ============================================================ */
function Toolbar({ city, setCity, type, setType, sort, setSort, search, setSearch, count, loading }) {
  const { t, lang } = useTranslation();
  return (
    <div className="mb-6">
      <div
        className="p-3 rounded-[14px] flex flex-col lg:flex-row lg:items-center gap-3"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="relative flex-1 min-w-0">
          <div
            className="absolute top-1/2 -translate-y-1/2 end-[14px] pointer-events-none flex"
            style={{ color: 'var(--text-muted)' }}
          >
            <Search size={16} strokeWidth={1.7} />
          </div>
          <input
            type="text"
            placeholder={t('projects.list.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field"
            style={{
              padding: '10px 40px 10px 14px',
              fontSize: 13.5,
              border: 'none',
              background: 'var(--bg-canvas)',
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label={t('projects.list.filters.cityLabel')}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            options={[
              { value: 'all', label: t('projects.list.filters.allCities') },
              ...CITIES.map((c) => ({ value: c, label: cityLabel(c, lang) })),
            ]}
          />
          <FilterSelect
            label={t('projects.list.filters.typeLabel')}
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: 'all', label: t('projects.list.filters.allTypes') },
              ...PROJECT_TYPES.map((tp) => ({ value: tp, label: tp })),
            ]}
          />
          <FilterSelect
            label={t('projects.list.filters.sortLabel')}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            options={SORT_KEYS.map((k) => ({
              value: k,
              label: t(`projects.list.sort.${SORT_VALUE_TO_KEY[k]}`),
            }))}
            icon={ArrowDownUp}
          />
        </div>
      </div>

      {!loading && (
        <div
          className="flex items-center justify-between flex-wrap gap-3 mt-4 px-1"
          style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
        >
          <span>
            {t(
              count === 1
                ? 'projects.list.countSingular'
                : 'projects.list.countPlural',
              { count }
            )}
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
          style={{ color: 'var(--text-muted)' }}
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
          background: 'var(--bg-canvas)',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237a7a8c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'left 12px center',
          border: '1px solid var(--border-soft)',
          color: 'var(--text-ink)',
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
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            height: 270,
          }}
        />
      ))}
    </div>
  );
}

function EmptyState({ search, onClear }) {
  const { t } = useTranslation();
  return (
    <Centered
      icon={Compass}
      title={search ? t('projects.list.emptySearchTitle') : t('projects.list.emptyTitle')}
      subtitle={
        search
          ? t('projects.list.emptySearchSubtitle')
          : t('projects.list.emptySubtitle')
      }
      cta={{ label: t('projects.list.resetFilters'), onClick: onClear }}
    />
  );
}

function Centered({ icon: Icon, title, subtitle, cta }) {
  return (
    <div
      className="flex flex-col items-center text-center py-20 px-6 rounded-[18px] animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px dashed var(--border-default)',
      }}
    >
      <div
        className="flex items-center justify-center mb-5"
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'var(--bg-cream)',
          color: 'var(--text-muted)',
        }}
      >
        <Icon size={28} strokeWidth={1.6} />
      </div>
      <h3
        className="font-display m-0 mb-2"
        style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-ink)' }}
      >
        {title}
      </h3>
      <p
        className="m-0 max-w-md"
        style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {subtitle}
      </p>
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-[10px] font-semibold transition-all"
          style={{
            background: 'var(--bg-surface)',
            fontSize: 13.5,
            border: '1px solid var(--border-default)',
            color: 'var(--text-ink-soft)',
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
 *  ArenaBlocked — viewableBy / paywall gate
 * ============================================================ */
function ArenaBlocked({ arena, arenaSlug, accountType, addons }) {
  const { t } = useTranslation();
  const addonMissing = arena?.addonCode && !addons?.[arena.addonCode];
  if (
    arena?.isUpgrade &&
    addonMissing &&
    (arena.viewableBy || []).includes(accountType)
  ) {
    const arenaLabel = t(`arena.${arenaSlug}.label`);
    return (
      <Centered
        icon={Sparkles}
        title={t('projects.list.blockedIsnadTitle', { arena: arenaLabel })}
        subtitle={t('projects.list.blockedIsnadSubtitle', {
          arena: arenaLabel,
          price: t(`arena.${arenaSlug}.upgradePrice`),
        })}
      />
    );
  }
  const role = accountType
    ? t(`accountType.${accountType}`)
    : t('accountType.unknown');
  const subtitle = arena
    ? t('projects.list.blockedAccount', { role })
    : t('projects.list.blockedNoArena');
  return (
    <Centered
      icon={ShieldOff}
      title={t('projects.list.blocked')}
      subtitle={subtitle}
    />
  );
}

