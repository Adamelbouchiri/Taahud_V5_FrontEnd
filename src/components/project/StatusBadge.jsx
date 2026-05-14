import React from 'react';
import { PROJECT_STATUSES } from '../../config/projectConstants';
import { useTranslation } from '../../i18n/LanguageContext';

export default function StatusBadge({ status, size = 'md' }) {
  const { t } = useTranslation();
  const config = PROJECT_STATUSES[status] || PROJECT_STATUSES.pending_review;
  const key = PROJECT_STATUSES[status] ? status : 'pending_review';

  const sizes = {
    sm: { fontSize: 11, padding: '3px 9px', dot: 5 },
    md: { fontSize: 12, padding: '4px 10px', dot: 6 },
    lg: { fontSize: 13, padding: '6px 14px', dot: 7 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap"
      style={{
        background: config.bg,
        color: config.color,
        fontSize: s.fontSize,
        padding: s.padding,
        border: `1px solid ${config.border}`,
      }}
    >
      <span
        className="rounded-full"
        style={{
          width: s.dot,
          height: s.dot,
          background:
            config.color === '#ffffff' ? 'rgba(255,255,255,0.85)' : config.color,
        }}
      />
      {t(`status.project.${key}`)}
    </span>
  );
}
