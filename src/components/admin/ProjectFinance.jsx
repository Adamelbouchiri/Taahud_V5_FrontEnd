import React from 'react';
import { AlertTriangle, Clock3 } from 'lucide-react';
import { Badge, DataTable } from './AdminUI';
import { formatSar, localeFor } from '../../utils/money';

/* ============================================================
 *  ProjectFinance — the admin-only milestone + payment sections
 *  of the enriched admin project resource.
 *  ----------------------------------------------------------------
 *  Backed by GET /admin/projects/:id (and the nested `project` on
 *  GET /admin/applications/:id), which carry `steps`,
 *  `payment_summary` and `partner_earnings` on top of the plain
 *  project fields. Shared by the project detail page and the
 *  application detail modal so both read the same way.
 *
 *  MONEY: every amount on this view is a SAR-decimal string
 *  ("120000.00") — no halalas. services/admin.js parses them into
 *  `*_num` twins; we render with formatSar so the thousands
 *  separators match the rest of the admin console.
 *
 *  Two counts that are easy to conflate:
 *    - steps_total / steps_paid  → IN-PLAN steps only
 *    - proposed_count            → provider proposals still waiting
 *                                  on the owner, NOT part of the plan
 * ============================================================ */


/* ---------- step status → Badge tone ----------
 *  `proposed` sits outside the pending → submitted → approved
 *  machine, so it gets its own tone rather than sharing `pending`'s.
 */
export function stepStatusTone(status) {
  switch (status) {
    case 'approved':
      return 'success';
    case 'submitted':
      return 'warning';
    case 'proposed':
      return 'primary';
    case 'pending':
    default:
      return 'muted';
  }
}

function stepStatusLabel(status, t) {
  if (!status) return '—';
  const key = `admin.finance.stepStatuses.${status}`;
  const label = t(key);
  // `t` echoes the key back when it's missing — fall back to the raw
  // enum so a new BE status shows as itself instead of a dotted path.
  return label === key ? status : label;
}

export function StepStatusBadge({ status, t }) {
  return <Badge tone={stepStatusTone(status)}>{stepStatusLabel(status, t)}</Badge>;
}


/* ---------- Stat tile ---------- */
function Stat({ label, value, tone }) {
  return (
    <div
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-soft)',
        borderRadius: 11,
        padding: '11px 13px',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: tone || 'var(--text-ink)' }}>
        {value}
      </div>
    </div>
  );
}


/* ---------- Notice strip ---------- */
function Notice({ icon: Icon, tone, children }) {
  const palette =
    tone === 'danger'
      ? { bg: 'rgba(185,28,28,0.06)', border: 'rgba(185,28,28,0.18)', fg: 'var(--accent-danger)' }
      : { bg: 'rgba(184,134,42,0.08)', border: 'rgba(184,134,42,0.22)', fg: '#b8862a' };
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-[10px]"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.fg,
        fontSize: 12.5,
        lineHeight: 1.55,
      }}
    >
      <Icon size={15} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
}


/* ============================================================
 *  PaymentSummary — budget vs paid, step counts, partner earnings.
 *  Renders nothing when the project has no payment_summary (e.g. an
 *  older API build), so callers can drop it in unconditionally.
 * ============================================================ */
export function PaymentSummary({ project, t, lang, compact = false }) {
  const s = project?.payment_summary;
  if (!s) return null;

  const budget = s.budget_num || 0;
  const paid = s.total_paid_num || 0;
  const earnings = project.partner_earnings_num;
  const pct = budget > 0 ? Math.min(100, Math.round((paid / budget) * 100)) : 0;

  // total_paid and partner_earnings both mean "money paid for this
  // project's steps". If they drift apart, say so instead of quietly
  // showing two different numbers.
  const mismatch = earnings != null && Math.abs(earnings - paid) >= 0.01;

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`grid gap-2.5 ${
          compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
        }`}
      >
        <Stat label={t('admin.finance.budget')} value={formatSar(budget, lang, t)} />
        <Stat
          label={t('admin.finance.paid')}
          value={formatSar(paid, lang, t)}
          tone={paid > 0 ? '#136d4a' : undefined}
        />
        <Stat
          label={t('admin.finance.stepsPaid')}
          value={t('admin.finance.stepsPaidValue', {
            paid: s.steps_paid,
            total: s.steps_total,
          })}
        />
        {earnings != null && (
          <Stat
            label={t('admin.finance.partnerEarnings')}
            value={formatSar(earnings, lang, t)}
            tone={mismatch ? 'var(--accent-danger)' : undefined}
          />
        )}
      </div>

      <div>
        <div
          className="flex items-center justify-between gap-2 mb-1.5"
          style={{ fontSize: 12, color: 'var(--text-muted)' }}
        >
          <span>
            {t('admin.finance.paidOfBudget', {
              paid: formatSar(paid, lang, t),
              budget: formatSar(budget, lang, t),
            })}
          </span>
          <span style={{ fontWeight: 700, color: 'var(--text-ink-soft)' }}>{pct}%</span>
        </div>
        <div
          style={{
            height: 7,
            borderRadius: 999,
            background: 'var(--bg-cream)',
            border: '1px solid var(--border-soft)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'var(--accent-primary)',
              borderRadius: 999,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {s.proposed_count > 0 && (
        <Notice icon={Clock3} tone="warning">
          {t('admin.finance.proposedCallout', { count: s.proposed_count })}
        </Notice>
      )}

      {mismatch && (
        <Notice icon={AlertTriangle} tone="danger">
          {t('admin.finance.mismatch', {
            paid: formatSar(paid, lang, t),
            earnings: formatSar(earnings, lang, t),
          })}
        </Notice>
      )}
    </div>
  );
}


/* ============================================================
 *  StepsTable — the milestone plan, proposals included.
 * ============================================================ */
export function StepsTable({ steps, t, lang, compact = false }) {
  const rows = Array.isArray(steps) ? steps : [];

  const fmtDate = (s) => {
    if (!s) return null;
    try {
      return new Date(s).toLocaleDateString(localeFor(lang), {
        dateStyle: 'medium',
      });
    } catch {
      return s;
    }
  };

  const columns = [
    ...(compact
      ? []
      : [
          {
            key: 'sequence',
            label: t('admin.finance.columns.sequence'),
            headerStyle: { width: 56 },
            render: (row) => (
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                {row.sequence ?? '—'}
              </span>
            ),
          },
        ]),
    {
      key: 'title',
      label: t('admin.finance.columns.step'),
      render: (row) => (
        <div className="min-w-0">
          <div
            className="truncate"
            style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-ink)' }}
          >
            {row.title || `#${row.id}`}
          </div>
          {compact && row.sequence != null && (
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {t('admin.finance.columns.sequence')} {row.sequence}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: t('admin.finance.columns.amount'),
      render: (row) => (
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-ink)' }}>
          {formatSar(row.amount_num ?? row.amount ?? 0, lang, t)}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('admin.finance.columns.status'),
      render: (row) => <StepStatusBadge status={row.status} t={t} />,
    },
    {
      key: 'payment',
      label: t('admin.finance.columns.payment'),
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <Badge tone={row.is_paid ? 'success' : 'muted'}>
            {row.is_paid ? t('admin.finance.payment.paid') : t('admin.finance.payment.unpaid')}
          </Badge>
          {row.is_paid && row.paid_at && (
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {fmtDate(row.paid_at)}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      emptyTitle={t('admin.finance.noSteps')}
    />
  );
}
