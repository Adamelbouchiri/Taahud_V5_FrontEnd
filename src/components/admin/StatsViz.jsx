import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

/* ============================================================
 *  StatsViz — Recharts-backed visualizations for the admin
 *  overview. Public surface (KpiCard / LineChart / BarList) is
 *  unchanged from the previous SVG-only version so the
 *  AdminOverviewPage didn't need any wiring updates — only the
 *  internals were swapped.
 *
 *  Three exports:
 *    KpiCard    — stat tile with delta chip + Recharts sparkline
 *    LineChart  — full-width area chart with tooltip + grid
 *    BarList    — donut + legend for category breakdowns
 *
 *  All visuals derive their colors from props (or CSS variables
 *  via `useTheme()`'s `isDark` for dark-mode-only nudges) so
 *  theme switching just works.
 * ============================================================ */


/* ---------- helpers ---------- */

function fmtDelta(value) {
  if (value == null) return { text: '—', tone: 'muted' };
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return {
    text: `${sign}${rounded}%`,
    tone: rounded > 0 ? 'positive' : rounded < 0 ? 'negative' : 'neutral',
  };
}

function fmtNumber(n, lang) {
  if (n == null) return '—';
  try {
    return new Intl.NumberFormat(lang || undefined).format(n);
  } catch {
    return String(n);
  }
}

function fmtMonthLabel(yyyymm, lang) {
  if (!yyyymm) return '';
  try {
    const [y, m] = yyyymm.split('-').map(Number);
    if (!y || !m) return yyyymm;
    return new Intl.DateTimeFormat(lang || undefined, {
      month: 'short',
      year: 'numeric',
    }).format(new Date(y, m - 1, 1));
  } catch {
    return yyyymm;
  }
}

// Build a stable gradient id from a color string. Recharts needs
// unique ids when multiple charts share a page, otherwise the
// linearGradient definitions collide and only the first chart
// gets its fill.
function gradId(prefix, color) {
  const safe = String(color).replace(/[^a-zA-Z0-9]/g, '');
  return `${prefix}-${safe}`;
}


/* ============================================================
 *  KpiCard — large stat tile.
 *  Same prop surface as before. The sparkline now uses Recharts
 *  AreaChart with a vertical gradient for a softer look.
 * ============================================================ */
export function KpiCard({
  icon: Icon,
  title,
  value,
  growth,
  accent = 'var(--accent-primary)',
  sublabel,
  onClick,
  lang,
  momLabel = 'MoM',
  yoyLabel = 'vs last year',
}) {
  const delta = fmtDelta(growth?.mom_percent);
  const yoy = fmtDelta(growth?.yoy_percent);
  const Comp = onClick ? 'button' : 'div';
  const gradientId = useMemo(() => gradId('kpi', accent), [accent]);

  return (
    <Comp
      onClick={onClick}
      style={{
        textAlign: 'start',
        fontFamily: 'inherit',
        cursor: onClick ? 'pointer' : 'default',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-card)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        width: '100%',
      }}
      onMouseEnter={
        onClick
          ? (e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-elevated)';
              e.currentTarget.style.borderColor = 'var(--border-strong)';
            }
          : undefined
      }
      onMouseLeave={
        onClick
          ? (e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-card)';
              e.currentTarget.style.borderColor = 'var(--border-default)';
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'color-mix(in srgb, currentColor 14%, transparent)',
              color: accent,
            }}
          >
            {Icon ? <Icon size={17} strokeWidth={1.9} /> : null}
          </div>
          <div
            className="truncate"
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </div>
        </div>
        {growth?.mom_percent !== undefined && (
          <DeltaChip delta={delta} title={momLabel} />
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <div
          className="font-display"
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: 'var(--text-ink)',
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
          }}
        >
          {fmtNumber(value, lang)}
        </div>
        {sublabel && (
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>
            {sublabel}
          </div>
        )}
      </div>

      {growth?.monthly_series?.length > 0 && (
        <div style={{ height: 56, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={growth.monthly_series}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
                  <stop offset="100%" stopColor={accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="count"
                stroke={accent}
                strokeWidth={1.8}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {growth?.yoy_percent !== undefined && (
        <div
          className="flex items-center gap-1.5"
          style={{
            fontSize: 11.5,
            color: 'var(--text-muted)',
            paddingTop: 4,
            borderTop: '1px dashed var(--border-soft)',
          }}
        >
          <span>{yoyLabel}:</span>
          <span
            style={{
              color:
                yoy.tone === 'positive'
                  ? '#136d4a'
                  : yoy.tone === 'negative'
                  ? 'var(--accent-danger)'
                  : 'var(--text-muted)',
              fontWeight: 700,
            }}
          >
            {yoy.text}
          </span>
        </div>
      )}
    </Comp>
  );
}

function DeltaChip({ delta, title }) {
  const bg =
    delta.tone === 'positive'
      ? 'rgba(19,109,74,0.12)'
      : delta.tone === 'negative'
      ? 'rgba(185,28,28,0.12)'
      : 'var(--bg-cream)';
  const color =
    delta.tone === 'positive'
      ? '#136d4a'
      : delta.tone === 'negative'
      ? 'var(--accent-danger)'
      : 'var(--text-muted)';
  const border =
    delta.tone === 'positive'
      ? 'rgba(19,109,74,0.26)'
      : delta.tone === 'negative'
      ? 'rgba(185,28,28,0.26)'
      : 'var(--border-default)';
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: bg,
        color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {delta.text}
    </span>
  );
}


/* ============================================================
 *  LineChart — area chart with curved line, grid, and tooltip.
 *  ----------------------------------------------------------------
 *  Accepts the same { series, color, height, lang, valueLabel }
 *  shape as the old hand-rolled component. `series` is the BE's
 *  `monthly_series` array — { month: 'YYYY-MM', count: number }.
 * ============================================================ */
export function LineChart({
  series,
  color = 'var(--accent-primary)',
  height = 240,
  lang,
  valueLabel,
}) {
  const { isDark } = useTheme();
  const gradientId = useMemo(() => gradId('line', color), [color]);

  // Keep this useMemo above the empty-state early return so React
  // sees a stable hook order across renders.
  const data = useMemo(
    () =>
      (Array.isArray(series) ? series : []).map((d) => ({
        ...d,
        label: fmtMonthLabel(d.month, lang),
      })),
    [series, lang]
  );

  if (!Array.isArray(series) || series.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        —
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 5"
            stroke={isDark ? '#2b2e4a' : '#efece4'}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: color, strokeOpacity: 0.35, strokeDasharray: '2 4' }}
            content={
              <ChartTooltip valueLabel={valueLabel} lang={lang} />
            }
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2.2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 5,
              stroke: 'var(--bg-surface)',
              strokeWidth: 2,
              fill: color,
            }}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({ active, payload, label, valueLabel, lang }) {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0]?.value;
  return (
    <div
      className="px-3 py-2"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-elevated)',
        fontSize: 12,
        color: 'var(--text-ink)',
      }}
    >
      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span style={{ fontWeight: 700 }}>{fmtNumber(value, lang)}</span>
        {valueLabel && (
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            {valueLabel}
          </span>
        )}
      </div>
    </div>
  );
}


