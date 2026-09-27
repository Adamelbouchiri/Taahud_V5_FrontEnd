import React from 'react';
import { UserRound, Lock, Phone, Mail, Linkedin } from 'lucide-react';
import Ltr from '../Ltr';
import { Badge } from '../admin/AdminUI';
import { RASD_CONFIDENCE_TONE, contactChannel } from '../../config/rasdConstants';

/* ============================================================
 *  ContactsSection — the people at a company (RASD v1.2).
 *  ----------------------------------------------------------------
 *  Contacts belong to COMPANIES, not projects. A company profile
 *  carries them; a project profile always sends `contacts: []` and
 *  `contacts_locked: true`, so there this renders its empty state
 *  pointing the user at the parties' company pages.
 *
 *  Every phone and email is drawn from one rule — contactChannel()
 *  keyed on `has_phone` / `has_email`, never on whether `phone` is
 *  present:
 *
 *    none      «no direct number», no reveal affordance
 *    masked    phone_masked + a reveal button
 *    revealed  the full value
 *
 *  `contacts_locked: false` today is a temporary demo mode. When it
 *  ends, `phone` / `email` return to null on every row and each
 *  channel drops to `masked` on its own — this file doesn't change.
 *  The reveal button is disabled until the reveal-credit endpoint
 *  exists; there's nothing yet for it to call.
 *
 *  Rows with neither channel (about half of them) are still shown:
 *  a name and a title are market information in their own right.
 *
 *  The caller decides whether to mount this at all — internal
 *  projects (mirrored in from Taahud's own arena) must never show a
 *  contact section; see showContactSection() in config/rasdConstants.
 * ============================================================ */
export default function ContactsSection({ contacts, subtitle, emptyBody, t, labels }) {
  const list = Array.isArray(contacts) ? contacts : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(44,47,124,0.08)',
              color: 'var(--accent-primary)',
            }}
          >
            <UserRound size={14} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <div className="font-semibold" style={{ fontSize: 14, color: 'var(--text-ink)' }}>
              {t('rasd.contacts.title')}
            </div>
            {subtitle && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
        {list.length > 0 && (
          <Badge tone="default">{t('rasd.contacts.count', { count: list.length })}</Badge>
        )}
      </div>

      {list.length === 0 ? (
        <div
          className="flex items-center gap-3"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px dashed var(--border-default)',
            borderRadius: 12,
            padding: '18px 16px',
          }}
        >
          <span
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-muted)',
            }}
          >
            <Lock size={16} strokeWidth={1.7} />
          </span>
          <p
            className="m-0"
            style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-muted)' }}
          >
            {emptyBody}
          </p>
        </div>
      ) : (
        <ul className="m-0 p-0 flex flex-col gap-2">
          {list.map((contact, i) => (
            <ContactRow key={contact.id ?? i} contact={contact} t={t} labels={labels} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ContactRow({ contact, t, labels }) {
  return (
    <li
      className="list-none flex items-start gap-3 flex-wrap sm:flex-nowrap"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-soft)',
        borderRadius: 11,
        padding: '12px 14px',
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-ink)' }}>
            {contact.name || '—'}
          </span>
          {contact.linkedin_url && (
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('rasd.contacts.linkedin')}
              title={t('rasd.contacts.linkedin')}
              className="inline-flex items-center"
              style={{ color: 'var(--text-muted)' }}
            >
              <Linkedin size={14} strokeWidth={1.8} />
            </a>
          )}
        </div>
        {contact.role_title && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {contact.role_title}
          </div>
        )}

        <div className="flex flex-col gap-1" style={{ marginTop: 8 }}>
          <Channel
            icon={Phone}
            state={contactChannel(contact, 'phone')}
            masked={contact.phone_masked}
            value={contact.phone}
            href={contact.phone ? `tel:${contact.phone}` : undefined}
            noneLabel={t('rasd.contacts.noPhone')}
            t={t}
          />
          <Channel
            icon={Mail}
            state={contactChannel(contact, 'email')}
            masked={contact.email_masked}
            value={contact.email}
            href={contact.email ? `mailto:${contact.email}` : undefined}
            noneLabel={t('rasd.contacts.noEmail')}
            t={t}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {/* role_category is null wherever the source didn't classify
            the person — shown as «unclassified», the row stays. */}
        {contact.role_category ? (
          <Badge tone="primary">
            {labels.contactRole(contact.role_category, contact.role_category_label)}
          </Badge>
        ) : (
          <Badge tone="muted">{t('rasd.contacts.unclassified')}</Badge>
        )}
        {contact.confidence && (
          <Badge tone={RASD_CONFIDENCE_TONE[contact.confidence] || 'default'}>
            {labels.confidence(contact.confidence, contact.confidence_label)}
          </Badge>
        )}
      </div>
    </li>
  );
}

/* One phone or email line in one of contactChannel()'s three states.
   Values read left-to-right inside an RTL column — each is isolated
   so the bidi algorithm can't reorder it against the Arabic around. */
function Channel({ icon: Icon, state, masked, value, href, noneLabel, t }) {
  const iconEl = (
    <Icon size={13} strokeWidth={1.8} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
  );

  if (state === 'none') {
    return (
      <div
        className="inline-flex items-center gap-1.5"
        style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.8 }}
      >
        {iconEl}
        {noneLabel}
      </div>
    );
  }

  if (state === 'masked') {
    return (
      <div className="inline-flex items-center gap-2 flex-wrap" style={{ fontSize: 12.5 }}>
        {iconEl}
        <span style={{ color: 'var(--text-ink-soft)', letterSpacing: 0.3 }}>
          <Ltr>{masked || '••••'}</Ltr>
        </span>
        <button
          type="button"
          disabled
          title={t('rasd.contacts.revealSoon')}
          className="inline-flex items-center gap-1"
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            fontFamily: 'inherit',
            padding: '2px 9px',
            borderRadius: 999,
            border: '1px solid var(--border-default)',
            background: 'var(--bg-surface)',
            color: 'var(--text-muted)',
            cursor: 'not-allowed',
          }}
        >
          <Lock size={11} strokeWidth={2} />
          {t('rasd.contacts.reveal')}
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5" style={{ fontSize: 12.5 }}>
      {iconEl}
      <a
        href={href}
        style={{ color: 'var(--text-ink)', fontWeight: 600, textDecoration: 'none' }}
      >
        <Ltr>{value}</Ltr>
      </a>
    </div>
  );
}
