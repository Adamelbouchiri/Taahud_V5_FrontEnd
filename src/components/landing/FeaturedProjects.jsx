import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  MapPin,
  Calendar,
  HardHat,
  Award,
} from 'lucide-react';
import Illustration from './ProjectIllustrations';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  FeaturedProjects — showcase three highlighted projects
 *  ----------------------------------------------------------------
 *  Marketing strip used on the landing page to give visitors a
 *  concrete sense of the kind of opportunities they'd see inside
 *  the platform. Three cards, each tinted by project type:
 *
 *      residential    pink
 *      commercial     cream/yellow
 *      infrastructure mint
 *
 *  Projects are hardcoded marketing examples — replace once the
 *  BE has a /projects/featured endpoint. Card copy is pulled from
 *  the i18n dictionary at render-time so language switching works
 *  without restructuring the static data.
 * ============================================================ */

const PROJECTS = [
  {
    id: 'residential',
    key: 'residential',
    typeColor: '#b8276a',
    statusColor: '#136d4a',
    price: '12.5M',
    illustration: 'villa',
    bandBg: '#f8dde5',
    roleIcon: HardHat,
  },
  {
    id: 'commercial',
    key: 'commercial',
    typeColor: '#a17827',
    statusColor: '#136d4a',
    price: '38M',
    illustration: 'tower',
    bandBg: '#fbeec1',
    roleIcon: Award,
  },
  {
    id: 'infrastructure',
    key: 'infrastructure',
    typeColor: '#0d5538',
    statusColor: '#136d4a',
    price: '8.2M',
    illustration: 'highway',
    bandBg: '#d4ecda',
    roleIcon: HardHat,
  },
];

export default function FeaturedProjects() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section
      id="featured-projects"
      className="relative py-24 lg:py-32 scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12 lg:mb-14">
          <div className="text-start">
            <div
              className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full animate-fade-up"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-ink-soft)',
              }}
            >
              {t('landing.featuredProjects.eyebrow')}
            </div>
            <h2
              className="font-display m-0 animate-fade-up"
              style={{
                fontSize: 'clamp(28px, 3.8vw, 42px)',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.015em',
                color: 'var(--text-ink)',
              }}
            >
              {t('landing.featuredProjects.title')}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] font-semibold transition-all animate-fade-up"
            style={{
              fontSize: 13,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-ink-soft)',
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0f1147';
              e.currentTarget.style.color = '#0f1147';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.color = 'var(--text-ink-soft)';
            }}
          >
            {t('landing.featuredProjects.seeAll')}
            <ArrowLeft size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {PROJECTS.map((p, i) => (
            <ProjectCard key={p.id} project={p} delay={i * 0.06} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectCard({ project, delay, t }) {
  const k = `landing.featuredProjects.cards.${project.key}`;
  const RoleIcon = project.roleIcon;

  return (
    <article
      className="relative rounded-[18px] overflow-hidden flex flex-col transition-all animate-fade-up hover:-translate-y-1"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        animationDelay: `${delay}s`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          background: project.bandBg,
          height: 178,
        }}
      >
        <span
          className="absolute inline-flex items-center gap-1 font-bold rounded-full"
          style={{
            top: 14,
            insetInlineStart: 14,
            background: '#8a6a1f',
            color: 'white',
            fontSize: 10.5,
            padding: '4px 9px',
            letterSpacing: '0.02em',
            zIndex: 1,
          }}
        >
          <Star size={11} strokeWidth={2.2} fill="currentColor" />
          {t('common.featured')}
        </span>

        <div className="absolute inset-0 flex items-center justify-center">
          <Illustration name={project.illustration} />
        </div>
      </div>

      <div className="px-6 pt-5 pb-5 flex flex-col flex-1">
        <div
          className="flex items-center gap-2 mb-2"
          style={{ fontSize: 12, fontWeight: 600 }}
        >
          <span style={{ color: project.typeColor }}>{t(`${k}.type`)}</span>
          <span
            aria-hidden
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: '#cbcec9',
            }}
          />
          <span style={{ color: project.statusColor }}>
            {t(`${k}.status`)}
          </span>
        </div>

        <h3
          className="font-display m-0 mb-3"
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--text-ink)',
            lineHeight: 1.35,
          }}
        >
          {t(`${k}.title`)}
        </h3>

        <div
          className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mb-5"
          style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
        >
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} strokeWidth={1.8} />
            {t(`${k}.city`)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} strokeWidth={1.8} />
            {t(`${k}.duration`)}
          </span>
          <span className="inline-flex items-center gap-1">
            <RoleIcon size={12} strokeWidth={1.8} />
            {t(`${k}.role`)}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] font-semibold transition-all"
            style={{
              fontSize: 12.5,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-ink-soft)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0f1147';
              e.currentTarget.style.color = '#0f1147';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.color = 'var(--text-ink-soft)';
            }}
          >
            {t('common.details')}
            <ArrowLeft size={12} strokeWidth={2} />
          </button>

          <div
            className="font-display font-bold inline-flex items-baseline gap-1"
            style={{ fontSize: 22, color: 'var(--text-ink)', lineHeight: 1 }}
          >
            {project.price}
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              {t('common.currency')}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
