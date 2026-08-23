import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Handshake, ChevronLeft } from 'lucide-react';
import { brokers } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import { formatDate } from '../../utils/date';
import {
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_STATUS_TONE,
  PARTY_ROLE,
} from '../../config/brokerConstants';
import {
  PageHeader,
  Card,
  Badge,
  EmptyState,
  FilterBar,
  FilterSelect,
  Pagination,
} from '../../components/admin/AdminUI';

/* ============================================================
 *  OpportunitiesPage — /broker/opportunities
 *  ----------------------------------------------------------------
 *  The broker's own opportunities. Reached only through
 *  RequireBroker, so the account here is always an active broker.
 *
 *  Rows link into the detail page, which is where every action
 *  (edit, parties, submit, cancel) lives — the list stays read-only
 *  so a mis-tap can't submit an opportunity for review.
 * ============================================================ */
export default function OpportunitiesPage() {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    brokers.opportunities
      .list({ status: status || undefined, page, per_page: 15 })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data);
        setMeta(res.meta);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || t('broker.opportunities.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, page, t]);

  const statusOptions = [
    { value: '', label: t('broker.opportunities.filters.allStatuses') },
    ...OPPORTUNITY_STATUSES.map((s) => ({
      value: s,
      label: t(`broker.opportunityStatus.${s}`),
    })),
  ];

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px] flex flex-col gap-5">
      <PageHeader
        eyebrow={t('broker.nav.opportunities')}
        title={t('broker.opportunities.title')}
        subtitle={t('broker.opportunities.subtitle')}
        actions={
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            onClick={() => navigate('/broker/opportunities/new')}
            style={{ fontSize: 13.5 }}
          >
            <Plus size={16} strokeWidth={2} />
            {t('broker.opportunities.create')}
          </button>
        }
      />

      <FilterBar>
        <FilterSelect
          label={t('broker.opportunities.filters.status')}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={statusOptions}
        />
      </FilterBar>

      {error && (
        <Card>
          <p className="m-0" style={{ fontSize: 13.5, color: 'var(--accent-danger)' }}>
            {error}
          </p>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="shimmer"
              style={{ height: 78, width: '100%', borderRadius: 12 }}
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            title={t('broker.opportunities.empty.title')}
            description={t('broker.opportunities.empty.description')}
            action={
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-2"
                onClick={() => navigate('/broker/opportunities/new')}
                style={{ fontSize: 13.5 }}
              >
                <Plus size={16} strokeWidth={2} />
                {t('broker.opportunities.create')}
              </button>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((o) => (
            <OpportunityRow key={o.id} opportunity={o} t={t} lang={lang} />
          ))}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <Pagination meta={meta} onPage={setPage} t={t} />
      )}
    </div>
  );
}

function OpportunityRow({ opportunity, t, lang }) {
  const navigate = useNavigate();
  const owner = (opportunity.parties || []).find(
    (p) => p.role === PARTY_ROLE.OWNER
  );
  const tone = OPPORTUNITY_STATUS_TONE[opportunity.status] || 'default';

  return (
    <Card padded={false}>
      <button
        type="button"
        onClick={() => navigate(`/broker/opportunities/${opportunity.id}`)}
        className="w-full text-start flex items-center gap-4 px-5 py-4"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: 'rgba(44,47,124,0.07)',
            color: 'var(--accent-primary)',
          }}
        >
          <Handshake size={18} strokeWidth={1.7} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-semibold truncate"
              style={{ fontSize: 14.5, color: 'var(--text-ink)' }}
            >
              {opportunity.title}
            </span>
            <Badge tone={tone}>
              {t(`broker.opportunityStatus.${opportunity.status}`)}
            </Badge>
          </div>
          <div
            style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}
          >
            <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
              {opportunity.reference}
            </span>
            {owner?.name ? ` · ${owner.name}` : ''}
          </div>
          {opportunity.held_until && (
            <div style={{ fontSize: 12, color: '#136d4a', marginTop: 3 }}>
              {t('broker.opportunities.heldUntil', {
                date: formatDate(opportunity.held_until, lang),
              })}
            </div>
          )}
        </div>

        <ChevronLeft
          size={18}
          strokeWidth={1.8}
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            // The chevron points "forward" — which is left in RTL and
            // right in LTR, so flip it when the document is LTR.
            transform: lang === 'ar' || lang === 'ur' ? 'none' : 'rotate(180deg)',
          }}
        />
      </button>
    </Card>
  );
}

