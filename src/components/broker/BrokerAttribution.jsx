import React from 'react';
import { Handshake, Percent } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  BrokerAttribution — "this project came through a broker".
 *  ----------------------------------------------------------------
 *  Every ProjectResource now carries the broker who introduced the
 *  project (BROKER_SPRINT2_INTEGRATION.md part 3):
 *
 *    broker: { id, identifier, name } | null
 *    broker_fee_percent: "0.85" | null
 *    opportunity_id: 1 | null
 *
 *  The field is populated three ways and the FE can't tell them
 *  apart — nor does it need to: a draft the broker prepared, a
 *  project the owner published from that draft, or one the owner
 *  posted from scratch inside the 90-day auto-link window. All three
 *  mean the same thing to a reader, so they render the same.
 *
 *  Renders nothing when `broker` is null, so callers can drop it in
 *  unconditionally — most projects have no broker.
 *
 *  Two shapes:
 *    variant="card"   a sidebar card, matching OwnerCard/PartnerCard
 *    variant="inline" one quiet line for a project card in a feed
 *
 *  The fee percent is shown only when the BE sent one. A null means
 *  no fee was ever agreed (auto-link fires with or without one), and
 *  "0%" would be a different — wrong — claim.
 * ============================================================ */

/* The BE sends the percent as a decimal string ("0.85"). Trim the
   trailing zeros a raw string would show ("0.850" → "0.85") without
   turning an integer into "1.00". */
function formatPercent(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${parseFloat(n.toFixed(2))}%`;
}

export default function BrokerAttribution({ project, variant = 'card' }) {
  const { t } = useTranslation();
  const broker = project?.broker;
  if (!broker) return null;

  const fee = formatPercent(project.broker_fee_percent);

  /* A full-width strip inside the card, tinted the platform green so
     it reads as one object rather than a stray line of metadata: the
     label and broker name run along the start, the agreed rate is
     pinned to the end. `min-w-0` + truncate on the name is what keeps
     a long company name from pushing the rate out of the card. */
  if (variant === 'inline') {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-[10px]"
        style={{
          background: 'rgba(19,109,74,0.07)',
          border: '1px solid rgba(19,109,74,0.18)',
        }}
      >
        {/* --accent-secondary rather than a hardcoded green: this strip
            renders on the public arena feed, where a dark-mode viewer
            would otherwise get near-black text on a near-black tint. */}
        <Handshake
          size={13}
          strokeWidth={1.9}
          style={{ color: 'var(--accent-secondary)', flexShrink: 0 }}
        />
        <span
          className="flex-shrink-0"
          style={{ fontSize: 11, color: 'var(--text-muted)' }}
        >
          {t('broker.attribution.title')}
        </span>
        <span
          className="font-semibold truncate min-w-0"
          style={{ fontSize: 12.5, color: 'var(--text-ink)' }}
        >
          {broker.name}
        </span>
        {fee && (
          <span
            className="font-bold ms-auto flex-shrink-0"
            style={{ fontSize: 12, color: 'var(--accent-secondary)' }}
          >
            {fee}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-[14px] p-5"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid rgba(19,109,74,0.22)',
      }}
    >
      <div
        className="font-semibold uppercase mb-3"
        style={{
          fontSize: 10.5,
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
        }}
      >
        {t('broker.attribution.title')}
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(19,109,74,0.08)',
            color: '#136d4a',
          }}
        >
          <Handshake size={19} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div
            className="font-bold truncate"
            style={{ fontSize: 14, color: 'var(--text-ink)' }}
          >
            {broker.name}
          </div>
          {broker.identifier && (
            <div
              dir="ltr"
              className="truncate"
              style={{
                fontSize: 11.5,
                color: 'var(--text-muted)',
                fontFamily: 'ui-monospace, Menlo, monospace',
                textAlign: 'start',
              }}
            >
              {broker.identifier}
            </div>
          )}
        </div>
      </div>

      {fee && (
        <div
          className="mt-4 pt-3 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid var(--border-soft)' }}
        >
          <span
            className="inline-flex items-center gap-1.5"
            style={{ fontSize: 12, color: 'var(--text-muted)' }}
          >
            <Percent size={12} strokeWidth={1.9} />
            {t('broker.attribution.feeLabel')}
          </span>
          <span
            className="font-bold"
            style={{ fontSize: 13.5, color: '#0d5538' }}
          >
            {fee}
          </span>
        </div>
      )}
    </div>
  );
}
