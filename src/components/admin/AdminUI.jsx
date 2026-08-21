import React, { useEffect, useRef, useState } from 'react';
import { X, Search, SlidersHorizontal, RotateCcw, Check } from 'lucide-react';

/* ============================================================
 *  AdminUI — small set of primitives the admin pages share.
 *  Keeps the actual pages slim and ensures consistent theme +
 *  dark-mode behavior via CSS variables.
 *
 *    <PageHeader />     eyebrow + title + subtitle + slot
 *    <Card />           the standard surface tile
 *    <Toolbar />        filter row above tables
 *    <DataTable />      header + rows + pagination
 *    <Pagination />     prev/next using meta.current_page / last_page
 *    <CheckboxField />  form-sized boolean row (label + hint)
 *    <Badge />          colored chip for status / role
 *    <Modal />          centered dialog
 *    <EmptyState />     illustrated empty state for lists
 *    <ConfirmDialog />  pre-built reason-prompt modal
 * ============================================================ */


/* ---------- PageHeader ---------- */
export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
      <div className="min-w-0">
        {eyebrow && (
          <div
            className="font-semibold uppercase mb-1.5"
            style={{
              fontSize: 11,
              letterSpacing: '0.16em',
              color: 'var(--accent-primary)',
            }}
          >
            {eyebrow}
          </div>
        )}
        <h1
          className="font-display m-0"
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--text-ink)',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="mt-2 m-0 max-w-2xl"
            style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}


/* ---------- Card ---------- */
export function Card({ children, padded = true, style, ...rest }) {
  return (
    <div
      {...rest}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-card)',
        padding: padded ? 20 : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}


/* ---------- Filter primitives ----------
 *
 *  Replaced the old plain Toolbar with a small set of composable
 *  filter primitives. The visual model is one elevated card per
 *  page that owns: a header (icon + title + active count), an
 *  optional search input, a row of chip-styled select dropdowns,
 *  and a reset button when any filter is non-default.
 *
 *      <FilterBar
 *         title={t('admin.common.filtersTitle')}
 *         activeCount={N}
 *         onReset={...}
 *         resetLabel={...}
 *      >
 *         <FilterSearch value={...} onChange={...} placeholder={...} />
 *         <FilterSelect label="..." value={...} onChange={...} options={...} />
 *         <FilterCheckbox label="..." checked={...} onChange={...} />
 *      </FilterBar>
 *
 *  The old `Toolbar` is kept as a thin alias so anything else
 *  that imports it still compiles, but admin pages should migrate
 *  to <FilterBar /> for the new look.
 * ----------------------------------------------------------------
 */

export function FilterBar({
  title,
  activeCount = 0,
  onReset,
  resetLabel = 'Reset',
  searchValue,
  onSearchChange,
  searchPlaceholder,
  children,
  trailingActions,
}) {
  const hasSearchSlot =
    onSearchChange !== undefined && searchPlaceholder !== undefined;
  return (
    <Card padded={false}>
      <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-2"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(44,47,124,0.08)',
              color: 'var(--accent-primary)',
            }}
          >
            <SlidersHorizontal size={14} />
          </div>
          <div
            className="font-semibold truncate"
            style={{ fontSize: 13, color: 'var(--text-ink)', letterSpacing: '0.01em' }}
          >
            {title}
          </div>
          {activeCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                background: 'var(--accent-primary)',
                color: 'white',
                lineHeight: 1.4,
              }}
            >
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {trailingActions}
          {activeCount > 0 && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5"
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                background: 'transparent',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-canvas)';
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'var(--border-default)';
              }}
            >
              <RotateCcw size={12} />
              {resetLabel}
            </button>
          )}
        </div>
      </div>

      {hasSearchSlot && (
        <div className="px-4 pt-4">
          <FilterSearch
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        </div>
      )}

      {React.Children.count(children) > 0 && (
        <div className="px-4 py-4 flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </Card>
  );
}


/* ---------- FilterSearch — wide, prominent search input ----------
 *  Includes a clear button when there's text. Hooks into FilterBar
 *  via the searchValue/onSearchChange/searchPlaceholder props but
 *  can also be used standalone.
 */
