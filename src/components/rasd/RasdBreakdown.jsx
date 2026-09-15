import React from 'react';
import Ltr from '../Ltr';
import { formatNumber } from '../../utils/money';

/* ============================================================
 *  RasdBreakdown — one summary bucket (by_stage / by_sector /
 *  by_city) as a clickable bar list.
 *  ----------------------------------------------------------------
 *  Bars, not a donut, for a reason the dataset forces: today's
 *  sector split is 718 / 17 / 2. A donut of that is one circle and
 *  two invisible slivers. A bar list keeps every category on its own
 *  labelled row, legible no matter how lopsided the counts are.
 *
 *  Two rules from RASD_API_1.md §4.1 are baked in here:
 *
 *    1. Chart the `label`, filter with the `value`. Both ride on
 *       every bucket, so clicking a row hands the caller the VALUE
 *       and never the Arabic text.
 *    2. Buckets arrive sorted by count desc with empties omitted —
 *       we don't re-sort or pad them.
 *
 *  Bars are scaled against the LARGEST count rather than the total,
 *  and floored at a visible width, so a 2-row category still reads
 *  as a bar beside a 718-row one instead of vanishing.
 *
 *  Props:
 *    rows       [{ value, label, count }] straight from the summary
 *    labelFor   (value, apiLabel) => string — our own translation,
 *               falling back to the Arabic label the API sent
 *    activeValue currently filtered value, highlighted
 *    onSelect   (value) => void; called with '' when a row that is
 *               already active is clicked (i.e. toggles the filter)
 *    lang       for number grouping
 * ============================================================ */
export default function RasdBreakdown({
  rows,
  labelFor,
  activeValue = '',
  onSelect,
  lang,
  accent = 'var(--accent-primary)',
  emptyLabel = '—',
}) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 0' }}>
        {emptyLabel}
      </div>
    );
  }

  const max = Math.max(...list.map((r) => r.count || 0), 1);

  return (
    <div className="flex flex-col gap-1.5">
      {list.map((row) => {
        const isActive = activeValue !== '' && activeValue === row.value;
        const pct = Math.max(((row.count || 0) / max) * 100, 2);
        const label = labelFor ? labelFor(row.value, row.label) : row.label;

        return (
          <button
            key={String(row.value)}
            type="button"
            onClick={() => onSelect?.(isActive ? '' : row.value)}
            className="w-full text-start flex items-center gap-3"
            style={{
              background: isActive ? 'rgba(44,47,124,0.06)' : 'transparent',
              border: 'none',
              borderRadius: 8,
              padding: '6px 8px',
              cursor: onSelect ? 'pointer' : 'default',
              fontFamily: 'inherit',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = 'var(--bg-canvas)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
          >
            <span
              className="truncate"
              style={{
                flex: '0 0 34%',
                fontSize: 12.5,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? accent : 'var(--text-ink-soft)',
              }}
            >
              {label}
            </span>

            <span
              className="flex-1"
              style={{
                height: 8,
                borderRadius: 999,
                background: 'var(--bg-canvas)',
                overflow: 'hidden',
                minWidth: 40,
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: accent,
                  opacity: isActive ? 1 : 0.65,
                  transition: 'width 0.3s ease, opacity 0.15s ease',
                }}
              />
            </span>

            <span
              style={{
                flex: '0 0 auto',
                fontSize: 12.5,
                fontWeight: 700,
                color: isActive ? accent : 'var(--text-ink)',
                minWidth: 34,
                textAlign: 'end',
              }}
            >
              <Ltr>{formatNumber(row.count || 0, lang, 0)}</Ltr>
            </span>
          </button>
        );
      })}
    </div>
  );
}
