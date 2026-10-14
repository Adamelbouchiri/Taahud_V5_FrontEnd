/* ============================================================
 *  roleIcons — the role glyphs from the Taahud-Platform design,
 *  shared by the landing role cards and the Services menu. They
 *  take the same `size` / `strokeWidth` props as lucide icons so
 *  landingRoles.js can swap them in without touching the callers.
 * ============================================================ */

function RoleIcon({ size = 24, strokeWidth = 1.6, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Tower crane — contractors and engineering offices. */
export function CraneIcon(props) {
  return (
    <RoleIcon {...props}>
      <path d="M5.5 20.5h5" />
      <path d="M8 20.5V4.5" />
      <path d="M4 5.5h15" />
      <path d="M8 4.5 4 5.5" />
      <path d="M16.5 5.5v3.2" />
      <path d="M15.2 8.7h2.6v1.8h-2.6z" />
    </RoleIcon>
  );
}

/** Office block — developers. */
export function TowerIcon(props) {
  return (
    <RoleIcon {...props}>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
    </RoleIcon>
  );
}

/** House — individuals. */
export function HouseIcon(props) {
  return (
    <RoleIcon {...props}>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10M10 20v-5h4v5" />
    </RoleIcon>
  );
}

/** Check in a circle — brokers. */
export function CheckCircleIcon(props) {
  return (
    <RoleIcon {...props}>
      <path d="M8 12l3 3 5-5" />
      <circle cx="12" cy="12" r="9" />
    </RoleIcon>
  );
}

/** Truck — suppliers. */
export function TruckIcon(props) {
  return (
    <RoleIcon {...props}>
      <path d="M2 7h12v9H2zM14 10h4l4 4v2h-8z" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </RoleIcon>
  );
}
