import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

/* ============================================================
 *  IdentifierChip — the human-readable user identifier.
 *  ----------------------------------------------------------------
 *  Backend derives a stable string like `260703R47` for every user
 *  (YY + DD + account-type + region letter + id) and returns it as
 *  `user.identifier`. It's meant to be shown to humans and pasted
 *  into support tickets / documents, so we render it as a compact
 *  monospace chip with copy-to-clipboard.
 *
 *  Renders nothing when `identifier` is falsy so callers can drop
 *  it in unconditionally.
 * ============================================================ */

export default function IdentifierChip({ identifier, label, className = '' }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!identifier) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(identifier);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions) — the value
      // is still visible for manual selection, so fail silently.
    }
  };

  const tip = copied ? t('identifier.copied') : t('identifier.copy');

  return (
    <button
      type="button"
      onClick={copy}
      className={`identifier-chip ${className}`}
      title={tip}
      aria-label={`${label || t('identifier.label')}: ${identifier}`}
    >
      {label && <span className="identifier-chip__label">{label}</span>}
      {/* Identifier is always Latin/ASCII — force LTR even inside RTL layouts. */}
      <code dir="ltr">{identifier}</code>
      {copied ? (
        <Check size={13} strokeWidth={2.4} />
      ) : (
        <Copy size={13} strokeWidth={1.9} />
      )}
    </button>
  );
}
