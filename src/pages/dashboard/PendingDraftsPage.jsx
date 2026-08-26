import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileEdit, ChevronLeft, Handshake } from 'lucide-react';
import { brokers } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import { formatDate } from '../../utils/date';
import {
  PageHeader,
  Card,
  EmptyState,
  Pagination,
} from '../../components/admin/AdminUI';

/* ============================================================
 *  PendingDraftsPage — /dashboard/drafts
 *  ----------------------------------------------------------------
 *  The owner's side of the broker draft flow: projects a broker
 *  prepared and handed over. Nothing here is binding — the owner may
 *  rewrite every field before publishing, or simply ignore the draft
 *  and post their own project (the broker's attribution follows them
 *  either way, via auto-link).
 *
 *  Only handed-off drafts appear; one the broker is still preparing
 *  isn't visible to the owner at all.
 * ============================================================ */
export default function PendingDraftsPage() {
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
    brokers.ownerDrafts
      .pending({ page, per_page: 15 })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data);
        setMeta(res.meta);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || t('broker.owner.drafts.loadError'));
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
        eyebrow={t('broker.owner.drafts.nav')}
        title={t('broker.owner.drafts.title')}
        subtitle={t('broker.owner.drafts.subtitle')}
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
              style={{ height: 78, width: '100%', borderRadius: 12 }}
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            title={t('broker.owner.drafts.empty.title')}
            description={t('broker.owner.drafts.empty.description')}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((d) => (
            <Row
              key={d.id}
              draft={d}
              t={t}
              lang={lang}
              onOpen={() => navigate(`/dashboard/drafts/${d.id}`)}
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

function Row({ draft, t, lang, onOpen }) {
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
            background: 'rgba(19,109,74,0.08)',
            color: '#136d4a',
          }}
        >
          <FileEdit size={18} strokeWidth={1.7} />
        </div>

        <div className="min-w-0 flex-1">
          <span
            className="font-semibold truncate block"
            style={{ fontSize: 14.5, color: 'var(--text-ink)' }}
          >
            {draft.name}
          </span>
          {draft.broker?.name && (
            <span
              className="inline-flex items-center gap-1.5"
              style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}
            >
              <Handshake size={12} strokeWidth={1.8} />
              {draft.broker.name}
              {draft.broker_fee_percent != null &&
                ` · ${t('broker.fee.percent', { value: draft.broker_fee_percent })}`}
            </span>
          )}
          {draft.draft_ready_for_owner_at && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              {formatDate(draft.draft_ready_for_owner_at, lang)}
            </div>
          )}
        </div>

        <ChevronLeft
          size={18}
          strokeWidth={1.8}
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            transform: lang === 'ar' || lang === 'ur' ? 'none' : 'rotate(180deg)',
          }}
        />
      </button>
    </Card>
  );
}