export function FilterSearch({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search
        size={15}
        style={{
          position: 'absolute',
          top: '50%',
          insetInlineStart: 14,
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}
      />
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
          borderRadius: 10,
          color: 'var(--text-ink)',
          outline: 'none',
          transition: 'all 0.18s ease',
          padding: '11px 40px 11px 40px',
          fontSize: 13.5,
          fontFamily: 'inherit',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#2c2f7c';
          e.currentTarget.style.background = 'var(--bg-surface)';
          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(44, 47, 124, 0.10)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-default)';
          e.currentTarget.style.background = 'var(--bg-canvas)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="clear"
          style={{
            position: 'absolute',
            top: '50%',
            insetInlineEnd: 10,
            transform: 'translateY(-50%)',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--bg-cream)',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}


/* ---------- FilterSelect — pill-shaped select ----------
 *  Behaves like a native <select> (so accessibility and mobile
 *  behavior are correct) but styled as a rounded pill that sits
 *  cleanly next to its siblings in the filter row.
 *
 *  options: [{ value, label }]
 */
export function FilterSelect({ label, value, onChange, options, minWidth = 160 }) {
  const isActive = value !== '' && value != null && value !== false;
  return (
    <label
      className="inline-flex items-center gap-2"
      style={{
        background: 'var(--bg-canvas)',
        border: `1px solid ${isActive ? 'rgba(44,47,124,0.35)' : 'var(--border-default)'}`,
        borderRadius: 999,
        padding: '6px 10px 6px 14px',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        minWidth,
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
    >
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: 'var(--text-muted)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none',
          background: 'transparent',
          border: 0,
          outline: 0,
          padding: '4px 18px 4px 2px',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'inherit',
          color: isActive ? 'var(--accent-primary)' : 'var(--text-ink)',
          cursor: 'pointer',
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%237a7a8c' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 2px center',
        }}
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}


/* ---------- FilterText / FilterNumber ---------- */
export function FilterText({ label, value, onChange, placeholder, type = 'text', minWidth = 140 }) {
  const isActive = value !== '' && value != null;
  return (
    <label
      className="inline-flex items-center gap-2"
      style={{
        background: 'var(--bg-canvas)',
        border: `1px solid ${isActive ? 'rgba(44,47,124,0.35)' : 'var(--border-default)'}`,
        borderRadius: 999,
        padding: '6px 12px 6px 14px',
        minWidth,
      }}
    >
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: 'var(--text-muted)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: 'transparent',
          border: 0,
          outline: 0,
          padding: '4px 0',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'inherit',
          color: 'var(--text-ink)',
          width: '100%',
          minWidth: 60,
        }}
      />
    </label>
  );
}


/* ---------- FilterCheckbox — pill toggle ---------- */
export function FilterCheckbox({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2"
      style={{
        background: checked ? 'rgba(44,47,124,0.10)' : 'var(--bg-canvas)',
        border: `1px solid ${checked ? 'rgba(44,47,124,0.35)' : 'var(--border-default)'}`,
        borderRadius: 999,
        padding: '7px 14px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.15s ease',
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          border: `1.5px solid ${checked ? 'var(--accent-primary)' : 'var(--border-strong)'}`,
          background: checked ? 'var(--accent-primary)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s ease',
        }}
      >
        {checked && <Check size={10} color="white" strokeWidth={3} />}
      </span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: checked ? 'var(--accent-primary)' : 'var(--text-ink-soft)',
        }}
      >
        {label}
      </span>
    </button>
  );
}


/* ---------- CheckboxField ----------------------------------------
 *  FilterCheckbox's form-sized sibling. Same visual language (custom
 *  box, Check glyph, primary tint when on) but shaped as a field row
 *  for edit forms: full width, `.field`-matching radius, and room for
 *  a hint line under the label — a bare native checkbox gives a
 *  boolean no space to explain what it actually does.
 *
 *  Renders a button, not an <input>: native checkboxes can't be
 *  restyled consistently across browsers. role/aria-checked keep it
 *  announced correctly, and type="button" stops it submitting the
 *  form it usually lives in.
 * ---------------------------------------------------------------- */
