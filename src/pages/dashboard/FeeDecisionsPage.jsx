import React, { useCallback, useEffect, useState } from 'react';
import { Handshake } from 'lucide-react';
import { brokers } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import {
  PageHeader,
  Card,
  EmptyState,
  Pagination,
} from '../../components/admin/AdminUI';
import FeeCard from '../../components/broker/FeeCard';

/* ============================================================
 *  FeeDecisionsPage — /dashboard/fee-decisions
 *  ----------------------------------------------------------------
 *  The owner's side of the fee handshake. A broker who invited this
 *  user proposed a commission rate on the opportunity behind the
 *  invitation; the owner approves it or counters lower — once.
 *
 *  Each row renders the shared FeeCard in `role="owner"`, so the
 *  rules and copy are identical to the broker's view of the same
 *  negotiation. The list only ever contains opportunities where a
 *  decision is actually pending, so a row that resolves drops out on
 *  the reload.
 * ============================================================ */
export default function FeeDecisionsPage() {
  const { t } = useTranslation();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    brokers.opportunities
      .pendingDecisions({ page, per_page: 15 })
      .then((res) => {
        setRows(res.data);
        setMeta(res.meta);
        setError('');
      })
      .catch((err) => setError(err.message || t('broker.owner.fees.loadError')))
      .finally(() => setLoading(false));
  }, [page, t]);

  useEffect(load, [load]);

  /* Returns false so FeeCard keeps the owner's typed counter on a
     failure instead of clearing the form. */
  const decide = async (opportunity, decision, counter) => {
    setBusyId(opportunity.id);
    setActionError((prev) => ({ ...prev, [opportunity.id]: undefined }));
    try {
      await brokers.opportunities.decideFee(opportunity.id, decision, counter);
      load();
      return true;
    } catch (err) {
      setActionError((prev) => ({
        ...prev,
        [opportunity.id]: err.message || t('broker.fee.errors.generic'),
      }));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[900px] flex flex-col gap-5">
      <PageHeader
        eyebrow={t('broker.owner.fees.nav')}
        title={t('broker.owner.fees.title')}
        subtitle={t('broker.owner.fees.subtitle')}
      />

      {error && (
        <Card>
          <p className="m-0" style={{ fontSize: 13.5, color: 'var(--accent-danger)' }}>
            {error}
          </p>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="shimmer"
              style={{ height: 200, width: '100%', borderRadius: 12 }}
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            title={t('broker.owner.fees.empty.title')}
            description={t('broker.owner.fees.empty.description')}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {rows.map((o) => (
            <div key={o.id} className="flex flex-col gap-2">
              <div
                className="flex items-center gap-2 flex-wrap"
                style={{ fontSize: 13.5, color: 'var(--text-ink)' }}
              >
                <span className="font-semibold">{o.title}</span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    fontFamily: 'ui-monospace, Menlo, monospace',
                  }}
                >
                  {o.reference}
                </span>
                {o.broker?.name && (
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
                  >
                    <Handshake size={12} strokeWidth={1.8} />
                    {t('broker.owner.fees.brokerLabel')}: {o.broker.name}
                  </span>
                )}
              </div>
              <FeeCard
                opportunity={o}
                role="owner"
                busy={busyId === o.id}
                error={actionError[o.id]}
                onDecide={(decision, counter) => decide(o, decision, counter)}
              />
            </div>
          ))}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <Pagination meta={meta} onPage={setPage} t={t} />
      )}
    </div>
  );
}
