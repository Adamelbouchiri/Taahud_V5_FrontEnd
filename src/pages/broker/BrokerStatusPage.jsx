import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ShieldAlert, XCircle, ArrowLeft } from 'lucide-react';
import { auth } from '../../services';
import { BROKER_STATUS } from '../../config/brokerConstants';
import { useTranslation } from '../../i18n/LanguageContext';
import Logo from '../../components/Logo';
import LanguageThemeSwitcher from '../../components/LanguageThemeSwitcher';

/* ============================================================
 *  BrokerStatusPage — /broker/status
 *  ----------------------------------------------------------------
 *  Where every non-active broker lands. Covers the three screens
 *  BROKER_SYSTEM_INTEGRATION.md asks for:
 *
 *    pending_review → "under review, we'll notify you"
 *    rejected       → the admin's broker_rejection_reason
 *    suspended      → temporarily blocked, data preserved
 *
 *  An ACTIVE broker who arrives here (e.g. a bookmarked link after
 *  approval) is forwarded straight into the workspace.
 * ============================================================ */
export default function BrokerStatusPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((u) => {
        if (cancelled) return;
        // Approved while they were sitting on this page? Move them on.
        if (u?.broker_status === BROKER_STATUS.ACTIVE) {
          navigate('/broker/opportunities', { replace: true });
          return;
        }
        // Not a broker at all — nothing here applies to them.
        if (u?.account_type !== 'broker') {
          navigate('/dashboard', { replace: true });
          return;
        }
        setUser(u);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-canvas)' }}
      >
        <div
          className="animate-pulse rounded-[12px]"
          style={{ width: 240, height: 14, background: 'var(--border-soft)' }}
        />
      </div>
    );
  }

  const status = user?.broker_status || BROKER_STATUS.PENDING;

  const variants = {
    [BROKER_STATUS.PENDING]: {
      Icon: Clock,
      color: '#b8862a',
      bg: 'rgba(184,134,42,0.10)',
    },
    [BROKER_STATUS.SUSPENDED]: {
      Icon: ShieldAlert,
      color: '#b8862a',
      bg: 'rgba(184,134,42,0.10)',
    },
    [BROKER_STATUS.REJECTED]: {
      Icon: XCircle,
      color: '#b91c1c',
      bg: 'rgba(185,28,28,0.08)',
    },
  };
  const { Icon, color, bg } = variants[status] || variants[BROKER_STATUS.PENDING];

  // Only a rejection carries a reason from the admin.
  const reason =
    status === BROKER_STATUS.REJECTED ? user?.broker_rejection_reason : null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-canvas)' }}
    >
      {/* Matches the standalone-page header used by ApplyPage /
          CreateProjectPage / ProjectDetailsPage: 96px tall with a
          68px wordmark. */}
      <header className="flex items-center justify-between px-6 lg:px-10 h-[96px]">
        <Logo height={68} />
        <LanguageThemeSwitcher />
      </header>

      <main className="flex-1 flex items-start justify-center px-6 pt-8 pb-20">
        <div className="w-full max-w-[540px] animate-fade-up">
          <div
            className="p-7 lg:p-9 rounded-[18px] text-center"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div
              className="mx-auto mb-5 flex items-center justify-center"
              style={{ width: 68, height: 68, borderRadius: '50%', background: bg, color }}
            >
              <Icon size={28} strokeWidth={1.7} />
            </div>

            <h1
              className="font-display m-0 mb-3"
              style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-ink)' }}
            >
              {t(`broker.status.${status}.title`)}
            </h1>

            <p
              className="m-0"
              style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-ink-soft)' }}
            >
              {t(`broker.status.${status}.body`)}
            </p>

            {reason && (
              <div
                className="mt-5 p-4 rounded-[12px] text-start"
                style={{
                  background: 'rgba(185,28,28,0.05)',
                  border: '1px solid rgba(185,28,28,0.16)',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--accent-danger)',
                    marginBottom: 4,
                  }}
                >
                  {t('broker.status.reasonLabel')}
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-ink)' }}>
                  {reason}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-ghost mt-6 inline-flex items-center gap-2"
              style={{ fontSize: 13.5 }}
            >
              <ArrowLeft size={15} strokeWidth={1.8} />
              {t('broker.status.backToDashboard')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
