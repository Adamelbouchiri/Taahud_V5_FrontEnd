import React from 'react';
import { useNavigate } from 'react-router-dom';
import Illustration from './ProjectIllustrations';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  FeaturedProjects — «مشاريع تعاهد»
 *  ----------------------------------------------------------------
 *  Three sample project cards under the رصد section. Each card:
 *
 *    cover   the project-type illustration on its tinted band, with
 *            a faint grid over it and two tags — type (gold) and
 *            scope (private / public / brokered)
 *    body    stage with a coloured dot, title, city · duration ·
 *            grade, then value + «التفاصيل» on a ruled footer
 *
 *  Stage colours: open → green, awarded → gold, in execution → navy.
 *
 *  Projects are hardcoded marketing examples — replace once the
 *  BE has a /projects/featured endpoint. Card copy comes from
 *  landing.featuredProjects.* so language switching just works.
 * ============================================================ */

const STAGE_COLOR = {
  exec: 'var(--text-brand)',
  open: '#2f6b4a',
  award: '#a77f33',
};

const PROJECTS = [
  { key: 'residential', stage: 'exec', value: 14, illustration: 'villa', bandBg: '#f8dde5' },
  { key: 'commercial', stage: 'open', value: 25, illustration: 'tower', bandBg: '#fbeec1' },
  { key: 'infrastructure', stage: 'award', value: 19, illustration: 'highway', bandBg: '#d4ecda' },
];

export default function FeaturedProjects() {
  const navigate = useNavigate();
  const { t, dir } = useTranslation();
  const arrow = dir === 'rtl' ? '←' : '→';

  return (
    <section
      id="featured-projects"
      className="relative py-20 lg:py-24 scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10 lg:mb-12">
          <div>
            <span
              className="block mb-6"
              aria-hidden
              style={{ width: 56, height: 3, borderRadius: 2, background: '#c9a35a' }}
            />
            <h2
              className="font-display m-0 animate-fade-up"
              style={{
                fontSize: 'clamp(28px, 3.6vw, 42px)',
                fontWeight: 700,
                lineHeight: 1.2,
                color: 'var(--text-ink)',
              }}
            >
              {t('landing.featuredProjects.title')}
            </h2>
            <p
              className="m-0 mt-3 animate-fade-up"
              style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--text-muted)' }}
            >
              {t('landing.featuredProjects.sampleNote')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="inline-flex items-center rounded-[10px] font-semibold transition-colors animate-fade-up"
            style={{
              fontSize: 15,
              height: 52,
              padding: '0 26px',
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-ink)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--text-ink)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
          >
            {t('landing.featuredProjects.seeAll')}
          </button>
        </div>

        <div className="fp-grid">
          {PROJECTS.map((p, i) => (
            <ProjectCard
              key={p.key}
              project={p}
              delay={i * 0.06}
              t={t}
              arrow={arrow}
              onDetails={() => navigate('/projects')}
            />
          ))}
        </div>
      </div>

      <style>{`
        .fp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        @media (max-width: 960px) { .fp-grid { grid-template-columns: 1fr; } }

        .fp-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 18px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: border-color .2s;
        }
        .fp-card:hover { border-color: var(--border-strong); }

        .fp-cover { position: relative; height: 172px; overflow: hidden; isolation: isolate; }
        .fp-cover::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0; /* behind the illustration, which follows it in paint order */
          pointer-events: none;
          background-image:
            linear-gradient(rgba(44,47,124,.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(44,47,124,.07) 1px, transparent 1px);
          background-size: 22px 22px;
        }
        .fp-tags { position: absolute; top: 18px; inset-inline-start: 18px; z-index: 2; display: flex; flex-wrap: wrap; gap: 6px; }
        .fp-type, .fp-scope { font-size: 13px; font-weight: 700; border-radius: 6px; }
        .fp-type { color: #14163f; background: #c9a35a; padding: 2px 10px; }
        .fp-scope { color: #2c2f7c; background: #fff; border: 1px solid rgba(44,47,124,.35); padding: 1px 10px; }

        .fp-body { padding: 24px; display: flex; flex-direction: column; flex: 1; }
        .fp-stage { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .fp-stage::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
        .fp-body h3 { font-size: 19px; font-weight: 700; line-height: 1.6; margin: 8px 0 12px; color: var(--text-ink); }
        .fp-meta { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 14px; color: var(--text-muted); margin-bottom: 24px; }
        .fp-foot {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          padding-top: 20px;
          border-top: 1px solid var(--border-default);
        }
        .fp-val { display: inline-flex; align-items: baseline; gap: 6px; }
        .fp-val b { font-size: 28px; font-weight: 700; line-height: 1; color: var(--text-ink); }
        .fp-val span { font-size: 14px; font-weight: 500; color: var(--text-muted); }
        .fp-more {
          background: none;
          border: 0;
          padding: 0;
          cursor: pointer;
          font-family: inherit;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-brand);
        }
        .fp-more:hover { text-decoration: underline; }
      `}</style>
    </section>
  );
}

function ProjectCard({ project, delay, t, arrow, onDetails }) {
  const k = `landing.featuredProjects.cards.${project.key}`;

  return (
    <article className="fp-card animate-fade-up" style={{ animationDelay: `${delay}s` }}>
      <div className="fp-cover" style={{ background: project.bandBg }}>
        <span className="fp-tags">
          <span className="fp-type">{t(`${k}.type`)}</span>
          <span className="fp-scope">{t(`${k}.scope`)}</span>
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <Illustration name={project.illustration} />
        </div>
      </div>

      <div className="fp-body">
        <span className="fp-stage" style={{ color: STAGE_COLOR[project.stage] }}>
          {t(`${k}.status`)}
        </span>
        <h3 className="font-display">{t(`${k}.title`)}</h3>
        <div className="fp-meta">
          <span>{t(`${k}.city`)}</span>
          <span>{t(`${k}.duration`)}</span>
          <span>{t(`${k}.role`)}</span>
        </div>
        <div className="fp-foot">
          <span className="fp-val">
            <b className="font-display">{project.value}</b>
            <span>{t('landing.featuredProjects.valueUnit')}</span>
          </span>
          <button type="button" className="fp-more" onClick={onDetails}>
            {t('landing.featuredProjects.details')} {arrow}
          </button>
        </div>
      </div>
    </article>
  );
}
