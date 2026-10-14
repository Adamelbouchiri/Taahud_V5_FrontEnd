import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/LanguageContext';
import { ROLES, openServicesMenu } from './landingRoles';

/* ============================================================
 *  RoleServices — «كل ما يحتاجه مشروعك في مكان واحد»
 *  ----------------------------------------------------------------
 *  One card per role (landingRoles.js). A card doesn't open a page
 *  of its own: on desktop it scrolls to the top and opens the
 *  navbar's Services menu on that role's tab, so the full list lives
 *  in one place. The desktop nav is hidden below `lg`, so there the
 *  card goes to /services instead.
 *
 *  Suppliers are «قريباً» — the card shows, but doesn't click.
 * ============================================================ */

const LG = '(min-width: 1024px)';

export default function RoleServices() {
  const { t, dir } = useTranslation();
  const navigate = useNavigate();

  const openRole = (role) => {
    if (window.matchMedia?.(LG).matches) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      openServicesMenu(role);
    } else {
      navigate('/services');
    }
  };

  return (
    <section
      id="services"
      className="relative py-16 lg:py-[72px] scroll-mt-20"
      style={{ background: 'var(--bg-surface)' }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-5 mb-7">
          <div className="max-w-[640px]">
            <h2
              className="font-display m-0 animate-fade-up"
              style={{
                fontSize: 'clamp(26px, 3vw, 36px)',
                fontWeight: 700,
                lineHeight: 1.25,
                color: 'var(--text-ink)',
              }}
            >
              {t('landing.roleServices.title')}
            </h2>
            <p
              className="m-0 mt-2 animate-fade-up"
              style={{ fontSize: 16.5, lineHeight: 1.8, color: 'var(--text-muted)' }}
            >
              {t('landing.roleServices.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="inline-flex items-center rounded-[12px] font-semibold transition-all"
            style={{
              fontSize: 14.5,
              padding: '13px 24px',
              background: 'var(--bg-ink-deep)',
              color: 'white',
              border: '1px solid var(--bg-ink-deep)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-ink-deep-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-ink-deep)')}
          >
            {t('landing.hero.ctaTrial')}
          </button>
        </div>

        <div className="rs-grid">
          {ROLES.filter((r) => !r.menuOnly).map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.key}
                type="button"
                className={`rs-card animate-fade-up${r.soon ? ' rs-soon' : ''}`}
                onClick={r.soon ? undefined : () => openRole(r.key)}
                aria-disabled={r.soon || undefined}
              >
                <span className="rs-ic">
                  <Icon size={22} strokeWidth={1.6} />
                </span>
                {/* Title and badge as separate flex items — inline, the
                    badge sits against the last letter and Arabic joins
                    the ن into it. */}
                <span className="rs-title">
                  <b>{t(`landing.roles.items.${r.key}.title`)}</b>
                  {r.soon && <em className="rs-badge">{t('landing.roles.badges.soon')}</em>}
                </span>
                {r.free && <span className="rs-free">{t(`landing.roles.badges.${r.free}`)}</span>}
                <span className="rs-d">{t(`landing.roles.items.${r.key}.desc`)}</span>
                {!r.soon && (
                  <span className="rs-more">
                    {t('landing.roles.more')} {dir === 'rtl' ? '←' : '→'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .rs-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
        }
        .rs-card {
          all: unset;
          box-sizing: border-box;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 22px 20px;
          border: 1px solid var(--border-default);
          border-radius: 18px;
          background: var(--bg-canvas);
          text-align: start;
          transition: border-color .15s, transform .15s, box-shadow .15s;
        }
        .rs-card:hover {
          border-color: var(--bg-ink-deep);
          transform: translateY(-2px);
          box-shadow: 0 14px 30px -22px rgba(20,22,63,.45);
        }
        .rs-card:focus-visible { outline: 2px solid var(--bg-ink-deep); outline-offset: 2px; }
        .rs-ic {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(44,47,124,0.08);
          color: var(--text-brand);
          display: grid;
          place-items: center;
          margin-bottom: 8px;
        }
        .rs-card b {
          font-size: 16.5px;
          font-weight: 700;
          line-height: 1.4;
          color: var(--text-ink);
        }
        .rs-title {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }
        .rs-badge {
          font-style: normal;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(184,134,42,0.14);
          color: #b8862a;
        }
        .rs-free {
          align-self: flex-start;
          font-size: 12px;
          font-weight: 700;
          color: #2f6b4a;
          background: rgba(47,107,74,0.10);
          border-radius: 999px;
          padding: 2px 10px;
        }
        .rs-d { font-size: 14px; line-height: 1.7; color: var(--text-muted); }
        .rs-more {
          margin-top: auto;
          padding-top: 10px;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-brand);
        }
        .rs-soon { cursor: default; background: var(--bg-surface); }
        .rs-soon:hover { transform: none; box-shadow: none; border-color: var(--border-default); }
        .rs-soon .rs-ic { color: var(--text-muted); background: var(--bg-surface-soft); }
        @media (max-width: 1100px) { .rs-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 860px)  { .rs-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 520px)  { .rs-grid { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
}
