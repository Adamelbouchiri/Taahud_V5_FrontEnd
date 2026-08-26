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

/* ============================================================
 *  SPRINT 2 — fee negotiation, invitations, drafts.
 *  Mirrors BROKER_SPRINT2_INTEGRATION.md.
 * ============================================================ */

/* ---------- Fee negotiation (opportunities.fee_status) ----------
   The handshake is at most three moves:

     not_set                broker proposes
     pending_owner_decision owner approves OR counters lower
     counter_proposed       broker accepts or rejects (final)
     approved               done — both sides agreed
     rejected               broker refused the counter; the HOLD
                            SURVIVES and the broker may propose again

   Only one counter round exists by COO decision, which is why
   `counter_proposed` has no owner-side action. */
export const FEE_STATUS = {
  NOT_SET: 'not_set',
  PENDING_OWNER: 'pending_owner_decision',
  COUNTER_PROPOSED: 'counter_proposed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const FEE_STATUS_TONE = {
  not_set: 'muted',
  pending_owner_decision: 'warning',
  counter_proposed: 'warning',
  approved: 'success',
  rejected: 'danger',
};

/* The BE validates `fee_percent` as decimal|min:0.5|max:5. Mirrored
   here so the form can refuse before the round-trip. */
export const FEE_PERCENT_MIN = 0.5;
export const FEE_PERCENT_MAX = 5;

/* A fee_status may be absent on an opportunity created before the
   sprint-2 migration — read it as "nothing proposed yet". */
export function feeStatus(opportunity) {
  return opportunity?.fee_status || FEE_STATUS.NOT_SET;
}

/* The broker's turn: the opening proposal, or a fresh one after they
   rejected the owner's counter. */
export function canProposeFee(opportunity) {
  const s = feeStatus(opportunity);
  return s === FEE_STATUS.NOT_SET || s === FEE_STATUS.REJECTED;
}

/* The owner's only turn — approve or counter lower. */
export function canDecideFee(opportunity) {
  return feeStatus(opportunity) === FEE_STATUS.PENDING_OWNER;
}

/* The broker's answer to a counter. Final either way. */
export function canRespondToFee(opportunity) {
  return feeStatus(opportunity) === FEE_STATUS.COUNTER_PROPOSED;
}

export function isFeeApproved(opportunity) {
  return feeStatus(opportunity) === FEE_STATUS.APPROVED;
}

/* True when this counter is a legal one: strictly below the broker's
   proposal, and still inside the platform's band. */
export function isValidCounter(counter, proposed) {
  const c = Number(counter);
  if (!Number.isFinite(c)) return false;
  if (c < FEE_PERCENT_MIN || c > FEE_PERCENT_MAX) return false;
  return c < Number(proposed);
}

/* ---------- Invitations (Method D) ---------- */
export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

export const INVITATION_STATUS_TONE = {
  pending: 'warning',
  accepted: 'success',
  expired: 'muted',
  cancelled: 'muted',
};

/* Days a token stays live, per the COO. Shown next to the copy button
   so the broker knows how long the link they just pasted is good for. */
export const INVITATION_VALID_DAYS = 7;

/* One invitation per opportunity. A pending one blocks a new one (the
   broker must cancel first); an accepted one blocks it forever; an
   expired or cancelled one is replaced silently by the BE. */
export function canCreateInvitation(invitation) {
  if (!invitation) return true;
  const s = invitation.status;
  return s === INVITATION_STATUS.EXPIRED || s === INVITATION_STATUS.CANCELLED;
}

export function canCancelInvitation(invitation) {
  return invitation?.status === INVITATION_STATUS.PENDING;
}

export function isInvitationAccepted(invitation) {
  return invitation?.status === INVITATION_STATUS.ACCEPTED;
}

/* The shareable link the broker copies and sends by hand. The BE
   returns `accept_url` as a FE-relative path; make it absolute so what
   lands in WhatsApp is clickable. */
export function invitationUrl(invitation) {
  if (!invitation) return '';
  const path =
    invitation.accept_url ||
    (invitation.token ? `/invitations/${invitation.token}` : '');
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const origin =
    typeof window !== 'undefined' && window.location
      ? window.location.origin
      : '';
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

/* ---------- Project drafts ----------
   A draft is a Project with status='draft'. The BE enforces all three
   prerequisites below and answers 422 with the specific reason; we
   gate the button on the same conditions so that 422 is a backstop
   rather than the primary UX.

   `draft_project_id` is null when no draft exists and absent on
   endpoints that don't eager-load the relation — both read as "none"
   here, which is right: an opportunity read without it is one we
   can't offer draft actions on anyway. */
export function draftPrerequisites(opportunity) {
  return {
    invitationAccepted: isInvitationAccepted(opportunity?.invitation),
    feeApproved: isFeeApproved(opportunity),
    noDraftYet: !opportunity?.draft_project_id,
  };
}

export function canCreateDraft(opportunity) {
  const p = draftPrerequisites(opportunity);
  return p.invitationAccepted && p.feeApproved && p.noDraftYet;
}

/* Phase 1 — the broker still holds the draft and is the only editor. */
export function isDraftWithBroker(project) {
  return (
    project?.status === 'draft' && !project?.draft_ready_for_owner_at
  );
}

/* Phase 2 — handed off. The owner edits and publishes; the broker's
   PATCH now returns 422. */
export function isDraftWithOwner(project) {
  return (
    project?.status === 'draft' && Boolean(project?.draft_ready_for_owner_at)
  );
}
