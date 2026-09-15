import React from 'react';
import { UserRound, Lock } from 'lucide-react';
import Ltr from '../Ltr';
import { Badge } from '../admin/AdminUI';

/* ============================================================
 *  ContactsSection — decision-maker contacts.
 *  ----------------------------------------------------------------
 *  In Sprint 1 this ALWAYS renders its locked state: every endpoint
 *  returns `contacts: []` with `contacts_locked: true`. That is not
 *  a bug and not a reason to defer the section.
 *
 *  Names, mobiles and emails are being collected but are held back
 *  until three things land together: admin-only write access with an
 *  audit trail, full masking coverage, and the PDPL legal basis with
 *  its retention and deletion policy. The reveal flow, its quota and
 *  the credits counter arrive with them — which is why there is no
 *  reveal button, no quota display and no counter anywhere here.
 *
 *  The contract is frozen: Sprint 2 changes the VALUES in `contacts`,
 *  never the shape. So the section, its lock badge and its layout all
 *  exist now, and the rows below already render the real shape. Defer
 *  this and it's a rebuild instead of a data change.
 *
 *  The caller decides whether to mount this at all — internal
 *  projects (mirrored in from Taahud's own arena) must never show a
 *  contact section; see showContactSection() in config/rasdConstants.
 * ============================================================ */
export default function ContactsSection({ contacts, locked = true, t, contactRoleLabel }) {
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
              {t('rasd.project.contacts.title')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              {t('rasd.project.contacts.subtitle')}
            </div>
          </div>
        </div>
        {locked && <Badge tone="warning">{t('rasd.project.contacts.soon')}</Badge>}
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
            {t('rasd.project.contacts.lockedBody')}
          </p>
        </div>
      ) : (
        <ul className="m-0 p-0 flex flex-col gap-2">
          {list.map((contact, i) => (
            <li
              key={contact.id ?? i}
              className="list-none flex items-center gap-3"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-soft)',
                borderRadius: 11,
                padding: '11px 14px',
              }}
            >
              <div className="min-w-0 flex-1">
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-ink)' }}>
                  {contact.name || '—'}
                </div>
                {/* Phones and emails read left-to-right inside an RTL
                    column — isolate each so the bidi algorithm can't
                    reorder them against the Arabic around them. */}
                {(contact.phone || contact.email) && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {contact.phone && <Ltr>{contact.phone}</Ltr>}
                    {contact.phone && contact.email ? ' · ' : ''}
                    {contact.email && <Ltr>{contact.email}</Ltr>}
                  </div>
                )}
              </div>
              {contact.contact_role && (
                <Badge tone="default">
                  {contactRoleLabel(contact.contact_role, contact.contact_role_label)}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
