import React from 'react';

/* ============================================================
 *  Ltr — isolate a value that must read left-to-right inside an
 *  RTL layout: emails, phone numbers, IBANs, national IDs, refs.
 *  ----------------------------------------------------------------
 *  The trap this exists to avoid: putting `dir="ltr"` on the BLOCK
 *  that holds the value. That fixes the character order but also
 *  re-resolves the block's own `text-align: start` to LEFT, so in
 *  Arabic the value drifts to the opposite edge from everything
 *  around it.
 *
 *  Keeping the direction override on an inline-block *inside* a
 *  normally-directed parent gets both: the parent still aligns the
 *  value on the reading side (right in Arabic, left in English),
 *  while `unicode-bidi: isolate` stops the bidi algorithm from
 *  reordering the value against neighbouring Arabic text.
 *
 *  Only for inline use. As a direct flex child the inline-block is
 *  blockified and ignored — there, use `alignSelf: 'flex-start'`
 *  on the item instead.
 * ============================================================ */
export default function Ltr({ children, style, ...props }) {
  return (
    <span
      style={{
        direction: 'ltr',
        unicodeBidi: 'isolate',
        display: 'inline-block',
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}
