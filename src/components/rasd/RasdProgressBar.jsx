import React from 'react';

/* ============================================================
 *  RasdProgressBar — `progress_percent` (RASD v1.3) as a bar.
 *  ----------------------------------------------------------------
 *  Callers gate on showProgress() first; this only draws. The fill
 *  starts from the inline-start edge, so it grows right-to-left in
 *  Arabic / Urdu and left-to-right otherwise.
 * ============================================================ */
export default function RasdProgressBar({
  percent,
  height = 6,
  accent = 'var(--accent-secondary)',
  label,
}) {
  return (
    <span
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
      style={{
        display: 'block',
        height,
        borderRadius: 999,
        background: 'var(--border-soft)',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          display: 'block',
          width: `${percent}%`,
          height: '100%',
          borderRadius: 999,
          background: accent,
          transition: 'width 0.3s ease',
        }}
      />
    </span>
  );
}
