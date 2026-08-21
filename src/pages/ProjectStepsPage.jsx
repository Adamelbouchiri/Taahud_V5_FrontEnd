import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowRight,
  AlertCircle,
  LayoutDashboard,
  Milestone,
  Wallet,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  Hourglass,
  Plus,
  PlusCircle,
  Trash2,
  Save,
  Pencil,
  Send,
  Lock,
  MessageSquareWarning,
  ClipboardCheck,
  Coins,
  CreditCard,
  Loader2,
} from 'lucide-react';
import Logo from '../components/Logo';
import LanguageThemeSwitcher from '../components/LanguageThemeSwitcher';
import { projects as projectsApi, steps as stepsApi } from '../services';
import { UserProvider, useUser } from '../contexts/UserContext';
import StatusBadge from '../components/project/StatusBadge';
import { useTranslation } from '../i18n/LanguageContext';

/* ============================================================
 *  ProjectStepsPage — /projects/:id/steps
 *  ----------------------------------------------------------------
 *  Milestone-based execution surface. The project PROVIDER defines an
 *  amount-weighted plan (sum must equal the budget) and marks steps
 *  finished; the project OWNER reviews each (pleased / not_pleased).
 *  Approved steps drive project.progress. See PROJECT_STEPS_FRONTEND.md.
 *
 *  This page is also where the ESCROW money moves (see
 *  WALLET_PAYMENTS_FRONTEND v2). Payment is SERVER-DRIVEN, the same as
 *  subscription checkout: we ask the backend for a session, redirect to
 *  the shared /pay/:sessionId page, and the backend's Moyasar callback
 *  credits the provider's wallet as HELD. Approving the step releases it.
 *
 *  So the only thing this page does about money is start the session and
 *  read ?paid=<stepId> / ?cancelled=<stepId> on the way back. It never
 *  sends an amount and never confirms a payment — if it did, closing the
 *  browser mid-flow could capture money that never got credited.
 * ============================================================ */

const BRAND = '#136d4a';
const BRAND_DARK = '#0d5538';
const DANGER = '#b91c1c';
const AMBER = '#8a6620';
// Proposals are a different KIND of thing from plan steps (they're not in the
// plan yet), so they get the brand indigo rather than a step status colour.
const INDIGO = '#2c2f7c';

export default function ProjectStepsPageRoute() {
  return (
    <UserProvider>
      <ProjectStepsPage />
    </UserProvider>
  );
}

function ProjectStepsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Outcome of a payment we've just been redirected back from:
  // null | { ok: boolean }
  const [payOutcome, setPayOutcome] = useState(null);

  const load = React.useCallback(async () => {
    // Both reads are needed: the project for progress/budget/roles, the
    // steps for the plan itself. Fetch in parallel.
    const [p, list] = await Promise.all([
      projectsApi.get(id),
      stepsApi.list(id).catch(() => []),
    ]);
    setProject(p);
    setItems(list);
  }, [id]);

  const reloadSteps = React.useCallback(async () => {
    // After a step action, refresh both so project.progress tracks the
    // approved steps and any status transition is reflected.
    const [p, list] = await Promise.all([
      projectsApi.get(id),
      stepsApi.list(id),
    ]);
    setProject(p);
    setItems(list);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    load()
      .catch((err) => {
        if (!cancelled) setError(err.message || t('projects.milestones.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load, t]);

  /* ------------------------------------------------------------
   * Payment return handler.
   * ------------------------------------------------------------
   * The BACKEND callback already verified the payment and credited the
   * wallet before redirecting here, so there is nothing to confirm and
   * nothing that can be lost by arriving late (or not at all). All we
   * do is read the outcome it appended:
   *
   *   ?paid=<stepId>       credited
   *   ?cancelled=<stepId>  no charge
   *
   * The params are stripped straight away so a refresh doesn't re-show
   * the banner. On success we reload, because the freshly-stamped
   * paid_at was written server-side after this page's data was fetched.
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (loading) return;

    const paid = searchParams.get('paid');
    const cancelledParam = searchParams.get('cancelled');
    if (!paid && !cancelledParam) return;

    const next = new URLSearchParams(searchParams);
    next.delete('paid');
    next.delete('cancelled');
    setSearchParams(next, { replace: true });

    setPayOutcome({ ok: !!paid });
    if (paid) reloadSteps().catch(() => {});
  }, [loading, searchParams, setSearchParams, reloadSteps]);

  if (loading)
    return (
      <Shell>
        <LoadingState />
      </Shell>
    );
  if (error || !project)
    return (
      <Shell>
        <ErrorView message={error} onBack={() => navigate(-1)} />
      </Shell>
    );

  const isOwner = user && project.user_id === user.id;
  const isProvider = user && project.partner_id && project.partner_id === user.id;
  const hasProvider = !!project.partner_id;

  return (
    <Shell>
      <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1180px] mx-auto">
        <Breadcrumb
          items={[
            { label: t('projects.details.breadcrumbBrowse'), to: '/projects' },
            { label: project.name, to: `/projects/${project.id}` },
            { label: t('projects.milestones.crumb') },
          ]}
        />

        <PageHeader project={project} isOwner={isOwner} isProvider={isProvider} />

        {payOutcome && (
          <PaymentOutcomeBanner
            outcome={payOutcome}
            onDismiss={() => setPayOutcome(null)}
          />
        )}

        {!hasProvider ? (
          <NotAwardedState />
        ) : !isOwner && !isProvider ? (
          <NoAccessState onBack={() => navigate(`/projects/${project.id}`)} />
        ) : (
          <StepsBoard
            project={project}
            steps={items}
            isOwner={isOwner}
            isProvider={isProvider}
            onChanged={reloadSteps}
          />
        )}
      </div>
    </Shell>
  );
}

/* ============================================================
 *  Board — the summary strip + plan builder + step list.
 * ============================================================ */
function StepsBoard({ project, steps, isOwner, isProvider, onChanged }) {
  const { t } = useTranslation();

  // `proposed` steps sit OUTSIDE the plan until the owner accepts them, so
  // they're excluded from every total here exactly as the API excludes them
  // from the budget/progress invariant (ProjectStepStatus::inPlan()).
  const planSteps = steps.filter((s) => s.status !== 'proposed');
  const proposals = steps.filter((s) => s.status === 'proposed');

  const budget = parseAmount(project.budget);
  const allocated = planSteps.reduce((sum, s) => sum + (s.amount_num || 0), 0);
  const approvedAmount = planSteps
    .filter((s) => s.status === 'approved')
    .reduce((sum, s) => sum + (s.amount_num || 0), 0);
  const paidSteps = planSteps.filter((s) => s.paid_at);
  const paidAmount = paidSteps.reduce((sum, s) => sum + (s.amount_num || 0), 0);
  // Paid AND approved = out of escrow and withdrawable by the provider.
  const releasedAmount = paidSteps
    .filter((s) => s.status === 'approved')
    .reduce((sum, s) => sum + (s.amount_num || 0), 0);
  const awaiting = planSteps.filter((s) => s.status === 'submitted').length;

  // The plan is editable (provider only) until a step is actually started.
  // Mirrors the API rule — which keys off submitted/approved only, so a
  // pending PROPOSAL must not freeze the builder.
  const planLocked = planSteps.some(
    (s) => s.status === 'submitted' || s.status === 'approved'
  );
  const canEditPlan = isProvider && !planLocked;
  const hasPlan = planSteps.length > 0;

  // Start in builder mode when the provider has no plan yet.
  const [editing, setEditing] = useState(canEditPlan && !hasPlan);
  const [proposing, setProposing] = useState(false);

  return (
    <div className="space-y-6 mt-2">
      <SummaryStrip
        budget={budget}
        allocated={allocated}
        approvedAmount={approvedAmount}
        paidAmount={paidAmount}
        releasedAmount={releasedAmount}
        paidCount={paidSteps.length}
        totalCount={planSteps.length}
      />

      {awaiting > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-[12px]"
          style={{
            background: 'rgba(184,134,42,0.08)',
            border: '1px solid rgba(184,134,42,0.22)',
            color: AMBER,
            fontSize: 13,
          }}
        >
          <Hourglass size={15} strokeWidth={1.9} />
          <span className="font-semibold">
            {t('projects.milestones.awaitingBanner', { count: awaiting })}
          </span>
        </div>
      )}

      {isOwner && proposals.length > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-[12px]"
          style={{
            background: 'rgba(44,47,124,0.06)',
            border: '1px solid rgba(44,47,124,0.2)',
            color: INDIGO,
            fontSize: 13,
          }}
        >
          <PlusCircle size={15} strokeWidth={1.9} />
          <span className="font-semibold">
            {t('projects.milestones.proposals.bannerOwner', {
              count: proposals.length,
            })}
          </span>
        </div>
      )}

      {proposing && (
        <ProposeForm
          project={project}
          onCancel={() => setProposing(false)}
          onProposed={async () => {
            await onChanged();
            setProposing(false);
          }}
        />
      )}

      {proposals.length > 0 && (
        <ProposalList
          project={project}
          proposals={proposals}
          budget={budget}
          isOwner={isOwner}
          onChanged={onChanged}
        />
      )}

      {editing ? (
        <PlanBuilder
          project={project}
          budget={budget}
          initial={planSteps}
          proposalCount={proposals.length}
          onCancel={hasPlan ? () => setEditing(false) : null}
          onSaved={async () => {
            await onChanged();
            setEditing(false);
          }}
        />
      ) : (
        <StepList
          project={project}
          steps={planSteps}
          isOwner={isOwner}
          isProvider={isProvider}
          canEditPlan={canEditPlan}
          onEditPlan={() => setEditing(true)}
          // Adding a step only makes sense once a plan exists — before that
          // the provider should just define (or re-define) the plan itself.
          canPropose={isProvider && hasPlan && !proposing}
          onPropose={() => setProposing(true)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

/* ============================================================
 *  Summary strip — budget / allocated / approved / paid tiles.
 * ============================================================ */
function SummaryStrip({
  budget,
  allocated,
  approvedAmount,
  paidAmount,
  releasedAmount,
  paidCount,
  totalCount,
}) {
  const { t, lang } = useTranslation();
  const pct = budget > 0 ? Math.round((approvedAmount / budget) * 100) : 0;
  // Paid but not yet approved — still escrowed, not withdrawable.
  const heldAmount = Math.max(0, round2(paidAmount - releasedAmount));

  const tiles = [
    {
      icon: Wallet,
      label: t('projects.milestones.summary.budget'),
      value: money(budget, lang, t),
      tone: 'ink',
    },
    {
      icon: Layers,
      label: t('projects.milestones.summary.allocated'),
      value: money(allocated, lang, t),
      tone: 'ink',
    },
    {
      icon: CheckCircle2,
      label: t('projects.milestones.summary.approved'),
      value: money(approvedAmount, lang, t),
      sub: `${pct}%`,
      tone: 'brand',
    },
    {
      icon: Coins,
      label: t('projects.milestones.summary.paid'),
      value: money(paidAmount, lang, t),
      // Two facts matter about paid money: how many steps it covers,
      // and how much of it is still escrowed rather than released.
      sub:
        heldAmount > 0
          ? t('projects.milestones.summary.heldSub', {
              amount: money(heldAmount, lang, t),
            })
          : t('projects.milestones.summary.paidSub', {
              paid: paidCount,
              total: totalCount,
            }),
      tone: paidAmount > 0 ? 'brand' : 'muted',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-[14px] p-4"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div
            className="inline-flex items-center gap-1.5 font-medium uppercase mb-2"
            style={{ fontSize: 10.5, letterSpacing: '0.07em', color: 'var(--text-muted)' }}
          >
            <tile.icon size={13} strokeWidth={1.8} />
            {tile.label}
          </div>
          <div
            className="font-bold font-display"
            style={{
              fontSize: 18,
              lineHeight: 1.2,
              color: tile.tone === 'brand' ? BRAND : 'var(--text-ink)',
            }}
          >
            {tile.value}
          </div>
          {tile.sub && (
            <div
              className="mt-0.5"
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: tile.tone === 'brand' ? BRAND : 'var(--text-muted)',
              }}
            >
              {tile.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
 *  Plan builder — provider defines / replaces the whole plan.
 *  Live-sums the amounts and gates "Save" until they equal the
 *  budget exactly, mirroring the API rule.
 * ============================================================ */
function PlanBuilder({ project, budget, initial, proposalCount = 0, onCancel, onSaved }) {
  const { t, lang } = useTranslation();

  const seed = useMemo(() => {
    if (initial && initial.length > 0) {
      return initial.map((s) => ({
        title: s.title || '',
        amount: s.amount != null ? String(parseAmount(s.amount)) : '',
      }));
    }
    return [
      { title: '', amount: '' },
      { title: '', amount: '' },
    ];
  }, [initial]);

  const [rows, setRows] = useState(seed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sum = rows.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
  const diff = round2(budget - sum);
  const matches = Math.abs(diff) < 0.01;
  const allTitled = rows.every((r) => r.title.trim().length > 0);
  const canSave = matches && allTitled && rows.length > 0 && !saving;

  const setRow = (i, patch) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { title: '', amount: '' }]);
  const removeRow = (i) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const distributeRemainder = () => {
    // Convenience: drop the leftover (budget − sum) onto the last row so
    // the provider can reach an exact match in one click.
    if (rows.length === 0) return;
    const lastIdx = rows.length - 1;
    const others = rows.reduce(
      (acc, r, idx) => (idx === lastIdx ? acc : acc + (parseFloat(r.amount) || 0)),
      0
    );
    const remainder = round2(budget - others);
    setRow(lastIdx, { amount: String(remainder > 0 ? remainder : 0) });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await stepsApi.savePlan(project.id, rows.map((r) => ({
        title: r.title.trim(),
        amount: r.amount,
      })));
      await onSaved();
    } catch (err) {
      setError(err.message || t('projects.milestones.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title={t('projects.milestones.builder.title')}
      subtitle={t('projects.milestones.builder.subtitle')}
      icon={Pencil}
    >
      {error && <InlineError>{error}</InlineError>}

      {/* Saving replaces the WHOLE plan server-side, which wipes any step
          still waiting on the owner. Warn before that's a surprise. */}
      {proposalCount > 0 && (
        <div
          className="flex items-start gap-2 p-3 rounded-[10px] mb-3.5"
          style={{
            background: 'rgba(184,134,42,0.07)',
            border: '1px solid rgba(184,134,42,0.22)',
            color: AMBER,
            fontSize: 12.5,
            lineHeight: 1.65,
          }}
        >
          <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            {t('projects.milestones.proposals.planWarning', { count: proposalCount })}
          </span>
        </div>
      )}

      <div className="space-y-2.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span
              className="flex items-center justify-center flex-shrink-0 font-bold font-display"
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-soft)',
                color: 'var(--text-muted)',
                fontSize: 12.5,
              }}
            >
              {i + 1}
            </span>
            <input
              type="text"
              value={row.title}
              onChange={(e) => setRow(i, { title: e.target.value })}
              placeholder={t('projects.milestones.builder.titlePlaceholder')}
              className="flex-1 min-w-0"
              style={inputStyle}
            />
            <div className="relative" style={{ width: 150, flexShrink: 0 }}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={row.amount}
                onChange={(e) => setRow(i, { amount: e.target.value })}
                placeholder="0"
                className="w-full"
                style={{ ...inputStyle, paddingInlineEnd: 44, textAlign: 'start' }}
              />
              <span
                className="absolute top-1/2 -translate-y-1/2"
                style={{
                  insetInlineEnd: 12,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              >
                {t('common.currency')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={rows.length <= 1}
              className="flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: rows.length <= 1 ? 'var(--border-strong)' : DANGER,
                cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
              }}
              aria-label={t('projects.milestones.builder.removeRow')}
            >
              <Trash2 size={14} strokeWidth={1.8} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 mt-3 px-3 py-2 rounded-[9px] font-semibold transition-colors"
        style={{
          fontSize: 12.5,
          background: 'var(--bg-canvas)',
          border: '1px dashed var(--border-default)',
          color: 'var(--text-ink-soft)',
          cursor: 'pointer',
        }}
      >
        <Plus size={14} strokeWidth={2} />
        {t('projects.milestones.builder.addStep')}
      </button>

      {/* Live sum vs budget */}
      <div
        className="mt-5 p-4 rounded-[12px]"
        style={{
          background: matches ? 'rgba(19,109,74,0.05)' : 'var(--bg-canvas)',
          border: `1px solid ${matches ? 'rgba(19,109,74,0.2)' : 'var(--border-default)'}`,
        }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-6 flex-wrap" style={{ fontSize: 12.5 }}>
            <SumStat label={t('projects.milestones.builder.sum')} value={money(sum, lang, t)} />
            <SumStat label={t('projects.milestones.builder.budget')} value={money(budget, lang, t)} />
            <SumStat
              label={t('projects.milestones.builder.difference')}
              value={money(Math.abs(diff), lang, t)}
              tone={matches ? 'ok' : 'warn'}
              prefix={matches ? '' : diff > 0 ? '−' : '+'}
            />
          </div>
          {!matches && (
            <button
              type="button"
              onClick={distributeRemainder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-semibold transition-colors"
              style={{
                fontSize: 12,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
                cursor: 'pointer',
              }}
            >
              {t('projects.milestones.builder.fillRemainder')}
            </button>
          )}
        </div>
        <p
          className="m-0 mt-2.5"
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            color: matches ? BRAND_DARK : 'var(--text-muted)',
          }}
        >
          {matches
            ? t('projects.milestones.builder.matchOk')
            : t('projects.milestones.builder.matchHint')}
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 mt-5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2.5 rounded-[10px] font-semibold transition-colors"
            style={{
              fontSize: 13.5,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-ink-soft)',
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {t('projects.milestones.builder.cancel')}
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold transition-all"
          style={{
            fontSize: 13.5,
            background: canSave ? BRAND : 'var(--border-strong)',
            border: `1px solid ${canSave ? BRAND : 'var(--border-strong)'}`,
            cursor: canSave ? 'pointer' : 'not-allowed',
            boxShadow: canSave ? '0 6px 14px rgba(19,109,74,0.22)' : 'none',
          }}
        >
          <Save size={15} strokeWidth={1.9} />
          {saving
            ? t('projects.milestones.builder.saving')
            : t('projects.milestones.builder.save')}
        </button>
      </div>
    </Panel>
  );
}

/* ============================================================
 *  Propose form — provider adds ONE step to a live project.
 *  ----------------------------------------------------------------
 *  Deliberately not part of PlanBuilder: this bypasses the
 *  sum-equals-budget rule (the budget GROWS on approval instead) and
 *  allows amount 0 for a free clarification step.
 * ============================================================ */
function ProposeForm({ project, onCancel, onProposed }) {
  const { t, lang } = useTranslation();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const amountNum = parseFloat(amount) || 0;
  const canSave = title.trim().length > 0 && amountNum >= 0 && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      await stepsApi.propose(project.id, {
        title: title.trim(),
        amount: amountNum,
      });
      await onProposed();
    } catch (err) {
      setError(err.message || t('projects.milestones.proposals.addError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title={t('projects.milestones.proposals.addTitle')}
      subtitle={t('projects.milestones.proposals.addSubtitle')}
      icon={PlusCircle}
    >
      {error && <InlineError>{error}</InlineError>}

      <div className="flex items-start gap-2.5 flex-wrap">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
          placeholder={t('projects.milestones.proposals.titlePlaceholder')}
          className="flex-1"
          style={{ ...inputStyle, minWidth: 220 }}
        />
        <div className="relative" style={{ width: 170, flexShrink: 0 }}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full"
            style={{ ...inputStyle, paddingInlineEnd: 44, textAlign: 'start' }}
          />
          <span
            className="absolute top-1/2 -translate-y-1/2"
            style={{
              insetInlineEnd: 12,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          >
            {t('common.currency')}
          </span>
        </div>
      </div>

      <p
        className="m-0 mt-2.5"
        style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--text-muted)' }}
      >
        {amountNum > 0
          ? t('projects.milestones.proposals.amountEffect', {
              amount: money(amountNum, lang, t),
            })
          : t('projects.milestones.proposals.amountHint')}
      </p>

      <div className="flex items-center justify-end gap-2 mt-5">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2.5 rounded-[10px] font-semibold transition-colors"
          style={{
            fontSize: 13.5,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-ink-soft)',
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {t('projects.milestones.proposals.cancel')}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold transition-all"
          style={{
            fontSize: 13.5,
            background: canSave ? BRAND : 'var(--border-strong)',
            border: `1px solid ${canSave ? BRAND : 'var(--border-strong)'}`,
            cursor: canSave ? 'pointer' : 'not-allowed',
            boxShadow: canSave ? '0 6px 14px rgba(19,109,74,0.22)' : 'none',
          }}
        >
          {saving ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} strokeWidth={1.9} />
          )}
          {saving
            ? t('projects.milestones.proposals.submitting')
            : t('projects.milestones.proposals.submit')}
        </button>
      </div>
    </Panel>
  );
}

/* ============================================================
 *  Proposal list — steps waiting on the owner's decision.
 *  Kept visually separate from the plan: these aren't part of it yet.
 * ============================================================ */
function ProposalList({ project, proposals, budget, isOwner, onChanged }) {
  const { t } = useTranslation();
  return (
    <Panel
      title={t('projects.milestones.proposals.title')}
      subtitle={
        isOwner
          ? t('projects.milestones.proposals.subtitleOwner', { count: proposals.length })
          : t('projects.milestones.proposals.subtitleProvider', { count: proposals.length })
      }
      icon={PlusCircle}
    >
      <div className="space-y-3">
        {proposals.map((step) => (
          <ProposalCard
            key={step.id}
            project={project}
            step={step}
            budget={budget}
            isOwner={isOwner}
            onChanged={onChanged}
          />
        ))}
      </div>
    </Panel>
  );
}

function ProposalCard({ project, step, budget, isOwner, onChanged }) {
  const { t, lang } = useTranslation();
  const [acting, setActing] = useState(null); // null | 'approve' | 'reject'
  const [error, setError] = useState('');

  const isFree = (step.amount_num || 0) <= 0;

  const decide = async (verdict) => {
    setActing(verdict);
    setError('');
    try {
      if (verdict === 'approve') {
        await stepsApi.approveProposal(project.id, step.id);
      } else {
        await stepsApi.rejectProposal(project.id, step.id);
      }
      // onChanged re-reads the PROJECT too — approving a paid proposal grew
      // the budget server-side, so every total on this page is now stale.
      await onChanged();
    } catch (err) {
      setError(err.message || t('projects.milestones.proposals.actionError'));
      setActing(null);
    }
  };

  return (
    <article
      className="rounded-[13px] overflow-hidden"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid rgba(44,47,124,0.22)',
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(44,47,124,0.1)',
                color: INDIGO,
              }}
            >
              <PlusCircle size={16} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <div
                className="font-semibold"
                style={{ fontSize: 14.5, color: 'var(--text-ink)', lineHeight: 1.35 }}
              >
                {step.title}
              </div>
              <div
                className="inline-flex items-center gap-1.5 mt-1 font-semibold"
                style={{ fontSize: 13, color: 'var(--text-ink-soft)' }}
              >
                <Wallet size={12.5} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
                {isFree
                  ? t('projects.milestones.proposals.free')
                  : money(step.amount_num, lang, t)}
              </div>
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap"
            style={{
              fontSize: 11,
              padding: '4px 10px',
              background: 'rgba(44,47,124,0.08)',
              color: INDIGO,
              border: '1px solid rgba(44,47,124,0.22)',
            }}
          >
            <Hourglass size={12} strokeWidth={2} />
            {isOwner
              ? t('projects.milestones.proposals.badgeOwner')
              : t('projects.milestones.proposals.badgeProvider')}
          </span>
        </div>

        {/* The owner is consenting to a budget increase — say so in numbers. */}
        <p
          className="m-0 mt-3 p-3 rounded-[10px]"
          style={{
            fontSize: 12.5,
            lineHeight: 1.7,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            color: 'var(--text-ink-soft)',
          }}
        >
          {isFree
            ? t('projects.milestones.proposals.freeNote')
            : t('projects.milestones.proposals.costNote', {
                amount: money(step.amount_num, lang, t),
                total: money(round2(budget + (step.amount_num || 0)), lang, t),
              })}
        </p>

        {error && (
          <div className="mt-3">
            <InlineError>{error}</InlineError>
          </div>
        )}

        {isOwner ? (
          <div className="flex items-center justify-end gap-2 mt-3 flex-wrap">
            <button
              type="button"
              onClick={() => decide('reject')}
              disabled={!!acting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] font-semibold transition-colors"
              style={{
                fontSize: 12.5,
                background: 'var(--bg-surface)',
                border: '1px solid rgba(185,28,28,0.3)',
                color: DANGER,
                cursor: acting ? 'wait' : 'pointer',
                opacity: acting && acting !== 'reject' ? 0.6 : 1,
              }}
            >
              <XCircle size={13} strokeWidth={1.8} />
              {acting === 'reject'
                ? t('projects.milestones.proposals.rejecting')
                : t('projects.milestones.proposals.reject')}
            </button>
            <button
              type="button"
              onClick={() => decide('approve')}
              disabled={!!acting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-white font-semibold transition-colors"
              style={{
                fontSize: 12.5,
                background: BRAND,
                border: `1px solid ${BRAND}`,
                cursor: acting ? 'wait' : 'pointer',
                opacity: acting && acting !== 'approve' ? 0.6 : 1,
              }}
            >
              <CheckCircle2 size={13} strokeWidth={1.8} />
              {acting === 'approve'
                ? t('projects.milestones.proposals.approving')
                : t('projects.milestones.proposals.approve')}
            </button>
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 mt-3"
            style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
          >
            <Clock size={13} strokeWidth={1.9} />
            {t('projects.milestones.proposals.awaitingOwner')}
          </div>
        )}
      </div>
    </article>
  );
}

function SumStat({ label, value, tone, prefix = '' }) {
  const color =
    tone === 'ok' ? BRAND : tone === 'warn' ? AMBER : 'var(--text-ink)';
  return (
    <div>
      <div
        className="font-medium uppercase mb-0.5"
        style={{ fontSize: 9.5, letterSpacing: '0.08em', color: 'var(--text-muted)' }}
      >
        {label}
      </div>
      <div className="font-bold" style={{ fontSize: 14, color }}>
        {prefix}
        {value}
      </div>
    </div>
  );
}

/* ============================================================
 *  Step list — read view with per-step actions.
 * ============================================================ */
function StepList({
  project,
  steps,
  isOwner,
  isProvider,
  canEditPlan,
  onEditPlan,
  canPropose,
  onPropose,
  onChanged,
}) {
  const { t } = useTranslation();

  if (steps.length === 0) {
    return (
      <Panel title={t('projects.milestones.plan.title')} icon={Milestone}>
        <EmptyPlan isProvider={isProvider} />
      </Panel>
    );
  }

  return (
    <Panel
      title={t('projects.milestones.plan.title')}
      subtitle={t('projects.milestones.plan.subtitle', { count: steps.length })}
      icon={Milestone}
      action={
        <div className="flex items-center gap-2 flex-wrap">
          {canEditPlan ? (
            <button
              type="button"
              onClick={onEditPlan}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] font-semibold transition-colors"
              style={{
                fontSize: 12.5,
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
                cursor: 'pointer',
              }}
            >
              <Pencil size={13} strokeWidth={1.8} />
              {t('projects.milestones.plan.editPlan')}
            </button>
          ) : isProvider ? (
            <span
              className="inline-flex items-center gap-1.5"
              style={{ fontSize: 11.5, color: 'var(--text-muted)' }}
            >
              <Lock size={12} strokeWidth={1.9} />
              {t('projects.milestones.plan.locked')}
            </span>
          ) : null}
          {/* A locked plan can still GROW — that's the whole point of a
              proposal, so this CTA lives outside the lock branch. */}
          {canPropose && (
            <button
              type="button"
              onClick={onPropose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] font-semibold transition-colors"
              style={{
                fontSize: 12.5,
                background: 'rgba(44,47,124,0.06)',
                border: '1px solid rgba(44,47,124,0.24)',
                color: INDIGO,
                cursor: 'pointer',
              }}
            >
              <PlusCircle size={13} strokeWidth={1.9} />
              {t('projects.milestones.proposals.add')}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-3">
        {steps.map((step) => (
          <StepCard
            key={step.id}
            project={project}
            step={step}
            isOwner={isOwner}
            isProvider={isProvider}
            onChanged={onChanged}
          />
        ))}
      </div>
    </Panel>
  );
}

function StepCard({ project, step, isOwner, isProvider, onChanged }) {
  const { t, lang } = useTranslation();
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [paying, setPaying] = useState(false);

  /* Ask the server to build a checkout session, then hand the browser
     over to the shared /pay page. We stash where we came from so that
     page can send the owner back here (instead of to /subscribe) if the
     session turns out to be expired or forbidden. `paying` is never
     reset on success — the navigation ends this component's life, and
     clearing it would flash the button back to idle mid-redirect. */
  const startPayment = async () => {
    setPaying(true);
    setError('');
    try {
      const { checkout_url } = await stepsApi.startPayment(project.id, step.id);
      if (!checkout_url) throw new Error(t('projects.milestones.pay.errors.startFailed'));
      try {
        sessionStorage.setItem('taahud:payReturn', `/projects/${project.id}/steps`);
      } catch {
        // Private mode / quota — the fallback link still works.
      }
      window.location.assign(checkout_url);
    } catch (err) {
      setError(err.message || t('projects.milestones.pay.errors.startFailed'));
      setPaying(false);
    }
  };

  const submit = async () => {
    setActing(true);
    setError('');
    try {
      await stepsApi.submit(project.id, step.id);
      await onChanged();
    } catch (err) {
      setError(err.message || '');
    } finally {
      setActing(false);
    }
  };

  const review = async (verdict) => {
    if (verdict === 'not_pleased' && note.trim().length === 0) {
      setNoteError(t('projects.milestones.review.noteRequired'));
      return;
    }
    setActing(true);
    setError('');
    setNoteError('');
    try {
      await stepsApi.review(project.id, step.id, { verdict, note: note.trim() });
      setReviewing(false);
      setNote('');
      await onChanged();
    } catch (err) {
      setError(err.message || '');
    } finally {
      setActing(false);
    }
  };

  const cfg = STEP_STATUS[step.status] || STEP_STATUS.pending;
  const rev = step.latest_review;

  return (
    <article
      className="rounded-[13px] overflow-hidden"
      style={{
        background: 'var(--bg-canvas)',
        border: `1px solid ${step.status === 'submitted' ? 'rgba(184,134,42,0.28)' : 'var(--border-soft)'}`,
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className="flex items-center justify-center flex-shrink-0 font-bold font-display"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: cfg.softBg,
                color: cfg.color,
                fontSize: 14,
              }}
            >
              {step.sequence}
            </span>
            <div className="min-w-0">
              <div
                className="font-semibold"
                style={{ fontSize: 14.5, color: 'var(--text-ink)', lineHeight: 1.35 }}
              >
                {step.title}
              </div>
              <div
                className="inline-flex items-center gap-1.5 mt-1 font-semibold"
                style={{ fontSize: 13, color: 'var(--text-ink-soft)' }}
              >
                <Wallet size={12.5} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
                {money(step.amount_num, lang, t)}
                {step.paid_at && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full"
                    style={{
                      fontSize: 10.5,
                      padding: '1px 7px',
                      marginInlineStart: 4,
                      background: 'rgba(19,109,74,0.1)',
                      color: BRAND_DARK,
                    }}
                  >
                    {t('projects.milestones.step.paid')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <StepStatusBadge status={step.status} />
        </div>

        {/* Latest review note — surfaced when a step was reviewed. */}
        {rev && (
          <div
            className="mt-3 p-3 rounded-[10px]"
            style={{
              background:
                rev.verdict === 'not_pleased'
                  ? 'rgba(185,28,28,0.05)'
                  : 'rgba(19,109,74,0.05)',
              border: `1px solid ${rev.verdict === 'not_pleased' ? 'rgba(185,28,28,0.18)' : 'rgba(19,109,74,0.16)'}`,
            }}
          >
            <div
              className="inline-flex items-center gap-1.5 font-semibold uppercase mb-1"
              style={{
                fontSize: 10,
                letterSpacing: '0.06em',
                color: rev.verdict === 'not_pleased' ? DANGER : BRAND_DARK,
              }}
            >
              {rev.verdict === 'not_pleased' ? (
                <MessageSquareWarning size={12} strokeWidth={1.9} />
              ) : (
                <CheckCircle2 size={12} strokeWidth={1.9} />
              )}
              {rev.verdict === 'not_pleased'
                ? t('projects.milestones.review.notPleasedLabel')
                : t('projects.milestones.review.pleasedLabel')}
            </div>
            {rev.note && (
              <p
                className="m-0"
                style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-ink-soft)' }}
              >
                {rev.note}
              </p>
            )}
            {rev.reviewer?.name && (
              <div className="mt-1.5" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                {t('projects.milestones.review.by', { name: rev.reviewer.name })}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3">
            <InlineError>{error}</InlineError>
          </div>
        )}

        {/* ---- Actions ---- */}
        {/* Owner pays the step into escrow. Available on any unpaid
            step — the API doesn't tie payment to a status, and paying
            up front is legitimate (an already-approved step releases
            to the provider the moment it's paid). */}
        {isOwner && !step.paid_at && (
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={startPayment}
              disabled={paying}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] text-white font-semibold transition-all"
              style={{
                fontSize: 13,
                background: BRAND,
                border: `1px solid ${BRAND}`,
                cursor: paying ? 'wait' : 'pointer',
                opacity: paying ? 0.75 : 1,
                boxShadow: '0 5px 12px rgba(19,109,74,0.20)',
              }}
            >
              {paying ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CreditCard size={14} strokeWidth={1.9} />
              )}
              {paying
                ? t('projects.milestones.pay.starting')
                : t('projects.milestones.pay.cta', {
                    amount: money(step.amount_num, lang, t),
                  })}
            </button>
          </div>
        )}

        {isProvider && !step.paid_at && (
          <div
            className="flex items-center gap-1.5 mt-3"
            style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
          >
            <Clock size={13} strokeWidth={1.9} />
            {t('projects.milestones.pay.awaitingPayment')}
          </div>
        )}

        {isProvider && step.paid_at && (
          <div
            className="flex items-center gap-1.5 mt-3"
            style={{ fontSize: 12.5, color: step.status === 'approved' ? BRAND_DARK : AMBER }}
          >
            <Wallet size={13} strokeWidth={1.9} />
            {step.status === 'approved'
              ? t('projects.milestones.pay.released')
              : t('projects.milestones.pay.heldInEscrow')}
          </div>
        )}

        {isProvider && step.status === 'pending' && (
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={submit}
              disabled={acting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] text-white font-semibold transition-all"
              style={{
                fontSize: 13,
                background: BRAND,
                border: `1px solid ${BRAND}`,
                cursor: acting ? 'wait' : 'pointer',
                opacity: acting ? 0.7 : 1,
              }}
            >
              <Send size={14} strokeWidth={1.8} />
              {t('projects.milestones.step.submit')}
            </button>
          </div>
        )}

        {isProvider && step.status === 'submitted' && (
          <div
            className="flex items-center gap-1.5 mt-3"
            style={{ fontSize: 12.5, color: AMBER }}
          >
            <Clock size={13} strokeWidth={1.9} />
            {t('projects.milestones.step.awaitingReview')}
          </div>
        )}

        {isOwner && step.status === 'submitted' && !reviewing && (
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={() => setReviewing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] font-semibold transition-all"
              style={{
                fontSize: 13,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-ink)',
                cursor: 'pointer',
              }}
            >
              <ClipboardCheck size={14} strokeWidth={1.8} />
              {t('projects.milestones.step.review')}
            </button>
          </div>
        )}

        {isOwner && step.status === 'submitted' && reviewing && (
          <div
            className="mt-3 p-3 rounded-[11px]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            <label
              className="block font-semibold mb-1.5"
              style={{ fontSize: 12, color: 'var(--text-ink-soft)' }}
            >
              {t('projects.milestones.review.noteLabel')}
            </label>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (noteError) setNoteError('');
              }}
              rows={3}
              maxLength={2000}
              placeholder={t('projects.milestones.review.notePlaceholder')}
              className="w-full"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
            {noteError && (
              <div style={{ fontSize: 12, color: DANGER, marginTop: 5 }}>{noteError}</div>
            )}
            <div className="flex items-center justify-end gap-2 mt-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setReviewing(false);
                  setNote('');
                  setNoteError('');
                }}
                disabled={acting}
                className="px-3 py-2 rounded-[9px] font-semibold transition-colors"
                style={{
                  fontSize: 12.5,
                  background: 'transparent',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-muted)',
                  cursor: acting ? 'wait' : 'pointer',
                }}
              >
                {t('projects.milestones.review.cancel')}
              </button>
              <button
                type="button"
                onClick={() => review('not_pleased')}
                disabled={acting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] font-semibold transition-colors"
                style={{
                  fontSize: 12.5,
                  background: 'var(--bg-surface)',
                  border: '1px solid rgba(185,28,28,0.3)',
                  color: DANGER,
                  cursor: acting ? 'wait' : 'pointer',
                  opacity: acting ? 0.6 : 1,
                }}
              >
                <XCircle size={13} strokeWidth={1.8} />
                {t('projects.milestones.review.notPleased')}
              </button>
              <button
                type="button"
                onClick={() => review('pleased')}
                disabled={acting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-white font-semibold transition-colors"
                style={{
                  fontSize: 12.5,
                  background: BRAND,
                  border: `1px solid ${BRAND}`,
                  cursor: acting ? 'wait' : 'pointer',
                  opacity: acting ? 0.7 : 1,
                }}
              >
                <CheckCircle2 size={13} strokeWidth={1.8} />
                {t('projects.milestones.review.pleased')}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

/* ============================================================
 *  Payment outcome banner — reflects what the server already did.
 *  By the time we render this the money has (or hasn't) moved; this
 *  is a report, not a step in the flow.
 * ============================================================ */
function PaymentOutcomeBanner({ outcome, onDismiss }) {
  const { t } = useTranslation();
  if (!outcome) return null;

  const ok = outcome.ok;
  return (
    <div
      className="flex items-start gap-2 px-4 py-3 rounded-[12px] mb-5"
      style={{
        background: ok ? 'rgba(19,109,74,0.07)' : 'rgba(185,28,28,0.06)',
        border: `1px solid ${ok ? 'rgba(19,109,74,0.22)' : 'rgba(185,28,28,0.20)'}`,
        color: ok ? BRAND_DARK : DANGER,
      }}
    >
      {ok ? (
        <CheckCircle2 size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
      ) : (
        <AlertCircle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
      )}
      <div className="flex-1 min-w-0" style={{ fontSize: 13, lineHeight: 1.65 }}>
        <span className="font-semibold">
          {ok
            ? t('projects.milestones.pay.successTitle')
            : t('projects.milestones.pay.cancelledTitle')}
        </span>
        <span>
          {' '}
          {ok
            ? t('projects.milestones.pay.successBody')
            : t('projects.milestones.pay.cancelledBody')}
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('admin.common.close')}
        className="flex-shrink-0 bg-transparent border-0 p-0 cursor-pointer"
        style={{ color: 'inherit', opacity: 0.7 }}
      >
        <XCircle size={15} strokeWidth={1.9} />
      </button>
    </div>
  );
}

/* ============================================================
 *  Page header — title + progress bar (approved-weighted).
 * ============================================================ */
function PageHeader({ project, isOwner, isProvider }) {
  const { t } = useTranslation();
  const progress = Math.round(project.progress || 0);
  const roleKey = isOwner ? 'owner' : isProvider ? 'provider' : null;

  return (
    <div className="mb-6 animate-fade-up">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <StatusBadge status={project.status} />
            {roleKey && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full font-semibold"
                style={{
                  fontSize: 11.5,
                  padding: '4px 10px',
                  background: 'rgba(44,47,124,0.07)',
                  color: 'var(--text-brand)',
                  border: '1px solid rgba(44,47,124,0.16)',
                }}
              >
                {t(`projects.milestones.role.${roleKey}`)}
              </span>
            )}
          </div>
          <h1
            className="font-display m-0"
            style={{
              fontSize: 'clamp(22px, 3vw, 30px)',
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
              color: 'var(--text-ink)',
            }}
          >
            {t('projects.milestones.heading')}
          </h1>
          <p className="m-0 mt-1" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {project.name}
          </p>
        </div>
      </div>

      <div
        className="p-5 rounded-[14px]"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="font-semibold uppercase"
            style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--text-muted)' }}
          >
            {t('projects.milestones.progressLabel')}
          </span>
          <span className="font-bold" style={{ fontSize: 14, color: BRAND }}>
            {progress}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 8,
            borderRadius: 4,
            background: 'var(--border-soft)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: progress >= 100 ? BRAND : 'linear-gradient(90deg, #2c2f7c, #136d4a)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 *  Small building blocks
 * ============================================================ */
function Panel({ title, subtitle, icon: Icon, action, children }) {
  return (
    <section
      className="rounded-[14px] animate-fade-up"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
    >
      <div
        className="px-6 py-4 flex items-center justify-between gap-3"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon size={16} strokeWidth={1.7} style={{ color: 'var(--text-muted)' }} />}
          <div className="min-w-0">
            <h2
              className="font-display m-0"
              style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-ink)' }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="m-0 mt-0.5" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function StepStatusBadge({ status }) {
  const { t } = useTranslation();
  const cfg = STEP_STATUS[status] || STEP_STATUS.pending;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap"
      style={{
        fontSize: 11,
        padding: '4px 10px',
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <Icon size={12} strokeWidth={2} />
      {t(`projects.milestones.status.${status}`)}
    </span>
  );
}

function InlineError({ children }) {
  return (
    <div
      className="p-3 rounded-[10px] mb-3"
      style={{
        background: 'rgba(185,28,28,0.06)',
        border: '1px solid rgba(185,28,28,0.18)',
        color: 'var(--accent-danger)',
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

function EmptyPlan({ isProvider }) {
  const { t } = useTranslation();
  return (
    <div
      className="p-8 rounded-[12px] text-center"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px dashed var(--border-default)',
      }}
    >
      <Milestone
        size={28}
        strokeWidth={1.5}
        style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }}
      />
      <p className="m-0" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
        {isProvider
          ? t('projects.milestones.plan.emptyProvider')
          : t('projects.milestones.plan.emptyOwner')}
      </p>
    </div>
  );
}

function NotAwardedState() {
  const { t } = useTranslation();
  return (
    <Panel title={t('projects.milestones.plan.title')} icon={Milestone}>
      <div
        className="p-8 rounded-[12px] text-center"
        style={{ background: 'var(--bg-canvas)', border: '1px dashed var(--border-default)' }}
      >
        <Hourglass
          size={28}
          strokeWidth={1.5}
          style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }}
        />
        <p
          className="m-0"
          style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}
        >
          {t('projects.milestones.notAwarded')}
        </p>
      </div>
    </Panel>
  );
}

function NoAccessState({ onBack }) {
  const { t } = useTranslation();
  return (
    <Panel title={t('projects.milestones.plan.title')} icon={Lock}>
      <div
        className="p-8 rounded-[12px] text-center"
        style={{ background: 'var(--bg-canvas)', border: '1px dashed var(--border-default)' }}
      >
        <Lock size={26} strokeWidth={1.6} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
        <p
          className="m-0 mb-4"
          style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}
        >
          {t('projects.milestones.noAccess')}
        </p>
        <button onClick={onBack} className="btn-primary" style={{ width: 'auto' }}>
          {t('projects.milestones.backToProject')}
        </button>
      </div>
    </Panel>
  );
}

/* ============================================================
 *  Shell (mirrors ProjectDetailsPage chrome)
 * ============================================================ */
function Shell({ children }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-canvas)' }}>
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div className="max-w-[1180px] mx-auto px-6 lg:px-10 h-[96px] flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="bg-transparent border-0 p-0 cursor-pointer"
            aria-label={t('nav.backHome')}
          >
            <Logo height={68} />
          </button>
          <div className="flex items-center gap-2">
            <LanguageThemeSwitcher compact />
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] font-semibold transition-all"
              style={{
                fontSize: 13,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
                cursor: 'pointer',
              }}
            >
              <LayoutDashboard size={15} strokeWidth={1.8} />
              {t('projects.details.dashboard')}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center gap-2 mb-6 flex-wrap" style={{ fontSize: 13 }}>
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {it.to && !isLast ? (
              <Link to={it.to} className="link" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
                {it.label}
              </Link>
            ) : (
              <span
                className="font-medium truncate"
                style={{ color: isLast ? 'var(--text-ink)' : 'var(--text-muted)', maxWidth: 280 }}
              >
                {it.label}
              </span>
            )}
            {!isLast && (
              <ArrowRight
                size={12}
                strokeWidth={1.7}
                className="flex-shrink-0"
                style={{ transform: 'rotate(180deg)', color: 'var(--text-muted)' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function LoadingState() {
  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 animate-pulse max-w-[1180px] mx-auto">
      <div style={{ height: 14, width: 260, background: 'var(--border-soft)', borderRadius: 6, marginBottom: 24 }} />
      <div style={{ height: 28, width: '55%', maxWidth: 480, background: 'var(--border-soft)', borderRadius: 8, marginBottom: 24 }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ height: 92, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 14 }} />
        ))}
      </div>
      <div style={{ height: 320, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 14 }} />
    </div>
  );
}

function ErrorView({ message, onBack }) {
  const { t } = useTranslation();
  return (
    <div className="max-w-md mx-auto py-20 px-6 text-center">
      <div
        className="mx-auto mb-5 flex items-center justify-center"
        style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(185,28,28,0.08)', color: DANGER }}
      >
        <AlertCircle size={28} strokeWidth={1.7} />
      </div>
      <h2 className="font-display m-0 mb-2" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-ink)' }}>
        {t('projects.milestones.loadError')}
      </h2>
      <p className="m-0 mb-7" style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)' }}>
        {message || t('projects.details.loadErrorFallback')}
      </p>
      <button onClick={onBack} className="btn-primary" style={{ width: 'auto' }}>
        {t('projects.details.back')}
      </button>
    </div>
  );
}

/* ============================================================
 *  Constants + helpers
 * ============================================================ */
const STEP_STATUS = {
  // Proposals render through ProposalCard, not StepCard — this entry exists so
  // a `proposed` step that somehow reaches a generic badge still reads right.
  proposed: {
    icon: PlusCircle,
    color: INDIGO,
    bg: 'rgba(44,47,124,0.08)',
    softBg: 'rgba(44,47,124,0.1)',
    border: 'rgba(44,47,124,0.22)',
  },
  pending: {
    icon: Clock,
    color: '#7a7a8c',
    bg: '#f4f1e9',
    softBg: 'rgba(122,122,140,0.1)',
    border: '#e5e3dc',
  },
  submitted: {
    icon: Hourglass,
    color: AMBER,
    bg: 'rgba(184,134,42,0.12)',
    softBg: 'rgba(184,134,42,0.14)',
    border: 'rgba(184,134,42,0.28)',
  },
  approved: {
    icon: CheckCircle2,
    color: BRAND_DARK,
    bg: 'rgba(19,109,74,0.1)',
    softBg: 'rgba(19,109,74,0.12)',
    border: 'rgba(19,109,74,0.28)',
  },
};

const inputStyle = {
  padding: '9px 12px',
  borderRadius: 9,
  border: '1px solid var(--border-default)',
  background: 'var(--bg-surface)',
  color: 'var(--text-ink)',
  fontSize: 13.5,
  outline: 'none',
};

function parseAmount(v) {
  const n = typeof v === 'string' ? Number.parseFloat(v) : v;
  return Number.isNaN(n) ? 0 : n;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function localeFor(lang) {
  if (lang === 'en') return 'en-US';
  if (lang === 'zh') return 'zh-CN';
  if (lang === 'ur') return 'ur-PK';
  return 'ar-SA';
}

function formatNumber(n, lang) {
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return String(n);
  return new Intl.NumberFormat(localeFor(lang), { maximumFractionDigits: 2 }).format(num);
}

function money(n, lang, t) {
  return `${formatNumber(n, lang)} ${t('common.currency')}`;
}
