import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, DoorOpen, Info } from 'lucide-react';
import { Badge, EmptyState } from '../admin/AdminUI';
import { cityLabel } from '../../config/cityTranslations';
import { RASD_CONFIDENCE_TONE, showRoleNote } from '../../config/rasdConstants';

/* ============================================================
 *  RoleSections — the two halves of a RASD project profile.
 *  ----------------------------------------------------------------
 *  `parties` and `open_roles` come from the same database table and
 *  carry the same shape, but they mean opposite things to the user:
 *
 *    parties     who is already in
 *    open_roles  where I can get in
 *
 *  They are deliberately styled as opposites — parties as a plain
 *  neutral roster, open roles as a raised accent panel — because
 *  the open roles are the reason someone pays for this product. The
 *  two live in one file so that contrast stays one edit, not two.
 * ============================================================ */

/* ---------- Who is already on the project ---------- */
export function PartiesSection({ parties, t, lang, roleLabel }) {
  const list = Array.isArray(parties) ? parties : [];

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading
        icon={Building2}
        title={t('rasd.project.parties.title')}
        subtitle={t('rasd.project.parties.subtitle')}
      />

      {list.length === 0 ? (
        <EmptyState title={t('rasd.project.parties.empty')} />
      ) : (
        <ul className="m-0 p-0 flex flex-col gap-2">
          {list.map((party, i) => (
            <li
              key={`${party.role}-${party.company?.id ?? i}`}
              className="list-none flex items-center gap-3"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-soft)',
                borderRadius: 11,
                padding: '11px 14px',
              }}
            >
              <span
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-muted)',
                }}
              >
                <Building2 size={15} strokeWidth={1.7} />
              </span>

              <div className="min-w-0 flex-1">
                {/* The company profile lists every other project this
                    company touches — the natural next hop from here. */}
                {party.company?.id ? (
                  <Link
                    to={`/rasd/companies/${party.company.id}`}
                    className="truncate block"
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: 'var(--text-ink)',
                      textDecoration: 'none',
                    }}
                  >
                    {party.company.name}
                  </Link>
                ) : (
                  <span
                    className="truncate block"
                    style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-ink)' }}
                  >
                    {party.company?.name || '—'}
                  </span>
                )}
                {party.company?.city && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {cityLabel(party.company.city, lang)}
                  </div>
                )}
              </div>

              <Badge tone="default">
                {roleLabel(party.role, party.role_label)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Where there's still a way in ----------
 *
 *  Three things must be visible together on this panel, per
 *  RASD_API_1.md §7.2b: the roles, the confidence badge, and the
 *  `notes` disclaimer. In today's data the projects that carry open
 *  roles are exactly the ones whose roles were INFERRED from the
 *  project type — they're the only rows with confidence `medium`,
 *  and they all carry the data team's warning in `notes`.
 *
 *  A contractor who calls a developer expecting a confirmed tender,
 *  on the strength of an inferred role, is the failure this product
 *  can't afford. So the badge sits beside the heading and the note
 *  sits directly under the list — not behind a details tab.
 */
export function OpenRolesSection({
  openRoles,
  notes,
  confidence,
  confidenceLabel,
  t,
  roleLabel,
}) {
  const list = Array.isArray(openRoles) ? openRoles : [];
  const accent = '#136d4a';

  if (list.length === 0) {
    // The common case today — 687 of 737 projects. Worth a proper
    // empty state rather than an omitted section: "no way in yet" is
    // an answer the user came here for.
    return (
      <div className="flex flex-col gap-3">
        <SectionHeading
          icon={DoorOpen}
          title={t('rasd.project.openRoles.title')}
          subtitle={t('rasd.project.openRoles.subtitle')}
        />
        <EmptyState
          title={t('rasd.project.openRoles.empty.title')}
          description={t('rasd.project.openRoles.empty.description')}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        background: `${accent}08`,
        border: `1px solid ${accent}28`,
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <SectionHeading
          icon={DoorOpen}
          title={t('rasd.project.openRoles.title')}
          subtitle={t('rasd.project.openRoles.subtitle')}
          color={accent}
        />
        {confidence && (
          <Badge tone={RASD_CONFIDENCE_TONE[confidence] || 'default'}>
            {confidenceLabel}
          </Badge>
        )}
      </div>

      <ul className="m-0 p-0 flex flex-col gap-2">
        {list.map((role, i) => (
          <li
            key={`${role.role}-${i}`}
            className="list-none flex items-start gap-3"
            style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${accent}22`,
              borderRadius: 11,
              padding: '11px 14px',
            }}
          >
            <span
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: `${accent}14`,
                color: accent,
              }}
            >
              <DoorOpen size={15} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-ink)' }}>
                {roleLabel(role.role, role.role_label)}
              </div>
              {/* Only when it adds something — the enum normalizes
                  what the collector typed, so note and role_label are
                  often the same string and printing both would read
                  «مقاول رئيسي — مقاول رئيسي». */}
              {showRoleNote(role) && (
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--text-muted)',
                    marginTop: 3,
                    lineHeight: 1.6,
                  }}
                >
                  {role.note}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {notes && (
        <div
          className="flex items-start gap-2"
          style={{
            fontSize: 12.5,
            lineHeight: 1.7,
            color: 'var(--text-ink-soft)',
            background: 'rgba(184,134,42,0.10)',
            border: '1px solid rgba(184,134,42,0.22)',
            borderRadius: 10,
            padding: '10px 12px',
          }}
        >
          <Info
            size={14}
            strokeWidth={1.9}
            style={{ color: '#b8862a', flexShrink: 0, marginTop: 2 }}
          />
          <span>{notes}</span>
        </div>
      )}
    </div>
  );
}

/* ---------- shared heading ---------- */
function SectionHeading({ icon: Icon, title, subtitle, color }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: color ? `${color}16` : 'rgba(44,47,124,0.08)',
          color: color || 'var(--accent-primary)',
        }}
      >
        <Icon size={14} strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <div
          className="font-semibold"
          style={{ fontSize: 14, color: 'var(--text-ink)' }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