export function CheckboxField({ label, hint, checked, onChange, disabled }) {
  const [hover, setHover] = useState(false);
  const active = Boolean(checked);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      disabled={disabled}
      onClick={() => onChange(!active)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="w-full flex items-start gap-3 text-start"
      style={{
        background: active ? 'rgba(44,47,124,0.06)' : 'var(--bg-canvas)',
        border: `1px solid ${
          active
            ? 'rgba(44,47,124,0.35)'
            : hover && !disabled
            ? 'var(--border-strong)'
            : 'var(--border-default)'
        }`,
        borderRadius: 11,
        padding: '13px 14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        fontFamily: 'inherit',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: `1.5px solid ${
            active ? 'var(--accent-primary)' : 'var(--border-strong)'
          }`,
          background: active ? 'var(--accent-primary)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          // Nudge the box onto the label's optical baseline.
          marginTop: 1,
          transition: 'all 0.15s ease',
        }}
      >
        {active && <Check size={12} color="white" strokeWidth={3} />}
      </span>
      <span className="flex flex-col gap-1">
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            lineHeight: 1.35,
            color: active ? 'var(--accent-primary)' : 'var(--text-ink)',
          }}
        >
          {label}
        </span>
        {hint && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 400,
              lineHeight: 1.5,
              color: 'var(--text-muted)',
            }}
          >
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}


/* ---------- Toolbar — legacy alias, keeps old imports working ---- */
export function Toolbar({ children }) {
  return (
    <Card padded={false}>
      <div
        className="flex flex-wrap items-end gap-3 p-4"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        {children}
      </div>
    </Card>
  );
}


/* ---------- DataTable ---------- */
export function DataTable({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  emptyTitle,
  emptyDescription,
  onRowClick,
}) {
  if (loading) {
    return (
      <div
        className="p-10 text-center"
        style={{ fontSize: 13, color: 'var(--text-muted)' }}
      >
        <div
          className="shimmer mx-auto"
          style={{ height: 14, width: 140, borderRadius: 6 }}
        />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <EmptyState title={emptyTitle || empty || 'No results'} description={emptyDescription} />
    );
  }

  return (
    <div className="overflow-x-auto" data-on-surface="true">
      <table
        className="w-full"
        style={{
          borderCollapse: 'separate',
          borderSpacing: 0,
          fontSize: 13.5,
        }}
      >
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className="text-start"
                style={{
                  padding: '12px 16px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-canvas)',
                  borderBottom: '1px solid var(--border-default)',
                  whiteSpace: 'nowrap',
                  ...col.headerStyle,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={rowKey ? rowKey(row) : ri}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              onMouseEnter={(e) => {
                if (onRowClick) e.currentTarget.style.background = 'var(--bg-canvas)';
              }}
              onMouseLeave={(e) => {
                if (onRowClick) e.currentTarget.style.background = 'transparent';
              }}
            >
              {columns.map((col, ci) => (
                <td
                  key={col.key || ci}
                  style={{
                    padding: '14px 16px',
                    color: 'var(--text-ink-soft)',
                    borderBottom: '1px solid var(--border-soft)',
                    verticalAlign: 'middle',
                    ...col.cellStyle,
                  }}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


/* ---------- Pagination ---------- */
export function Pagination({ meta, onPage, t }) {
  if (!meta || meta.last_page <= 1) return null;
  const { current_page, last_page, total, from, to } = meta;
  return (
    <div
      className="flex items-center justify-between flex-wrap gap-3 px-4 py-3"
      style={{
        borderTop: '1px solid var(--border-soft)',
        fontSize: 12.5,
        color: 'var(--text-muted)',
      }}
    >
      <div>
        {t
          ? t('admin.common.pageInfo', { from: from ?? 1, to: to ?? 1, total: total ?? 0 })
          : `${from}–${to} of ${total}`}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: 13, width: 'auto' }}
          disabled={current_page <= 1}
          onClick={() => onPage(current_page - 1)}
        >
          {t ? t('admin.common.prev') : 'Prev'}
        </button>
        <span style={{ fontWeight: 600, color: 'var(--text-ink)' }}>
          {current_page} / {last_page}
        </span>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: 13, width: 'auto' }}
          disabled={current_page >= last_page}
          onClick={() => onPage(current_page + 1)}
        >
          {t ? t('admin.common.next') : 'Next'}
        </button>
      </div>
    </div>
  );
}


/* ---------- Badge ---------- */
const BADGE_TONES = {
  default: { bg: 'var(--bg-cream)', text: 'var(--text-ink-soft)', border: 'var(--border-default)' },
  primary: { bg: 'rgba(44,47,124,0.10)', text: 'var(--accent-primary)', border: 'rgba(44,47,124,0.22)' },
  success: { bg: 'rgba(19,109,74,0.10)', text: '#136d4a', border: 'rgba(19,109,74,0.22)' },
  warning: { bg: 'rgba(184,134,42,0.12)', text: '#b8862a', border: 'rgba(184,134,42,0.22)' },
  danger: { bg: 'rgba(185,28,28,0.10)', text: 'var(--accent-danger)', border: 'rgba(185,28,28,0.22)' },
  muted: { bg: 'transparent', text: 'var(--text-muted)', border: 'var(--border-default)' },
};

export function Badge({ tone = 'default', children }) {
  const t = BADGE_TONES[tone] || BADGE_TONES.default;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        background: t.bg,
        color: t.text,
        border: `1px solid ${t.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}


/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, width = 480, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'var(--bg-overlay)' }}
      onMouseDown={(e) => {
        if (ref.current && !ref.current.contains(e.target)) onClose?.();
      }}
    >
      <div
        ref={ref}
        className="animate-fade-up"
        style={{
          width: '100%',
          maxWidth: width,
          background: 'var(--bg-surface)',
          borderRadius: 14,
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-elevated)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-soft)' }}
        >
          <h2
            className="font-display m-0"
            style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-ink)' }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
            aria-label="close"
          >
            <X size={15} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto" data-on-surface="true">
          {children}
        </div>
        {footer && (
          <div
            className="p-4 flex flex-wrap gap-2 justify-end"
            style={{ borderTop: '1px solid var(--border-soft)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}


/* ---------- EmptyState ---------- */
export function EmptyState({ title, description, action }) {
  return (
    <div
      className="text-center py-14 px-6"
      style={{ color: 'var(--text-muted)' }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-ink-soft)' }}>
        {title}
      </div>
      {description && (
        <div className="mt-2" style={{ fontSize: 13 }}>
          {description}
        </div>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}


/* ---------- ConfirmDialog ---------- */
/**
 * A reusable reason-prompt modal. The admin API requires a reason
 * on suspend / override / force-status / force-delete / force-partner
 * / role grant / role revoke — this dialog enforces minLength=10 and
 * surfaces validation messages without each page re-implementing it.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  reason,
  setReason,
  reasonLabel,
  reasonPlaceholder,
  confirmLabel,
  cancelLabel,
  confirmTone = 'primary',
  requireReason = true,
  busy = false,
  error,
}) {
  const minReasonLength = 10;
  const reasonOk = !requireReason || (reason && reason.trim().length >= minReasonLength);

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 18px' }}
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{
              width: 'auto',
              padding: '10px 18px',
              background: confirmTone === 'danger' ? '#b91c1c' : '#2c2f7c',
              borderColor: confirmTone === 'danger' ? '#b91c1c' : '#2c2f7c',
              boxShadow: confirmTone === 'danger'
                ? '0 6px 14px rgba(185,28,28,0.20)'
                : '0 6px 14px rgba(44,47,124,0.18)',
            }}
            onClick={onConfirm}
            disabled={busy || !reasonOk}
          >
            {busy ? '…' : confirmLabel}
          </button>
        </>
      }
    >
      {description && (
        <p
          className="m-0 mb-4"
          style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}
        >
          {description}
        </p>
      )}
      {requireReason && (
        <>
          <label className="field-label">{reasonLabel}</label>
          <textarea
            className="field"
            placeholder={reasonPlaceholder}
            value={reason || ''}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            style={{ padding: '12px 14px', resize: 'vertical' }}
          />
          <div className="field-hint">
            {reasonPlaceholder ? '' : null}
            {!reasonOk && reason && reason.length > 0
              ? `Minimum ${minReasonLength} characters.`
              : ''}
          </div>
        </>
      )}
      {error && (
        <div
          className="p-3 rounded-[10px] mt-3"
          style={{
            background: 'rgba(185,28,28,0.06)',
            border: '1px solid rgba(185,28,28,0.18)',
            color: 'var(--accent-danger)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
    </Modal>
  );
}
