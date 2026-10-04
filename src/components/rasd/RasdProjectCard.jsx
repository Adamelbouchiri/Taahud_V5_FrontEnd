import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CalendarDays, DoorOpen, ChevronLeft, Layers } from 'lucide-react';
import Ltr from '../Ltr';
import { Card, Badge } from '../admin/AdminUI';
import { cityLabel, regionLabel } from '../../config/cityTranslations';
import { formatDate } from '../../utils/date';
import { formatNumber } from '../../utils/money';
import {
  RASD_STAGE_TONE,
  RASD_CONFIDENCE_TONE,
  hasOpenRoles,
  showProgress,
  progressValue,
} from '../../config/rasdConstants';
import RasdProgressBar from './RasdProgressBar';

/* ============================================================
 *  RasdProjectCard — one row of GET /rasd/projects.
 *  ----------------------------------------------------------------
 *  Two states in one card. A project with open roles is an
 *  OPPORTUNITY and is drawn as one: an accent strip, the roles as a
 *  badge row, the confidence badge next to them, and the caution
 *  line. Everything else is a plain market record.
 *
 *  Only 50 of 737 projects currently have open roles, so the plain
 *  state is the common one and is styled to look deliberate rather
 *  than empty.
 *
 *  Nullables are the rule, not the exception, in hand-collected
 *  market data: `estimated_value` is null on every row today and
 *  `announced_at` on about twenty. Each renders its own «not
 *  announced» copy — never a zero, never a blank cell.
 * ============================================================ */
export default function RasdProjectCard({ project, t, lang, labels }) {
  const navigate = useNavigate();
  const isOpportunity = hasOpenRoles(project);
  const accent = '#136d4a';

  return (
    <Card
      padded={false}
      style={
        isOpportunity
          ? { borderColor: `${accent}3a`, boxShadow: `0 1px 0 ${accent}14` }
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => navigate(`/rasd/projects/${project.id}`)}
        className="w-full text-start flex items-start gap-4 px-5 py-4"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: isOpportunity ? `${accent}14` : 'rgba(44,47,124,0.07)',
            color: isOpportunity ? accent : 'var(--accent-primary)',
          }}
        >
          {isOpportunity ? (
            <DoorOpen size={18} strokeWidth={1.8} />
          ) : (
            <Layers size={18} strokeWidth={1.7} />
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-semibold"
              style={{ fontSize: 14.5, color: 'var(--text-ink)', lineHeight: 1.45 }}
            >
              {project.name}
            </span>
            <Badge tone={RASD_STAGE_TONE[project.stage] || 'default'}>
              {labels.stage(project.stage, project.stage_label)}
            </Badge>
            {/* Mirrored in from Taahud's own arena rather than
                collected from the market. Flagged so nobody reads it
                as a market signal — and the profile shows it no
                contact section at all. */}
            {project.is_internal && (
              <Badge tone="primary">{t('rasd.projects.internal')}</Badge>
            )}
          </div>

          <div
            className="flex items-center gap-x-4 gap-y-1 flex-wrap"
            style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
          >
            {/* `region` (v1.2) is free text, shown only — never a
                filter. Skipped when it just repeats the city name
                (المدينة المنورة in المدينة المنورة). */}
            {(project.city || project.region) && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} strokeWidth={1.8} />
                {project.city && cityLabel(project.city, lang)}
                {project.city && project.region && project.region !== project.city && ' · '}
                {project.region &&
                  project.region !== project.city &&
                  regionLabel(project.region, lang)}
              </span>
            )}
            <span>{labels.sector(project.sector, project.sector_label)}</span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} strokeWidth={1.8} />
              {project.announced_at
                ? formatDate(project.announced_at, lang, { latin: true })
                : t('rasd.projects.notAnnounced')}
            </span>
            <span>
              {project.estimated_value != null ? (
                <>
                  {/* One isolate around the WHOLE numeric expression —
                      wrapping the number alone would leave the currency
                      word inside the RTL flow and split the pair. */}
                  <Ltr>{formatNumber(project.estimated_value, lang, 0, { latin: true })}</Ltr>{' '}
                  {t('common.currency')}
                </>
              ) : (
                t('rasd.projects.valueUndisclosed')
              )}
            </span>
          </div>

          {/* v1.3 — where in the build it is, not just that it's being
              built. Under-construction projects with a known number
              only; see showProgress. */}
          {showProgress(project) && (
            <div className="flex items-center gap-3" style={{ maxWidth: 360 }}>
              <div className="flex-1">
                <RasdProgressBar
                  percent={progressValue(project)}
                  label={t('rasd.project.timing.progress')}
                />
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-ink-soft)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('rasd.projects.progressDone', { percent: `${progressValue(project)}%` })}
              </span>
            </div>
          )}

          {isOpportunity && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="font-semibold"
                  style={{ fontSize: 12, color: accent }}
                >
                  {t('rasd.projects.openRolesLabel')}
                </span>
                {/* The LIST shape gives open_roles as flat Arabic
                    strings with no enum value attached, so there's
                    nothing to translate them from — they're rendered
                    as sent. The profile returns the richer objects. */}
                {(project.open_roles || []).map((role, i) => (
                  <Badge key={`${role}-${i}`} tone="success">
                    {role}
                  </Badge>
                ))}
                {project.confidence && (
                  <Badge tone={RASD_CONFIDENCE_TONE[project.confidence] || 'default'}>
                    {labels.confidence(project.confidence, project.confidence_label)}
                  </Badge>
                )}
              </div>
              {/* The authoritative disclaimer lives in the project's
                  `notes`, which the list endpoint doesn't return — so
                  the card carries our own localized caution instead of
                  a half-quote, and the profile shows the data team's
                  exact wording. Both say the same thing: these roles
                  are inferred and need verifying before anyone calls. */}
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {t('rasd.projects.inferredCaution')}
              </div>
            </div>
          )}
        </div>

        <ChevronLeft
          size={18}
          strokeWidth={1.8}
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            marginTop: 12,
            // Points "forward" — left in RTL, right in LTR.
            transform: lang === 'ar' || lang === 'ur' ? 'none' : 'rotate(180deg)',
          }}
        />
      </button>
    </Card>
  );
}
