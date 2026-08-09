import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  Banknote,
  Smartphone,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Landmark,
  Loader2,
  RefreshCw,
  Hourglass,
  Info,
} from 'lucide-react';
import { wallet as walletApi } from '../../services';
import {
  IBAN_PATTERN,
  STC_MOBILE_PATTERN,
  MIN_WITHDRAWAL_HALALAS,
} from '../../services/wallet';
import { useTranslation } from '../../i18n/LanguageContext';
import { toHalalas, fromHalalas, formatHalalas, formatSar } from '../../utils/money';

/* ============================================================
 *  WalletPage — /dashboard/wallet
 *  ----------------------------------------------------------------
 *  The PROVIDER side of the escrow flow (WALLET_PAYMENTS_FRONTEND.md).
 *  Money arrives when a project owner pays for a step; it sits HELD
 *  until the owner approves that step, then becomes withdrawable.
 *  This page is where the provider cashes out and tracks the request.
 *
 *  Requesting a withdrawal DEBITS the wallet immediately (status
 *  `pending`) — the money is gone from the balance before an admin
 *  has looked at it. A rejection credits it back.
 *
 *  MONEY UNIT: the API speaks integer HALALAS. The form speaks SAR,
 *  because nobody types 1500000 for fifteen thousand riyals. The
 *  conversion happens once, on submit (utils/money.js).
 *
 *  BALANCE CAVEAT: the backend has no wallet-balance endpoint yet, so
 *  we cannot show "available" or pre-empt an over-draw. wallet.balance()
 *  probes for one and returns null until it ships; the tiles and the
 *  client-side max check light up automatically when it does. Until
 *  then the server's 422 is the only authority, and we surface it
 *  verbatim instead of guessing.
 * ============================================================ */

const BRAND = '#136d4a';
const BRAND_DARK = '#0d5538';
const AMBER = '#b8862a';
const DANGER = '#b91c1c';

const STATUS_STYLE = {
  pending: { icon: Hourglass, color: AMBER, bg: 'rgba(184,134,42,0.12)', border: 'rgba(184,134,42,0.28)' },
  approved: { icon: CheckCircle2, color: BRAND_DARK, bg: 'rgba(19,109,74,0.10)', border: 'rgba(19,109,74,0.28)' },
  paid: { icon: CheckCircle2, color: BRAND_DARK, bg: 'rgba(19,109,74,0.14)', border: 'rgba(19,109,74,0.34)' },
  rejected: { icon: XCircle, color: DANGER, bg: 'rgba(185,28,28,0.08)', border: 'rgba(185,28,28,0.22)' },
};

