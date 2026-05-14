import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * تعاهد wordmark logo.
 * - variant="blue" (default): for light backgrounds. Auto-flips to a
 *   light ink in dark mode so the wordmark stays visible against the
 *   dark canvas.
 * - variant="white": for dark identity surfaces (footer, brand panel).
 *   Stays white regardless of theme.
 */
export default function Logo({
  variant = 'blue',
  height = 32,
  className = '',
  ...props
}) {
  const { isDark } = useTheme();

  let colors;
  if (variant === 'white') {
    colors = { accent: 'rgba(255,255,255,0.55)', main: '#ffffff' };
  } else if (isDark) {
    // Light wordmark on the dark canvas so it remains readable.
    colors = { accent: 'rgba(255,255,255,0.45)', main: '#e7e8ff' };
  } else {
    colors = { accent: '#CBCBCA', main: '#292E76' };
  }

  return (
    <svg
      viewBox="0 0 150 50"
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="تعاهد"
      {...props}
    >
      <g>
        <path
          fill={colors.accent}
          d="M94.73,29.27v-6.81c0-0.44-0.36-0.8-0.8-0.8h0c-0.44,0-0.8,0.36-0.8,0.8v6.81H94.73z"
        />
        <path
          fill={colors.main}
          d="M88.13,24.37v3.29c0,0-0.35,2.51-2.51,2.51H68.04c0,0-1.39-0.26-2.08-1.13c0,0-1.16,1.13-2.27,1.13
            s-8.36,0-8.36,0s-2.62-0.35-2.62-2.77s0-7.57,0-7.57h2.94v7.4h8.66l-0.35-1.56H58.6V22.9h5.2c0,0,0.87-0.17,2.08,1.04
            c0,0,1.21-1.04,2.25-1.04s5.2,0,5.2,0v2.77h-5.54l-0.35,1.56H85.1v-2.94h3.03V24.37z M77.76,26.08L79.84,24l-2.08-2.08L75.69,24
            L77.76,26.08z M81.92,26.08L84,24l-2.08-2.08L79.84,24L81.92,26.08z M34.93,22.25c-3.83,1.06-2.26,4.76-2.26,4.76h-3.3
            c0-4.76-4.35-4.76-4.35-4.76v2.99c1.74,0,1.57,1.76,1.57,1.76h-4.35v2.82h3.48c1.91-0.35,2.26-2.82,2.26-2.82
            c0,2.29,2.26,2.82,2.26,2.82s2.26,0,3.94,0c1.68,0,2.32-1.06,2.32-1.06c1.22,1.06,2.05,1.06,2.05,1.06h8.21
            c3.48-0.18,3.18-4.11,3.18-4.11c-0.47-2.87-3.08-3.12-3.08-3.12s-4.8,0-6.89,0c-2.09,0-2.14-2.47-2.14-2.47h-2.91V22.25z
            M36.35,24.45c0.77,0,1.39,0.62,1.39,1.39c0,0.77-0.62,1.39-1.39,1.39c-0.77,0-1.39-0.62-1.39-1.39
            C34.96,25.07,35.58,24.45,36.35,24.45z M40.42,25.32H47c0,0,0.52,0.17,0.52,0.87c0,0,0,0.69-0.52,0.69h-6.95
            C40.05,26.88,40.42,26.36,40.42,25.32z"
        />
        <path
          fill={colors.main}
          d="M104.9,21.1h6.31c0,0,1.43-0.04,2.58,1.37c0,0,1.04-1.33,2.51-1.37h6.34v3.49H116l-0.35,1.86h12.12v3.46
            h-11.44c0,0-1.75-0.1-2.54-1.42c0,0-1,1.43-2.58,1.42l-11.43,0l-1.74-3.46h13.89l-0.35-1.86h-6.64l0-3.49"
        />
      </g>
    </svg>
  );
}