/* ============================================================
 *  BarList — donut + legend (replaces the old horizontal bar
 *  list). The component prop name stays "BarList" to avoid a
 *  rewrite of AdminOverviewPage's call sites.
 *
 *  Layout: donut on the left, legend with bars on the right.
 *  Below md the donut sits on top.
 * ============================================================ */
export function BarList({ rows, hideZero = false, lang, accent = 'var(--accent-primary)' }) {
  const filtered = useMemo(
    () => (hideZero ? rows.filter((r) => (r.value || 0) > 0) : rows),
    [rows, hideZero]
  );
  const total = useMemo(
    () => filtered.reduce((acc, r) => acc + (r.value || 0), 0),
    [filtered]
  );

  if (filtered.length === 0 || total === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '6px 0' }}>
        —
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-5">
      {/* Donut */}
      <div
        style={{
          width: 150,
          height: 150,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              dataKey="value"
              nameKey="label"
              innerRadius={48}
              outerRadius={70}
              paddingAngle={2}
              stroke="var(--bg-surface)"
              strokeWidth={2}
              isAnimationActive
            >
              {filtered.map((row, i) => (
                <Cell key={i} fill={row.color || accent} />
              ))}
            </Pie>
            <Tooltip
              content={<DonutTooltip total={total} lang={lang} />}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Centered total */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            className="font-display"
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-ink)',
              lineHeight: 1,
            }}
          >
            {fmtNumber(total, lang)}
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            total
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 min-w-0 w-full flex flex-col gap-2">
        {filtered.map((row) => {
          const share = total > 0 ? ((row.value / total) * 100).toFixed(1) : '0.0';
          const color = row.color || accent;
          return (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3"
              style={{ fontSize: 12.5 }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span
                  className="truncate"
                  style={{ color: 'var(--text-ink-soft)', fontWeight: 500 }}
                >
                  {row.label}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5" style={{ flexShrink: 0 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-ink)' }}>
                  {fmtNumber(row.value, lang)}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  {share}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonutTooltip({ active, payload, total, lang }) {
  if (!active || !payload || !payload.length) return null;
  const slice = payload[0];
  const share = total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0.0';
  return (
    <div
      className="px-3 py-2"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-elevated)',
        fontSize: 12,
        color: 'var(--text-ink)',
      }}
    >
      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>
        {slice.name}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span style={{ fontWeight: 700 }}>{fmtNumber(slice.value, lang)}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{share}%</span>
      </div>
    </div>
  );
}
