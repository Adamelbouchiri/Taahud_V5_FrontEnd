import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Ltr from '../Ltr';
import { formatNumber } from '../../utils/money';

/* ============================================================
 *  RasdDashKit — the building blocks of the رصد dashboard design.
 *  ----------------------------------------------------------------
 *  Mirrors the «منصة تعاهد ورصد» demo: a gold opportunity banner,
 *  rows of small inventory cards, section dividers and titled
 *  widgets on a 12-column grid. Gold (--rasd-gold) is the رصد accent
 *  throughout — the banner, the open-roles numbers, the tendering
 *  stage — so the module reads as its own product inside Taahud.
 *
 *  Styles live in <RasdDashStyles />, rendered once per page; every
 *  colour is a token with an html.dark override.
 * ============================================================ */

export function RasdDashStyles() {
  return (
    <style>{`
      .rd {
        --rasd-gold: #a77f33;
        --rasd-gold-light: #c9a54e;
        --rasd-gold-soft: rgba(167,127,51,.12);
        --rasd-gold-line: #e8dcc0;
        --rasd-navy: #2c2f7c;
        --rasd-navy-soft: rgba(44,47,124,.08);
        --rasd-green: #1f5a43;
        --rasd-green-soft: rgba(31,90,67,.10);
        --rasd-red: #b04a2e;
        --rasd-red-soft: rgba(176,74,46,.10);
      }
      html.dark .rd {
        --rasd-gold: #d9a441;
        --rasd-gold-light: #e2bb6a;
        --rasd-gold-soft: rgba(217,164,65,.14);
        --rasd-gold-line: rgba(217,164,65,.30);
        --rasd-navy: #8f96f0;
        --rasd-navy-soft: rgba(143,150,240,.14);
        --rasd-green: #5cbb7c;
        --rasd-green-soft: rgba(92,187,124,.14);
        --rasd-red: #e2765f;
        --rasd-red-soft: rgba(226,118,95,.14);
      }

      .rd-sec {
        display: flex; align-items: center; gap: 12px;
        font-size: 12.5px; font-weight: 700; color: var(--text-muted);
        margin: 10px 2px 0;
      }
      .rd-sec::after { content: ""; flex: 1; height: 1px; background: var(--border-default); }

      .rd-banner {
        display: flex; align-items: center; gap: 14px; width: 100%;
        text-align: start; font-family: inherit; cursor: pointer;
        background: linear-gradient(90deg, rgba(167,127,51,.12), rgba(167,127,51,.02));
        border: 1px solid var(--rasd-gold-line); border-radius: 14px;
        padding: 16px 18px;
        transition: border-color .15s, box-shadow .15s, transform .15s;
      }
      .rd-banner:hover {
        border-color: var(--rasd-gold);
        box-shadow: 0 2px 14px rgba(167,127,51,.14);
        transform: translateY(-1px);
      }
      .rd-banner-ic {
        width: 42px; height: 42px; border-radius: 12px; flex: none;
        display: grid; place-items: center;
        background: rgba(167,127,51,.16); color: var(--rasd-gold);
      }
      .rd-banner-txt { flex: 1; min-width: 0; }
      .rd-banner-h { font-weight: 800; font-size: 20px; color: var(--text-ink); line-height: 1.35; }
      .rd-banner-h b { color: var(--rasd-gold); }
      .rd-banner-s { font-size: 12.5px; color: var(--text-ink-soft); margin-top: 3px; }
      .rd-banner-go { color: var(--rasd-gold); flex: none; display: flex; }
      @media (max-width: 620px) { .rd-banner-h { font-size: 16.5px; } }

      .rd-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
      .rd-cards.c3 { grid-template-columns: repeat(3, 1fr); }
      @media (max-width: 1100px) { .rd-cards, .rd-cards.c3 { grid-template-columns: repeat(2, 1fr); } }
      @media (max-width: 560px) { .rd-cards, .rd-cards.c3 { grid-template-columns: 1fr; } }

      .rd-card {
        display: flex; align-items: flex-start; gap: 12px; text-align: start;
        background: var(--bg-surface); border: 1px solid var(--border-default);
        border-radius: 14px; padding: 14px 16px; font-family: inherit;
        box-shadow: var(--shadow-card); min-width: 0;
        transition: border-color .15s, transform .15s;
      }
      button.rd-card { cursor: pointer; }
      button.rd-card:hover { border-color: var(--rd-tone, var(--rasd-navy)); transform: translateY(-1px); }
      .rd-ic {
        width: 36px; height: 36px; border-radius: 10px; flex: none;
        display: grid; place-items: center;
      }
      .rd-ic.navy  { background: var(--rasd-navy-soft);  color: var(--rasd-navy); }
      .rd-ic.gold  { background: var(--rasd-gold-soft);  color: var(--rasd-gold); }
      .rd-ic.green { background: var(--rasd-green-soft); color: var(--rasd-green); }
      .rd-ic.red   { background: var(--rasd-red-soft);   color: var(--rasd-red); }
      .rd-card-body { min-width: 0; }
      .rd-val { font-weight: 800; font-size: 23px; line-height: 1.15; color: var(--text-ink); }
      .rd-val.gold { color: var(--rasd-gold); }
      .rd-lab { font-size: 12.5px; font-weight: 700; color: var(--text-ink-soft); margin-top: 3px; }
      .rd-note { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; line-height: 1.55; }

      .rd-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
      .rd-w4 { grid-column: span 4; } .rd-w5 { grid-column: span 5; }
      .rd-w6 { grid-column: span 6; } .rd-w7 { grid-column: span 7; }
      .rd-w8 { grid-column: span 8; } .rd-w12 { grid-column: span 12; }
      @media (max-width: 960px) { .rd-grid > * { grid-column: span 12; } }

      .rd-widget {
        background: var(--bg-surface); border: 1px solid var(--border-default);
        border-radius: 14px; box-shadow: var(--shadow-card);
        padding: 16px 18px; min-width: 0; display: flex; flex-direction: column;
      }
      .rd-widget-head {
        display: flex; align-items: center; justify-content: space-between;
        gap: 8px; margin-bottom: 12px; flex-wrap: wrap;
      }
      .rd-widget-head h4 {
        margin: 0; font-size: 13.5px; font-weight: 700; color: var(--text-ink);
        display: flex; align-items: center; gap: 8px;
      }
      .rd-w-ic { color: var(--rasd-gold); display: flex; }
      .rd-widget-body { flex: 1; min-width: 0; font-size: 12.5px; }
      .rd-foot { font-size: 11px; color: var(--text-muted); margin: 12px 0 0; line-height: 1.6; }

      .rd-stat { font-weight: 800; font-size: 30px; color: var(--rasd-gold); line-height: 1.1; }
      .rd-stat-l { font-size: 12px; color: var(--text-muted); margin: 4px 0 12px; }
      .rd-meter { height: 8px; border-radius: 999px; background: var(--bg-canvas); overflow: hidden; }
      .rd-meter > span {
        display: block; height: 100%; border-radius: 999px;
        background: linear-gradient(90deg, var(--rasd-gold), var(--rasd-gold-light));
      }

      .rd-sb { display: flex; height: 14px; border-radius: 999px; overflow: hidden; gap: 2px; }
      .rd-sb-seg { display: block; height: 100%; cursor: pointer; transition: opacity .15s; border: 0; padding: 0; }
      .rd-sb-seg:hover { opacity: .8; }
      .rd-sb-key { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 14px; }
      .rd-sb-k {
        display: inline-flex; align-items: center; gap: 6px; font-size: 12px;
        color: var(--text-ink-soft); background: none; border: 0; padding: 0;
        font-family: inherit; cursor: pointer;
      }
      .rd-sb-k:hover { color: var(--text-ink); }
      .rd-sb-k i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }
      .rd-sb-k b { color: var(--text-ink); font-weight: 700; }
      .rd-sb-k small { color: var(--text-muted); font-size: 11px; }

      /* ---- data table (the design's .dtable) ---- */
      .rd-table-wrap {
        background: var(--bg-surface); border: 1px solid var(--border-default);
        border-radius: 14px; box-shadow: var(--shadow-card); overflow-x: auto;
      }
      table.rd-table { width: 100%; border-collapse: collapse; font-size: 12.8px; min-width: 860px; }
      table.rd-table th {
        text-align: start; font-size: 11px; font-weight: 700; color: var(--text-muted);
        padding: 11px 14px; border-bottom: 1.5px solid var(--border-strong);
        white-space: nowrap; background: var(--bg-surface);
      }
      table.rd-table td {
        padding: 11px 14px; border-bottom: 1px solid var(--border-soft);
        vertical-align: middle; color: var(--text-ink-soft);
      }
      table.rd-table tbody tr { cursor: pointer; transition: background .12s; }
      table.rd-table tbody tr:nth-child(even) { background: color-mix(in srgb, var(--bg-canvas) 60%, transparent); }
      table.rd-table tbody tr:hover { background: var(--rasd-gold-soft); }
      table.rd-table tbody tr:last-child td { border-bottom: none; }
      table.rd-table tbody tr:focus-visible { outline: 2px solid var(--rasd-gold); outline-offset: -2px; }
      .rd-cell-p { font-weight: 700; color: var(--text-ink); line-height: 1.45; }
      .rd-cell-s { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
      .rd-num { white-space: nowrap; font-variant-numeric: tabular-nums; }
      .rd-muted { color: var(--text-muted); }
      .rd-chip {
        display: inline-block; font-size: 11px; font-weight: 700; line-height: 1.5;
        padding: 2px 8px; border-radius: 999px; white-space: nowrap;
      }
      .rd-chip.gold  { background: var(--rasd-gold-soft); color: var(--rasd-gold); border: 1px solid var(--rasd-gold-line); }
      .rd-chip.navy  { background: var(--rasd-navy-soft); color: var(--rasd-navy); }
      .rd-chip.green { background: var(--rasd-green-soft); color: var(--rasd-green); }
      .rd-chip.red   { background: var(--rasd-red-soft); color: var(--rasd-red); }
      .rd-chip.muted { background: var(--bg-canvas); color: var(--text-muted); border: 1px solid var(--border-soft); }
      .rd-chips { display: flex; flex-wrap: wrap; gap: 4px; }
      .rd-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-inline-end: 6px; vertical-align: middle; }
      .rd-go { color: var(--text-muted); display: flex; }
      tr:hover .rd-go { color: var(--rasd-gold); }

      .rd-link {
        display: inline-flex; align-items: center; gap: 3px; font-size: 11.5px;
        font-weight: 600; color: var(--rasd-gold); background: none; border: 0;
        padding: 0; cursor: pointer; font-family: inherit;
      }
      .rd-link:hover { text-decoration: underline; }

      .rd-table-wrap.flat { border: 0; box-shadow: none; border-radius: 0; background: transparent; }
      .rd-table-wrap.flat table.rd-table { min-width: 520px; }

      .rd-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer;
        border-radius: 10px; padding: 9px 14px; border: 1px solid var(--rasd-gold);
        background: var(--rasd-gold); color: #fff; transition: opacity .15s;
      }
      .rd-btn:hover { opacity: .9; }
      .rd-btn.ghost { background: transparent; color: var(--text-ink); border-color: var(--border-default); }
      .rd-btn.ghost:hover { border-color: var(--rasd-gold); color: var(--rasd-gold); opacity: 1; }

      /* ---- detail pages (the design's page-head / band / ovw) ---- */
      .rd-crumb { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12.5px; color: var(--text-muted); }
      .rd-crumb button {
        background: none; border: 0; padding: 0; font: inherit; color: inherit; cursor: pointer;
      }
      .rd-crumb button:hover { color: var(--rasd-gold); }
      .rd-crumb .cur { color: var(--text-ink); font-weight: 600; }

      .rd-phead { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .rd-phead > div:first-child { min-width: 0; flex: 1 1 360px; }
      .rd-eyebrow { font-size: 12px; font-weight: 700; color: var(--rasd-gold); }
      .rd-phead h1 { margin: 4px 0 0; font-size: 26px; font-weight: 800; line-height: 1.3; color: var(--text-ink); }
      .rd-sub { font-size: 13px; color: var(--text-muted); margin-top: 6px; line-height: 1.6; }
      .rd-phead-acts { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      @media (max-width: 620px) { .rd-phead h1 { font-size: 21px; } }

      .rd-band {
        background: var(--bg-surface); border: 1px solid var(--border-default);
        border-radius: 14px; box-shadow: var(--shadow-card); padding: 16px 18px; min-width: 0;
      }
      .rd-band-h {
        display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
        margin: 0 0 12px; font-size: 14px; font-weight: 700; color: var(--text-ink);
      }
      .rd-band-h > span { display: flex; align-items: center; gap: 8px; }
      .rd-band-h .n { color: var(--text-muted); font-weight: 600; }

      .rd-strip { display: grid; grid-template-columns: repeat(4, 1fr); }
      .rd-strip > div { padding: 2px 16px; min-width: 0; }
      .rd-strip > div + div { border-inline-start: 1px solid var(--border-soft); }
      .rd-strip > div:first-child { padding-inline-start: 0; }
      .rd-strip-k { font-size: 11.5px; font-weight: 700; color: var(--text-muted); margin-bottom: 7px; }
      .rd-strip-v {
        font-size: 15.5px; font-weight: 700; color: var(--text-ink); line-height: 1.4;
        background: none; border: 0; padding: 0; font-family: inherit; text-align: start; cursor: pointer;
      }
      button.rd-strip-v:hover { color: var(--rasd-gold); }
      .rd-strip-none { font-size: 13.5px; font-weight: 600; color: var(--text-muted); }
      @media (max-width: 760px) {
        .rd-strip { grid-template-columns: 1fr 1fr; row-gap: 14px; }
        .rd-strip > div { padding: 2px 12px; }
        .rd-strip > div:nth-child(odd) { padding-inline-start: 0; border-inline-start: 0; }
      }

      .rd-pm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      @media (max-width: 760px) { .rd-pm-grid { grid-template-columns: 1fr; } }
      .rd-pm-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
      .rd-pm-k { font-size: 12.5px; font-weight: 700; color: var(--text-ink-soft); }
      .rd-pm-v { font-size: 22px; font-weight: 800; color: var(--rasd-gold); }
      .rd-pm-note { font-size: 11.5px; color: var(--text-muted); margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

      .rd-steps { display: flex; align-items: flex-start; overflow-x: auto; padding: 4px 0 2px; }
      .rd-step { display: flex; align-items: flex-start; flex: 1; min-width: 84px; }
      .rd-step-c { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; }
      .rd-step-dot {
        width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center;
        font-size: 10.5px; font-weight: 700; background: var(--bg-canvas); color: var(--text-muted);
        border: 1px solid var(--border-default);
      }
      .rd-step.done .rd-step-dot, .rd-step.cur .rd-step-dot { background: var(--rasd-gold); border-color: var(--rasd-gold); color: #fff; }
      .rd-step-l { font-size: 11px; text-align: center; color: var(--text-muted); }
      .rd-step.cur .rd-step-l { color: var(--text-ink); font-weight: 700; }
      .rd-step-line { height: 2px; flex: .7; margin: 11px 2px 0; background: var(--border-default); }
      .rd-step.done .rd-step-line { background: var(--rasd-gold); }

      .rd-ovw { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 6px 28px; }
      .rd-ovw-t { margin: 0 0 4px; font-size: 11.5px; font-weight: 800; color: var(--rasd-gold); }
      .rd-ovw-row {
        display: flex; align-items: baseline; justify-content: space-between; gap: 14px;
        padding: 9px 0; border-bottom: 1px dashed var(--border-default); font-size: 12.8px;
      }
      .rd-ovw-row:last-child { border-bottom: 0; }
      .rd-ovw-row .k { color: var(--text-muted); font-weight: 600; flex: none; }
      .rd-ovw-row .v { color: var(--text-ink); font-weight: 600; text-align: end; min-width: 0; overflow-wrap: anywhere; }
      .rd-ovw-row a, .rd-ovw-row button.lnk {
        color: var(--rasd-gold); text-decoration: none; background: none; border: 0; padding: 0;
        font: inherit; cursor: pointer;
      }
      .rd-ovw-row a:hover, .rd-ovw-row button.lnk:hover { text-decoration: underline; }

      .rd-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
      .rd-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
      @media (max-width: 960px) { .rd-cols { grid-template-columns: 1fr; } }

      .rd-tl { position: relative; padding-inline-start: 18px; }
      .rd-tl::before { content: ""; position: absolute; inset-inline-start: 4px; top: 6px; bottom: 6px; width: 2px; background: var(--border-default); }
      .rd-tl-i { position: relative; padding: 0 0 14px; }
      .rd-tl-i:last-child { padding-bottom: 0; }
      .rd-tl-i::before {
        content: ""; position: absolute; inset-inline-start: -18px; top: 5px;
        width: 10px; height: 10px; border-radius: 50%; background: var(--bg-surface);
        border: 2px solid var(--rasd-gold);
      }
      .rd-tl-t { font-size: 12.8px; font-weight: 700; color: var(--text-ink); }
      .rd-tl-d { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }

      .rd-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
      .rd-tab {
        font-family: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer;
        padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border-default);
        background: transparent; color: var(--text-muted);
      }
      .rd-tab.on { background: var(--rasd-gold-soft); color: var(--rasd-gold); border-color: var(--rasd-gold-line); }

      /* ---- quick-preview drawer (the design's .drawer) ----
         Opens from the inline-end edge: right in LTR, left in RTL. */
      .rd-drawer-ov {
        position: fixed; inset: 0; background: rgba(10,14,12,.4); z-index: 90;
        animation: rd-fade .18s ease;
      }
      .rd-drawer {
        position: fixed; top: 0; bottom: 0; inset-inline-end: 0; z-index: 95;
        width: 440px; max-width: 92vw; display: flex; flex-direction: column;
        background: var(--bg-surface); border-inline-start: 1px solid var(--border-default);
        box-shadow: 0 10px 40px rgba(0,0,0,.18);
        animation: rd-in .24s cubic-bezier(.2,.8,.2,1);
      }
      .rd[dir="rtl"] .rd-drawer { animation-name: rd-in-rtl; }
      @keyframes rd-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes rd-in { from { transform: translateX(26px); opacity: .3; } to { transform: none; opacity: 1; } }
      @keyframes rd-in-rtl { from { transform: translateX(-26px); opacity: .3; } to { transform: none; opacity: 1; } }
      .rd-drawer-head {
        display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
        padding: 22px 24px 18px; border-bottom: 1px solid var(--border-soft);
        background: linear-gradient(180deg, var(--rasd-gold-soft), transparent);
      }
      .rd-drawer-mark {
        width: 42px; height: 42px; border-radius: 12px; flex: none; display: grid; place-items: center;
        background: var(--rasd-gold); color: #fff; font-weight: 800; font-size: 14px;
      }
      .rd-drawer-sub { font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; }
      .rd-drawer-title {
        margin: 0; font-size: 17px; font-weight: 800; line-height: 1.3; color: var(--text-ink);
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      }
      .rd-drawer-x {
        width: 30px; height: 30px; border-radius: 8px; flex: none; display: grid; place-items: center;
        background: transparent; border: 1px solid var(--border-default); color: var(--text-muted); cursor: pointer;
      }
      .rd-drawer-x:hover { color: var(--text-ink); border-color: var(--text-muted); }
      .rd-drawer-body { flex: 1; overflow-y: auto; padding: 16px 24px 20px; }
      .rd-drawer-foot { display: grid; gap: 8px; padding: 16px 24px; border-top: 1px solid var(--border-soft); }
      .rd-qp-block {
        margin-top: 16px; padding: 14px; border-radius: 12px;
        background: var(--bg-canvas); border: 1px solid var(--border-soft);
      }
      .rd-qp-bt { font-size: 11px; font-weight: 800; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
      .rd-qp-item {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        width: 100%; padding: 8px 0; border: 0; border-bottom: 1px dashed var(--border-default);
        background: none; font-family: inherit; text-align: start; cursor: pointer;
      }
      .rd-qp-item:last-child { border-bottom: 0; }
      .rd-qp-item:hover .rd-qp-in { color: var(--rasd-gold); }
      .rd-qp-in { font-size: 12.5px; font-weight: 700; color: var(--text-ink); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .rd-qp-meta {
        margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-soft);
        display: flex; justify-content: space-between; gap: 10px; font-size: 10.5px; color: var(--text-muted);
      }
    `}</style>
  );
}