export default function WalletPage() {
  const { t, lang } = useTranslation();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // The balance probe must not take the list down with it — it's
      // an endpoint that doesn't exist yet.
      const [list, bal] = await Promise.all([
        walletApi.withdrawals({ page }),
        walletApi.balance().catch(() => null),
      ]);
      setRows(list.data);
      setMeta(list.meta);
      setBalance(bal);
    } catch (err) {
      setError(err.message || t('wallet.loadError'));
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [page, t]);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 5000);
  };

  /* Money we've asked for but that hasn't been settled yet. This one
     IS derivable from the list, so we show it even without a balance
     endpoint — it's the figure a provider actually chases. */
  const pendingTotal = useMemo(
    () => rows.filter((r) => r.status === 'pending').reduce((sum, r) => sum + (r.amount || 0), 0),
    [rows]
  );
  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px]">
      <Header t={t} onRefresh={load} loading={loading} />

      {toast && (
        <div
          className="flex items-start gap-2 mb-5 px-4 py-3 rounded-[12px]"
          style={{
            background: 'rgba(19,109,74,0.08)',
            border: '1px solid rgba(19,109,74,0.22)',
            color: BRAND_DARK,
            fontSize: 13,
            lineHeight: 1.65,
          }}
        >
          <CheckCircle2 size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{toast}</span>
        </div>
      )}

      {error && (
        <div
          className="flex items-start gap-2 mb-5 px-4 py-3 rounded-[12px]"
          style={{
            background: 'rgba(185,28,28,0.06)',
            border: '1px solid rgba(185,28,28,0.20)',
            color: DANGER,
            fontSize: 13,
            lineHeight: 1.65,
          }}
        >
          <AlertCircle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <BalanceStrip balance={balance} pendingTotal={pendingTotal} lang={lang} t={t} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5 mt-5 items-start">
        <HistoryPanel
          rows={rows}
          meta={meta}
          loading={loading}
          page={page}
          onPage={setPage}
          lang={lang}
          t={t}
        />
        <WithdrawPanel
          available={balance?.available}
          frozen={balance?.is_frozen}
          lang={lang}
          t={t}
          onDone={async (created) => {
            showToast(
              t('wallet.form.success', { amount: formatHalalas(created.amount, lang, t) })
            );
            // Go back to page 1 — the new row is newest-first. If we're
            // already there, load() still refreshes in place.
            if (page !== 1) setPage(1);
            else await load();
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================
 *  Header
 * ============================================================ */
function Header({ t, onRefresh, loading }) {
  return (
    <div className="mb-6 animate-fade-up flex items-end justify-between gap-4 flex-wrap">
      <div>
        <div
          className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(19,109,74,0.09)',
            color: BRAND_DARK,
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          <Wallet size={12} />
          {t('wallet.eyebrow')}
        </div>
        <h1
          className="font-display m-0 mb-2"
          style={{
            fontSize: 'clamp(24px, 3vw, 32px)',
            fontWeight: 700,
            lineHeight: 1.2,
            color: 'var(--text-ink)',
          }}
        >
          {t('wallet.title')}
        </h1>
        <p
          className="m-0"
          style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)', maxWidth: 620 }}
        >
          {t('wallet.subtitle')}
        </p>
      </div>
      <button
        type="button"
        className="btn-secondary"
        style={{ width: 'auto', padding: '10px 16px' }}
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw size={14} />
        {t('admin.common.refresh')}
      </button>
    </div>
  );
}

/* ============================================================
 *  Balance strip
 *  ----------------------------------------------------------------
 *  `total`, `available` and `held` are authoritative (GET /wallet).
 *  Splitting held out of the total is the point: held money is real —
 *  the owner already paid — but locked until they approve the step,
 *  and conflating the two is what makes providers ask where their
 *  money went.
 *
 *  The fourth tile is derived from the withdrawal list rather than the
 *  balance, because money in an unsettled withdrawal has already left
 *  `available` and would otherwise be invisible.
 * ============================================================ */
function BalanceStrip({ balance, pendingTotal, lang, t }) {
  const hasBalance = !!balance;

  const tiles = [
    {
      icon: Wallet,
      label: t('wallet.balance.total'),
      value: hasBalance ? formatHalalas(balance.total, lang, t) : null,
      sub: t('wallet.balance.totalSub'),
      tone: 'ink',
    },
    {
      icon: CheckCircle2,
      label: t('wallet.balance.available'),
      value: hasBalance ? formatHalalas(balance.available, lang, t) : null,
      sub: t('wallet.balance.availableSub'),
      tone: 'brand',
    },
    {
      icon: Clock,
      label: t('wallet.balance.held'),
      value: hasBalance ? formatHalalas(balance.held, lang, t) : null,
      sub: t('wallet.balance.heldSub'),
      tone: 'ink',
    },
    {
      icon: Hourglass,
      label: t('wallet.balance.pending'),
      value: formatHalalas(pendingTotal, lang, t),
      sub: t('wallet.balance.pendingSub'),
      tone: 'amber',
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-[14px] p-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
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
                fontSize: tile.value ? 18 : 13,
                lineHeight: 1.25,
                color: tile.value
                  ? tile.tone === 'brand'
                    ? BRAND
                    : tile.tone === 'amber'
                      ? AMBER
                      : 'var(--text-ink)'
                  : 'var(--text-muted)',
              }}
            >
              {tile.value ?? t('wallet.balance.unavailable')}
            </div>
            {tile.value && tile.sub && (
              <div className="mt-0.5" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                {tile.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {!hasBalance && (
        <div
          className="flex items-start gap-2 mt-3 px-4 py-3 rounded-[12px]"
          style={{
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-default)',
            color: 'var(--text-muted)',
            fontSize: 12.5,
            lineHeight: 1.65,
          }}
        >
          <Info size={14} strokeWidth={1.9} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{t('wallet.balance.loadFailed')}</span>
        </div>
      )}

      {balance?.is_frozen && (
        <div
          className="flex items-start gap-2 mt-3 px-4 py-3 rounded-[12px]"
          style={{
            background: 'rgba(185,28,28,0.06)',
            border: '1px solid rgba(185,28,28,0.20)',
            color: DANGER,
            fontSize: 12.5,
            lineHeight: 1.65,
          }}
        >
          <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{t('wallet.balance.frozen')}</span>
        </div>
      )}
    </>
  );
}

/* ============================================================
 *  Withdraw form
 *  ----------------------------------------------------------------
 *  Mirrors the BE's validation so the provider isn't bounced by a
 *  422 for something we could have caught: min 1 SAR, amount capped
 *  at the available balance, IBAN = SA + 22 digits, mobile = +9665 +
 *  8 digits, and the method decides which fields are required.
 *
 *  The whole form is disabled when the wallet is frozen or nothing is
 *  available — with the reason stated, since a dead submit button with
 *  no explanation is worse than the 422 it prevents.
 * ============================================================ */
function WithdrawPanel({ available, frozen, lang, t, onDone }) {
  const [method, setMethod] = useState('bank_transfer');
  const [amount, setAmount] = useState('');
  const [iban, setIban] = useState('');
  const [holder, setHolder] = useState('');
  const [mobile, setMobile] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const amountHalalas = toHalalas(amount);
  const knowsBalance = available != null;
  const nothingAvailable = knowsBalance && available < MIN_WITHDRAWAL_HALALAS;
  // Frozen wins over empty — it's the more actionable message.
  const blockedReason = frozen
    ? t('wallet.form.blocked.frozen')
    : nothingAvailable
      ? t('wallet.form.blocked.empty')
      : '';
  const blocked = !!blockedReason;

  const validate = () => {
    const errs = {};
    if (!amount || amountHalalas < MIN_WITHDRAWAL_HALALAS) {
      errs.amount = t('wallet.form.errors.minAmount', {
        min: formatSar(fromHalalas(MIN_WITHDRAWAL_HALALAS), lang, t),
      });
    } else if (knowsBalance && amountHalalas > available) {
      errs.amount = t('wallet.form.errors.overBalance', {
        available: formatHalalas(available, lang, t),
      });
    }

    if (method === 'bank_transfer') {
      // Strip spaces before testing — IBANs are commonly written in
      // groups of four and the BE regex has no tolerance for that.
      const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
      if (!IBAN_PATTERN.test(cleanIban)) errs.iban = t('wallet.form.errors.iban');
      if (!holder.trim()) errs.holder = t('wallet.form.errors.holder');
    } else if (!STC_MOBILE_PATTERN.test(mobile.replace(/\s+/g, ''))) {
      errs.mobile = t('wallet.form.errors.mobile');
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const created = await walletApi.requestWithdrawal({
        amount: amountHalalas,
        payout_method: method,
        iban: iban.replace(/\s+/g, '').toUpperCase(),
        holder_name: holder.trim(),
        mobile: mobile.replace(/\s+/g, ''),
      });
      setAmount('');
      setIban('');
      setHolder('');
      setMobile('');
      setFieldErrors({});
      await onDone(created);
    } catch (err) {
      // The BE's message is user-facing Arabic — show it as-is rather
      // than replacing it with a generic string.
      setError(err.message || t('wallet.form.errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="rounded-[14px] animate-fade-up"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
    >
      <div
        className="px-5 py-4 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        <ArrowUpRight size={16} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
        <div>
          <h2
            className="font-display m-0"
            style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-ink)' }}
          >
            {t('wallet.form.title')}
          </h2>
          <p className="m-0 mt-0.5" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {t('wallet.form.subtitle')}
          </p>
        </div>
      </div>

      <form className="px-5 py-5" onSubmit={submit}>
        {blocked && (
          <div
            className="flex items-start gap-2 p-3 rounded-[10px] mb-4"
            style={{
              background: frozen ? 'rgba(185,28,28,0.06)' : 'var(--bg-canvas)',
              border: `1px solid ${frozen ? 'rgba(185,28,28,0.18)' : 'var(--border-default)'}`,
              color: frozen ? DANGER : 'var(--text-muted)',
              fontSize: 12.5,
              lineHeight: 1.6,
            }}
          >
            {frozen ? (
              <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
            ) : (
              <Info size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
            )}
            <span>{blockedReason}</span>
          </div>
        )}

        {error && (
          <div
            className="flex items-start gap-2 p-3 rounded-[10px] mb-4"
            style={{
              background: 'rgba(185,28,28,0.06)',
              border: '1px solid rgba(185,28,28,0.18)',
              color: DANGER,
              fontSize: 12.5,
              lineHeight: 1.6,
            }}
          >
            <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Amount — typed in SAR, sent in halalas. */}
        <Field label={t('wallet.form.amount')} error={fieldErrors.amount}>
          <div className="relative">
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full"
              style={{ ...inputStyle, paddingInlineEnd: 48 }}
            />
            <span
              className="absolute top-1/2 -translate-y-1/2"
              style={{
                insetInlineEnd: 12,
                fontSize: 11.5,
                fontWeight: 600,
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            >
              {t('common.currency')}
            </span>
          </div>
          {knowsBalance && (
            <button
              type="button"
              onClick={() => setAmount(String(fromHalalas(available)))}
              className="mt-1.5 bg-transparent border-0 p-0 cursor-pointer"
              style={{ fontSize: 11.5, fontWeight: 600, color: BRAND, fontFamily: 'inherit' }}
            >
              {t('wallet.form.useMax', { amount: formatHalalas(available, lang, t) })}
            </button>
          )}
        </Field>

        {/* Payout method */}
        <div className="mb-4">
          <label
            className="block font-semibold mb-1.5"
            style={{ fontSize: 12, color: 'var(--text-ink-soft)' }}
          >
            {t('wallet.form.method')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <MethodTile
              active={method === 'bank_transfer'}
              icon={Banknote}
              label={t('wallet.methods.bank_transfer')}
              onClick={() => setMethod('bank_transfer')}
            />
            <MethodTile
              active={method === 'stc_pay'}
              icon={Smartphone}
              label={t('wallet.methods.stc_pay')}
              onClick={() => setMethod('stc_pay')}
            />
          </div>
        </div>

        {method === 'bank_transfer' ? (
          <>
            <Field label={t('wallet.form.iban')} error={fieldErrors.iban}>
              <input
                type="text"
                dir="ltr"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="SA0000000000000000000000"
                className="w-full"
                style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.02em' }}
              />
            </Field>
            <Field label={t('wallet.form.holder')} error={fieldErrors.holder}>
              <input
                type="text"
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                maxLength={255}
                placeholder={t('wallet.form.holderPlaceholder')}
                className="w-full"
                style={inputStyle}
              />
            </Field>
          </>
        ) : (
          <Field label={t('wallet.form.mobile')} error={fieldErrors.mobile}>
            <input
              type="tel"
              dir="ltr"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="+966512345678"
              className="w-full"
              style={{ ...inputStyle, fontFamily: 'monospace' }}
            />
          </Field>
        )}

        <div
          className="flex items-start gap-2 p-3 rounded-[10px] mb-4"
          style={{
            background: 'rgba(184,134,42,0.07)',
            border: '1px solid rgba(184,134,42,0.20)',
            color: '#8a6620',
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          <Info size={13} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{t('wallet.form.debitNotice')}</span>
        </div>

        <button
          type="submit"
          disabled={saving || blocked}
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-[10px] text-white font-semibold transition-all"
          style={{
            fontSize: 13.5,
            background: saving || blocked ? 'var(--border-strong)' : BRAND,
            border: `1px solid ${saving || blocked ? 'var(--border-strong)' : BRAND}`,
            cursor: saving ? 'wait' : blocked ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <ArrowUpRight size={15} strokeWidth={2} />}
          {saving ? t('wallet.form.submitting') : t('wallet.form.submit')}
        </button>
      </form>
    </section>
  );
}

function MethodTile({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] font-semibold transition-all"
      style={{
        fontSize: 12.5,
        background: active ? 'rgba(19,109,74,0.08)' : 'var(--bg-canvas)',
        border: `1px solid ${active ? 'rgba(19,109,74,0.32)' : 'var(--border-default)'}`,
        color: active ? BRAND_DARK : 'var(--text-ink-soft)',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <Icon size={15} strokeWidth={1.9} />
      {label}
    </button>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="mb-4">
      <label
        className="block font-semibold mb-1.5"
        style={{ fontSize: 12, color: 'var(--text-ink-soft)' }}
      >
        {label}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: 11.5, color: DANGER, marginTop: 5, lineHeight: 1.5 }}>{error}</div>
      )}
    </div>
  );
}

/* ============================================================
 *  Withdrawal history
 * ============================================================ */
function HistoryPanel({ rows, meta, loading, page, onPage, lang, t }) {
  return (
    <section
      className="rounded-[14px] animate-fade-up"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
    >
      <div
        className="px-5 py-4 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        <Landmark size={16} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
        <h2
          className="font-display m-0"
          style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-ink)' }}
        >
          {t('wallet.history.title')}
        </h2>
      </div>

      <div className="px-5 py-5">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="shimmer"
                style={{ height: 78, borderRadius: 12 }}
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div
            className="p-8 rounded-[12px] text-center"
            style={{ background: 'var(--bg-canvas)', border: '1px dashed var(--border-default)' }}
          >
            <Wallet
              size={28}
              strokeWidth={1.5}
              style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }}
            />
            <p className="m-0" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              {t('wallet.history.empty')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <WithdrawalRow key={row.id} row={row} lang={lang} t={t} />
            ))}
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t('admin.common.pageInfo', {
                from: meta.from ?? 0,
                to: meta.to ?? 0,
                total: meta.total ?? 0,
              })}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto', padding: '7px 14px' }}
                disabled={page <= 1}
                onClick={() => onPage(page - 1)}
              >
                {t('admin.common.prev')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto', padding: '7px 14px' }}
                disabled={page >= meta.last_page}
                onClick={() => onPage(page + 1)}
              >
                {t('admin.common.next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function WithdrawalRow({ row, lang, t }) {
  const cfg = STATUS_STYLE[row.status] || STATUS_STYLE.pending;
  const Icon = cfg.icon;
  const details = row.payout_details || {};

  return (
    <article
      className="rounded-[13px] p-4"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-soft)' }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div
            className="font-bold font-display"
            style={{ fontSize: 17, color: 'var(--text-ink)', lineHeight: 1.2 }}
          >
            {formatHalalas(row.amount, lang, t)}
          </div>
          <div
            className="flex items-center gap-1.5 mt-1"
            style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
          >
            {row.payout_method === 'stc_pay' ? (
              <Smartphone size={12.5} strokeWidth={1.8} />
            ) : (
              <Banknote size={12.5} strokeWidth={1.8} />
            )}
            <span>{t(`wallet.methods.${row.payout_method}`)}</span>
            <span aria-hidden>·</span>
            <span dir="ltr" style={{ fontFamily: 'monospace', fontSize: 11.5 }}>
              {details.iban ? maskIban(details.iban) : details.mobile || '—'}
            </span>
          </div>
          {details.holder_name && (
            <div className="mt-0.5" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {details.holder_name}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5">
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
            {t(`wallet.statuses.${row.status}`)}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {formatDateTime(row.created_at, lang)}
          </span>
        </div>
      </div>

      {/* A rejection put the money back — say so, and say why. */}
      {row.status === 'rejected' && (
        <div
          className="mt-3 p-3 rounded-[10px]"
          style={{ background: 'rgba(185,28,28,0.05)', border: '1px solid rgba(185,28,28,0.16)' }}
        >
          <div
            className="font-semibold uppercase mb-1"
            style={{ fontSize: 10, letterSpacing: '0.06em', color: DANGER }}
          >
            {t('wallet.history.rejectionReason')}
          </div>
          <p className="m-0" style={{ fontSize: 12.5, lineHeight: 1.65, color: 'var(--text-ink-soft)' }}>
            {row.rejection_reason || '—'}
          </p>
          <p className="m-0 mt-1.5" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {t('wallet.history.refunded')}
          </p>
        </div>
      )}
    </article>
  );
}

/* ============================================================
 *  Helpers
 * ============================================================ */

/** SA44 2000 0001 2345 6789 1234 → SA44 •••• 1234 */
function maskIban(iban) {
  const clean = String(iban).replace(/\s+/g, '');
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 4)} •••• ${clean.slice(-4)}`;
}

function formatDateTime(iso, lang) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(lang || undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const inputStyle = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--border-default)',
  background: 'var(--bg-canvas)',
  color: 'var(--text-ink)',
  fontSize: 13.5,
  outline: 'none',
  fontFamily: 'inherit',
};
