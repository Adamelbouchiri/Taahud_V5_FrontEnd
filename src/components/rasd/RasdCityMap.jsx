import React, { useMemo, useState } from 'react';
import Ltr from '../Ltr';
import { formatNumber } from '../../utils/money';
import { cityLabel } from '../../config/cityTranslations';
import { SAUDI_CITY_COORDS } from '../../config/saudiCityCoords';
import { KSA_PATH, KSA_PROJ, KSA_VIEWBOX } from './saudiOutline';

/* ============================================================
 *  RasdCityMap — summary.by_city as bubbles on a Saudi outline.
 *  ----------------------------------------------------------------
 *  The map alternative to the city RasdBreakdown, and it follows the
 *  same contract: the label is for display, clicking hands `onSelect`
 *  the bucket's VALUE (the Arabic city name the backend filters on).
 *
 *  Bubble AREA tracks the count (radius ∝ √count), floored so a
 *  1-project town is still a clickable target beside Riyadh's 353.
 *  Bigger bubbles are drawn first so small ones sitting on top of them
 *  (Diriyah on Riyadh, Khobar on Dammam) stay hoverable.
 *
 *  A city with no coordinates in SAUDI_CITY_COORDS isn't dropped —
 *  it's listed under the map as a clickable chip, so the map never
 *  silently disagrees with the list view's totals.
 * ============================================================ */
const R_MIN = 5;
const R_MAX = 26;
const MAX_LABELS = 6;
const LABEL_SIZE = 13;

function project([lat, lon]) {
  return [
    (lon - KSA_PROJ.lon0) * KSA_PROJ.cos * KSA_PROJ.k,
    (KSA_PROJ.lat0 - lat) * KSA_PROJ.k,
  ];
}

export default function RasdCityMap({ rows, lang, t, onSelect, emptyLabel = '—' }) {
  const [hover, setHover] = useState(null);

  const { bubbles, labels, unplaced } = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    const max = Math.max(...list.map((r) => r.count || 0), 1);
    const placed = [];
    const missing = [];

    list.forEach((row) => {
      const coords = SAUDI_CITY_COORDS[row.value] || SAUDI_CITY_COORDS[row.label];
      if (!coords) {
        missing.push(row);
        return;
      }
      const [x, y] = project(coords);
      placed.push({
        ...row,
        x,
        y,
        r: R_MIN + (R_MAX - R_MIN) * Math.sqrt((row.count || 0) / max),
        name: cityLabel(row.value || row.label, lang),
        // West-coast cities get their label over the sea, so Jeddah's
        // doesn't land on Makkah's bubble.
        west: coords[1] < 39.5,
      });
    });

    // Labels for the biggest cities only, skipping any that would
    // overlap one already placed (Dammam / Khobar / Dhahran).
    const boxes = [];
    const chosen = [];
    [...placed]
      .sort((a, b) => b.count - a.count)
      .forEach((b) => {
        if (chosen.length >= MAX_LABELS) return;
        const text = `${b.name} · ${formatNumber(b.count, lang, 0, { latin: true })}`;
        const w = text.length * LABEL_SIZE * 0.55;
        const x0 = b.west ? b.x - b.r - 4 - w : b.x + b.r + 4;
        const box = { x0, x1: x0 + w, y0: b.y - LABEL_SIZE / 2 - 2, y1: b.y + LABEL_SIZE / 2 + 2 };
        const clash = boxes.some(
          (o) => box.x0 < o.x1 && box.x1 > o.x0 && box.y0 < o.y1 && box.y1 > o.y0,
        );
        if (clash) return;
        boxes.push(box);
        chosen.push({ ...b, text });
      });

    return {
      bubbles: placed.sort((a, b) => b.r - a.r),
      labels: chosen,
      unplaced: missing,
    };
  }, [rows, lang]);

  if (bubbles.length === 0 && unplaced.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 0' }}>
        {emptyLabel}
      </div>
    );
  }

  const { w: W, h: H } = KSA_VIEWBOX;

  return (
    <div>
      <div className="relative mx-auto" style={{ maxWidth: 640 }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={t('rasd.overview.breakdown.city')}
          // Coordinates are geographic; keep text anchoring stable in RTL.
          style={{ display: 'block', direction: 'ltr', overflow: 'visible' }}
        >
          <path
            d={KSA_PATH}
            fill="var(--bg-cream)"
            stroke="var(--border-strong)"
            strokeWidth={1.2}
            strokeLinejoin="round"
          />

          {bubbles.map((b) => {
            const active = hover?.value === b.value;
            return (
              <circle
                key={String(b.value)}
                cx={b.x}
                cy={b.y}
                r={b.r}
                role="button"
                tabIndex={0}
                aria-label={`${b.name}: ${b.count}`}
                fill="var(--accent-primary)"
                fillOpacity={active ? 0.9 : 0.5}
                stroke="var(--bg-surface)"
                strokeWidth={1.5}
                style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s ease', outline: 'none' }}
                onMouseEnter={() => setHover(b)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(b)}
                onBlur={() => setHover(null)}
                onClick={() => onSelect?.(b.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect?.(b.value);
                  }
                }}
              />
            );
          })}

          {labels.map((b) => (
            <text
              key={`l-${b.value}`}
              x={b.west ? b.x - b.r - 4 : b.x + b.r + 4}
              y={b.y}
              textAnchor={b.west ? 'end' : 'start'}
              dominantBaseline="central"
              fontSize={LABEL_SIZE}
              fontWeight={700}
              fill="var(--text-ink)"
              stroke="var(--bg-surface)"
              strokeWidth={3.5}
              strokeLinejoin="round"
              paintOrder="stroke"
              style={{ pointerEvents: 'none' }}
            >
              {b.text}
            </text>
          ))}
        </svg>

        {hover && (
          <div
            className="absolute"
            style={{
              left: `${(hover.x / W) * 100}%`,
              top: `${((hover.y - hover.r) / H) * 100}%`,
              transform: 'translate(-50%, calc(-100% - 8px))',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              padding: '6px 10px',
              boxShadow: '0 6px 18px rgba(15,17,41,0.12)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 2,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-ink)' }}>
              {hover.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t('rasd.overview.breakdown.mapProjects', {
                count: formatNumber(hover.count, lang, 0, { latin: true }),
              })}
            </div>
          </div>
        )}
      </div>

      {unplaced.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {t('rasd.overview.breakdown.mapUnplaced')}
          </span>
          {unplaced.map((row) => (
            <button
              key={String(row.value)}
              type="button"
              onClick={() => onSelect?.(row.value)}
              style={{
                fontSize: 12,
                fontFamily: 'inherit',
                padding: '3px 9px',
                borderRadius: 999,
                border: '1px solid var(--border-default)',
                background: 'var(--bg-surface)',
                color: 'var(--text-ink-soft)',
                cursor: 'pointer',
              }}
            >
              {cityLabel(row.value || row.label, lang)}{' '}
              <Ltr>{formatNumber(row.count || 0, lang, 0, { latin: true })}</Ltr>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