/* Root wrapper — scopes the tokens above. */
export function RasdDash({ className = '', children }) {
  return <div className={`rd ${className}`}>{children}</div>;
}

export function DashSection({ children }) {
  return <div className="rd-sec">{children}</div>;
}

/* ---------- Gold opportunity banner ---------- */
export function OppBanner({ icon: Icon, title, subtitle, onClick, rtl }) {
  const Go = rtl ? ChevronLeft : ChevronRight;
  return (
    <button type="button" className="rd-banner" onClick={onClick}>
      <span className="rd-banner-ic">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <span className="rd-banner-txt">
        <span className="rd-banner-h font-display block">{title}</span>
        {subtitle && <span className="rd-banner-s block">{subtitle}</span>}
      </span>
      <span className="rd-banner-go">
        <Go size={18} strokeWidth={2} />
      </span>
    </button>
  );
}

const TONE_VAR = {
  navy: 'var(--rasd-navy)',
  gold: 'var(--rasd-gold)',
  green: 'var(--rasd-green)',
  red: 'var(--rasd-red)',
};

/* ---------- Inventory card ----------
 *  `value` may be a number (formatted with Latin digits) or a node. */
export function InvCard({ icon: Icon, tone = 'navy', value, label, note, onClick, lang, goldValue }) {
  const Tag = onClick ? 'button' : 'div';
  const shown =
    typeof value === 'number' ? (
      <Ltr>{formatNumber(value, lang, 0, { latin: true })}</Ltr>
    ) : (
      value
    );
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className="rd-card"
      onClick={onClick}
      style={{ '--rd-tone': TONE_VAR[tone] }}
    >
      <span className={`rd-ic ${tone}`}>
        <Icon size={16} strokeWidth={1.8} />
      </span>
      <span className="rd-card-body block">
        <span className={`rd-val font-display block${goldValue ? ' gold' : ''}`}>{shown}</span>
        <span className="rd-lab block">{label}</span>
        {note && <span className="rd-note block">{note}</span>}
      </span>
    </Tag>
  );
}

