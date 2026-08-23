/* ============================================================
 *  BROKER CONSTANTS — statuses for broker accounts and for the
 *  opportunities they register.
 *  ----------------------------------------------------------------
 *  Mirrors BROKER_SYSTEM_INTEGRATION.md. The `value` strings are
 *  the BE enum values — never translate them, only their labels.
 *
 *  The API sends `status_label_ar` / `status_label_en` alongside
 *  every opportunity, but we key off `status` and translate through
 *  our own dictionaries instead: the platform ships four languages
 *  and the BE only sends two.
 * ============================================================ */

/* ---------- Broker account statuses (users.broker_status) ---------- */
export const BROKER_STATUS = {
  PENDING: 'pending_review',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
};

/* Badge tone per status — the tones AdminUI's <Badge> understands. */
export const BROKER_STATUS_TONE = {
  pending_review: 'warning',
  active: 'success',
  suspended: 'warning',
  rejected: 'danger',
};

/* Only an `active` broker may reach the broker workspace. Every
   other status (including a null status on a non-broker) lands on
   the status screen instead. */
export function isActiveBroker(user) {
  return (
    user?.account_type === 'broker' &&
    user?.broker_status === BROKER_STATUS.ACTIVE
  );
}

export function isBroker(user) {
  return user?.account_type === 'broker';
}

/* ---------- Opportunity statuses ---------- */
export const OPPORTUNITY_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending_review',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CONVERTED: 'converted',
  CANCELLED: 'cancelled',
};

export const OPPORTUNITY_STATUS_TONE = {
  draft: 'muted',
  pending_review: 'warning',
  active: 'success',
  rejected: 'danger',
  expired: 'muted',
  converted: 'primary',
  cancelled: 'muted',
};

/* The filter dropdown on both the broker list and the admin queue. */
export const OPPORTUNITY_STATUSES = [
  'draft',
  'pending_review',
  'active',
  'rejected',
  'expired',
  'converted',
  'cancelled',
];

/* ---------- Party roles ---------- */
export const PARTY_ROLE = {
  OWNER: 'project_owner',
  EXECUTOR: 'executor',
};

/* ---------- Action gating ----------
   Which broker actions each status allows. Keeping this beside the
   statuses stops every page from re-deriving the same conditions. */
export function canEditOpportunity(status) {
  return status === OPPORTUNITY_STATUS.DRAFT;
}

/* Parties are only editable while the opportunity is still a draft —
   once submitted, the owner identity is what the duplicate check and
   the 90-day hold are pinned to. */
export function canManageParties(status) {
  return status === OPPORTUNITY_STATUS.DRAFT;
}

export function canSubmitOpportunity(status) {
  return status === OPPORTUNITY_STATUS.DRAFT;
}

/* Cancellable at any live stage — draft, awaiting review, or holding. */
export function canCancelOpportunity(status) {
  return (
    status === OPPORTUNITY_STATUS.DRAFT ||
    status === OPPORTUNITY_STATUS.PENDING ||
    status === OPPORTUNITY_STATUS.ACTIVE
  );
}

/* ---------- Referral capture ----------
   Method B in the integration doc: the broker shares
   taahud.sa/register?broker=260703R42. We persist the identifier so
   it survives the trip through the landing page and the form. */
export const BROKER_REFERRAL_PARAM = 'broker';
export const BROKER_REFERRAL_KEY = 'taahud_broker_ref';
export const BROKER_REFERRAL_DAYS = 30;
