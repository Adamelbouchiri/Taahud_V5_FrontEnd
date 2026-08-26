import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileEdit, ChevronLeft, Wallet } from 'lucide-react';
import { brokers } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import { formatDate } from '../../utils/date';
import { isDraftWithOwner } from '../../config/brokerConstants';
import {
  PageHeader,
  Card,
  Badge,
  EmptyState,
  Pagination,
} from '../../components/admin/AdminUI';

/* ============================================================
 *  BrokerDraftsPage — /broker/drafts
 *  ----------------------------------------------------------------
 *  Every draft this broker has prepared, in either phase. The only
 *  distinction that matters is who holds it, which the BE expresses
 *  as `draft_ready_for_owner_at`:
 *
 *    null      → still the broker's to edit
 *    not null  → handed off; the owner reviews and publishes
 *
 *  Rows open the draft editor, which is where editing and the
 *  one-way hand-off live — the list stays read-only so a mis-tap
 *  can't hand a half-finished draft to an owner.
 * ============================================================ */
export default function BrokerDraftsPage() {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    brokers.drafts
      .list({ page, per_page: 15 })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data);
        setMeta(res.meta);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || t('broker.drafts.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, t]);

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px] flex flex-col gap-5">
      <PageHeader
        eyebrow={t('broker.drafts.nav')}
        title={t('broker.drafts.title')}
        subtitle={t('broker.drafts.subtitle')}
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
            title={t('broker.drafts.empty.title')}
            description={t('broker.drafts.empty.description')}
            action={
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 13.5 }}
                onClick={() => navigate('/broker/opportunities')}
              >
                {t('broker.nav.opportunities')}
              </button>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((d) => (
            <DraftRow
              key={d.id}
              draft={d}
              t={t}
              lang={lang}
              onOpen={() => navigate(`/broker/drafts/${d.id}`)}
            />
          ))}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <Pagination meta={meta} onPage={setPage} t={t} />
      )}
    </div>
  );
}

function DraftRow({ draft, t, lang, onOpen }) {
  const handedOff = isDraftWithOwner(draft);

  return (
    <Card padded={false}>
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-start flex items-center gap-4 px-5 py-4"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: handedOff ? 'rgba(184,134,42,0.10)' : 'rgba(44,47,124,0.07)',
            color: handedOff ? '#b8862a' : 'var(--accent-primary)',
          }}
        >
          <FileEdit size={18} strokeWidth={1.7} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-semibold truncate"
              style={{ fontSize: 14.5, color: 'var(--text-ink)' }}
            >
              {draft.name}
            </span>
            <Badge tone={handedOff ? 'warning' : 'muted'}>
              {t(
                handedOff
                  ? 'broker.drafts.phase.withOwner'
                  : 'broker.drafts.phase.withBroker'
              )}
            </Badge>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
            {draft.owner?.name ? `${t('broker.drafts.owner')}: ${draft.owner.name}` : ''}
            {draft.city ? ` · ${draft.city}` : ''}
          </div>
          <div
            className="flex items-center gap-3 flex-wrap"
            style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}
          >
            {draft.budget != null && (
              <span className="inline-flex items-center gap-1">
                <Wallet size={11.5} strokeWidth={1.7} />
                {draft.budget}
              </span>
            )}
            {handedOff && (
              <span>
                {t('broker.drafts.handedOffAt')}:{' '}
                {formatDate(draft.draft_ready_for_owner_at, lang)}
              </span>
            )}
          </div>
        </div>

        <ChevronLeft
          size={18}
          strokeWidth={1.8}
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            // Points "forward", which is left in RTL and right in LTR.
            transform: lang === 'ar' || lang === 'ur' ? 'none' : 'rotate(180deg)',
          }}
        />
      </button>
    </Card>
  );
}
