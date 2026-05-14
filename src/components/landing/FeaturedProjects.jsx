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
 *  Card header is a tall pastel band with the type icon centered
 *  and a "مميز" pill in the corner. Footer is a white area with
 *  tags, title, meta, price, and a "التفاصيل" CTA.
 *
 *  Projects are hardcoded marketing examples — replace once the
 *  BE has a /projects/featured endpoint.
 * ============================================================ */

const PROJECTS = [
  {
    id: 'residential',
    type: 'سكني',
    typeColor: '#b8276a',
    status: 'مرحلة تنفيذ',
    statusColor: '#136d4a',
    title: 'مجمع سكني فاخر — حي الياسمين، الرياض',
    city: 'الرياض',
    duration: '18 شهر',
    role: 'مقاول عام',
    price: '12.5M',
    illustration: 'villa',
    bandBg: '#f8dde5',
  },
  {
    id: 'commercial',
    type: 'تجاري',
    typeColor: '#a17827',
    status: 'مفتوح للمناقصة',
    statusColor: '#136d4a',
    title: 'برج مكاتب إداري — جدة الكورنيش',
    city: 'جدة',
    duration: '24 شهر',
    role: 'درجة أولى',
    price: '38M',
    illustration: 'tower',
    bandBg: '#fbeec1',
  },
  {
    id: 'infrastructure',
    type: 'بنية تحتية',
    typeColor: '#0d5538',
    status: 'مفتوح',
    statusColor: '#136d4a',
    title: 'مشروع طرق وتشجير — الدمام',
    city: 'الدمام',
    duration: '12 شهر',
    role: 'مقاول معتمد',
    price: '8.2M',
    illustration: 'highway',
    bandBg: '#d4ecda',
  },
];

export default function FeaturedProjects() {
  const navigate = useNavigate();

  return (
    <section
      id="featured-projects"
      className="relative py-24 lg:py-32 scroll-mt-20"
      style={{ background: '#fafaf6' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Header row: eyebrow + headline on the right, link on the left.
            On mobile the link wraps below for a cleaner stack. */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12 lg:mb-14">
          <div className="text-right">
            <div
              className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full animate-fade-up"
              style={{
                background: 'white',
                border: '1px solid #e5e3dc',
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: '#3a3a52',
              }}
            >
              المشاريع المميزة
            </div>
            <h2
              className="font-display m-0 animate-fade-up"
              style={{
                fontSize: 'clamp(28px, 3.8vw, 42px)',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.015em',
                color: '#0f1147',
              }}
            >
              فرص حقيقية للمقاولين والمطوّرين
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] font-semibold transition-all animate-fade-up"
            style={{
              fontSize: 13,
              background: 'white',
              border: '1px solid #e5e3dc',
              color: '#3a3a52',
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0f1147';
              e.currentTarget.style.color = '#0f1147';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e3dc';
              e.currentTarget.style.color = '#3a3a52';
            }}
          >
            شاهد جميع المشاريع
            <ArrowLeft size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {PROJECTS.map((p, i) => (
            <ProjectCard key={p.id} project={p} delay={i * 0.06} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectCard({ project, delay }) {
  return (
    <article
      className="relative rounded-[18px] overflow-hidden flex flex-col transition-all animate-fade-up hover:-translate-y-1"
      style={{
        background: 'white',
        border: '1px solid #e8e6dd',
        animationDelay: `${delay}s`,
        boxShadow: '0 4px 14px rgba(15,17,71,0.04)',
      }}
    >
      {/* Pastel band with the scene illustration and "مميز" pill */}
      <div
        className="relative overflow-hidden"
        style={{
          background: project.bandBg,
          height: 178,
        }}
      >
        {/* "مميز" pill — top-start corner, above the illustration */}
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
          مميز
        </span>

        {/* Illustration fills the band */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Illustration name={project.illustration} />
        </div>
      </div>

      {/* Body */}
      <div className="px-6 pt-5 pb-5 flex flex-col flex-1">
        {/* Type · status tags */}
        <div
          className="flex items-center gap-2 mb-2"
          style={{ fontSize: 12, fontWeight: 600 }}
        >
          <span style={{ color: project.typeColor }}>{project.type}</span>
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
            {project.status}
          </span>
        </div>

        {/* Title */}
        <h3
          className="font-display m-0 mb-3"
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: '#0f1147',
            lineHeight: 1.35,
          }}
        >
          {project.title}
        </h3>

        {/* Meta row: city · duration · role */}
        <div
          className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mb-5"
          style={{ fontSize: 12.5, color: '#5a5b78' }}
        >
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} strokeWidth={1.8} />
            {project.city}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} strokeWidth={1.8} />
            {project.duration}
          </span>
          <span className="inline-flex items-center gap-1">
            {project.id === 'commercial' ? (
              <Award size={12} strokeWidth={1.8} />
            ) : (
              <HardHat size={12} strokeWidth={1.8} />
            )}
            {project.role}
          </span>
        </div>

        {/* Footer: details button + price, pushed to bottom */}
        <div className="mt-auto flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] font-semibold transition-all"
            style={{
              fontSize: 12.5,
              background: 'white',
              border: '1px solid #e5e3dc',
              color: '#3a3a52',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0f1147';
              e.currentTarget.style.color = '#0f1147';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e3dc';
              e.currentTarget.style.color = '#3a3a52';
            }}
          >
            التفاصيل
            <ArrowLeft size={12} strokeWidth={2} />
          </button>

          <div
            className="font-display font-bold inline-flex items-baseline gap-1"
            style={{ fontSize: 22, color: '#0f1147', lineHeight: 1 }}
          >
            {project.price}
            <span style={{ fontSize: 12, color: '#7a7a8c', fontWeight: 600 }}>
              ر.س
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