export function InvCards({ cols = 4, children }) {
  return <div className={`rd-cards${cols === 3 ? ' c3' : ''}`}>{children}</div>;
}

/* ---------- Widget ---------- */
export function Widget({ span = 6, icon: Icon, title, action, footNote, children }) {
  return (
    <div className={`rd-widget rd-w${span}`}>
      <div className="rd-widget-head">
        <h4>
          {Icon && (
            <span className="rd-w-ic">
              <Icon size={15} strokeWidth={1.9} />
            </span>
          )}
          {title}
        </h4>
        {action}
      </div>
      <div className="rd-widget-body">{children}</div>
      {footNote && <p className="rd-foot">{footNote}</p>}
    </div>
  );
}

/* ---------- Stacked stage bar ----------
 *  rows: [{ value, label, count, color }] — already ordered. */
export function StackedBar({ rows, onSelect, lang, emptyLabel }) {
  const list = (rows || []).filter((r) => r.count > 0);
  const total = list.reduce((s, r) => s + r.count, 0);
  if (!total) {
    return <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{emptyLabel}</div>;
  }
  return (
    <div>
      <div className="rd-sb" dir="ltr">
        {list.map((r) => (
          <button
            key={r.value}
            type="button"
            className="rd-sb-seg"
            title={`${r.label}: ${r.count}`}
            aria-label={`${r.label}: ${r.count}`}
            onClick={() => onSelect?.(r.value)}
            style={{ width: `${(r.count / total) * 100}%`, minWidth: 4, background: r.color }}
          />
        ))}
      </div>
      <div className="rd-sb-key">
        {list.map((r) => (
          <button key={r.value} type="button" className="rd-sb-k" onClick={() => onSelect?.(r.value)}>
            <i style={{ background: r.color }} />
            {r.label}{' '}
            <b>
              <Ltr>{formatNumber(r.count, lang, 0, { latin: true })}</Ltr>
            </b>
            <small>
              <Ltr>{Math.round((r.count / total) * 100)}%</Ltr>
            </small>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Meter stat (coverage, freshness…) ---------- */
export function MeterStat({ value, label, percent }) {
  return (
    <div>
      <div className="rd-stat font-display">
        <Ltr>{value}</Ltr>
      </div>
      <div className="rd-stat-l">{label}</div>
      <div className="rd-meter">
        <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
    </div>
  );
}

/* ---------- Data table ----------
 *  A row that behaves as a link: click or Enter opens it. Inner
 *  buttons (e.g. a copy chip) should stopPropagation. */
export function DataTable({ head, flat, children }) {
  return (
    <div className={`rd-table-wrap${flat ? ' flat' : ''}`}>
      <table className="rd-table">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function LinkRow({ onOpen, children }) {
  return (
    <tr
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && e.key === 'Enter') onOpen();
      }}
    >
      {children}
    </tr>
  );
}

export function RowGo({ rtl }) {
  const Go = rtl ? ChevronLeft : ChevronRight;
  return (
    <span className="rd-go">
      <Go size={16} strokeWidth={1.9} />
    </span>
  );
}

/* Stage → chip tone, matching the stacked bar's colours. */
export const STAGE_CHIP = {
  tendering: 'gold',
  awarded: 'navy',
  under_construction: 'navy',
  completed: 'green',
  on_hold: 'red',
};

export const CONFIDENCE_CHIP = { high: 'green', medium: 'gold', needs_verification: 'muted' };

/* ---------- Detail-page pieces ---------- */
export function Crumbs({ items }) {
  return (
    <nav className="rd-crumb">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span aria-hidden="true">›</span>}
          {it.onClick ? (
            <button type="button" onClick={it.onClick}>
              {it.label}
            </button>
          ) : (
            <span className="cur">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function Band({ icon: Icon, title, count, action, children, className = '' }) {
  return (
    <section className={`rd-band ${className}`}>
      {title && (
        <div className="rd-band-h">
          <span>
            {Icon && (
              <span className="rd-w-ic">
                <Icon size={15} strokeWidth={1.9} />
              </span>
            )}
            {title}
            {count != null && (
              <span className="n">
                (<Ltr>{count}</Ltr>)
              </span>
            )}
          </span>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function OvwGroup({ title, rows }) {
  return (
    <section>
      <h4 className="rd-ovw-t">{title}</h4>
      {rows.filter(Boolean).map(([k, v], i) => (
        <div key={i} className="rd-ovw-row">
          <span className="k">{k}</span>
          <span className="v">{v}</span>
        </div>
      ))}
    </section>
  );
}

export function initials(name) {
  const words = String(name || '')
    .replace(/^(شركة|مؤسسة|مكتب|مشروع)\s+/, '')
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '·';
}

export function WidgetLink({ children, onClick, rtl }) {
  const Go = rtl ? ChevronLeft : ChevronRight;
  return (
    <button type="button" className="rd-link" onClick={onClick}>
      {children}
      <Go size={12} strokeWidth={2.2} />
    </button>
  );
}
