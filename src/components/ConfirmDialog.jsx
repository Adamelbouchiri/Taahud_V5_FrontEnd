import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

/* ============================================================
 *  ConfirmDialog
 *  ----------------------------------------------------------------
 *  A lightweight, app-styled confirmation modal — a drop-in
 *  replacement for window.confirm() that matches the Taahud design
 *  system (surface card, tokens, RTL-aware) instead of the browser's
 *  native alert.
 *
 *  Rendered through a portal on <body> so it overlays everything
 *  regardless of where it's mounted. Closes on Escape and on backdrop
 *  click (unless `busy`, e.g. a request is in flight). Body scroll is
 *  locked while open.
 *
 *  Props:
 *    open          boolean — render when true
 *    title         heading text
 *    message       body text
 *    confirmLabel  confirm button text
 *    cancelLabel   dismiss button text
 *    onConfirm     called when the confirm button is pressed
 *    onCancel      called on dismiss / backdrop / Escape
 *    busy          disables buttons + shows a wait cursor (request running)
 *    tone          'danger' (default) | 'brand' — accent color
 * ============================================================ */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
  tone = 'danger',
}) {
  const { dir } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  const isDanger = tone === 'danger';
  const accent = isDanger ? '#b91c1c' : 'var(--text-brand-deep)';
  const accentBg = isDanger ? 'rgba(185,28,28,0.10)' : 'rgba(44,47,124,0.10)';

  return createPortal(
    <div
      dir={dir}
      className="fixed inset-0 z-[1000] flex items-center justify-center px-5"
      style={{ background: 'rgba(15,17,71,0.45)', backdropFilter: 'blur(2px)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[420px] rounded-[18px] animate-fade-up"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          padding: '26px 24px',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <div
          className="mx-auto flex items-center justify-center mb-4"
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: accentBg,
            color: accent,
          }}
        >
          <AlertTriangle size={24} strokeWidth={1.9} />
        </div>

        {title && (
          <h2
            className="font-display text-center m-0 mb-2"
            style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-ink)' }}
          >
            {title}
          </h2>
        )}

        {message && (
          <p
            className="text-center m-0 mb-6 mx-auto"
            style={{
              fontSize: 13.5,
              lineHeight: 1.7,
              color: 'var(--text-muted)',
              maxWidth: 320,
            }}
          >
            {message}
          </p>
        )}

        <div className="flex items-center justify-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold transition-all"
            style={{
              fontSize: 13.5,
              background: isDanger ? '#b91c1c' : 'var(--bg-ink-deep)',
              border: isDanger ? '1px solid #b91c1c' : '1px solid var(--bg-ink-deep)',
              cursor: busy ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold transition-all"
            style={{
              fontSize: 13.5,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-ink-soft)',
              cursor: busy ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
