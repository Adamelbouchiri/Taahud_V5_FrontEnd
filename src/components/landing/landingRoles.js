import { CraneIcon, TowerIcon, HouseIcon, CheckCircleIcon, TruckIcon } from './roleIcons';

/* ============================================================
 *  landingRoles — who Taahud serves and what each one gets.
 *  ----------------------------------------------------------------
 *  One list behind two screens: the «كل ما يحتاجه مشروعك» cards on
 *  the landing page and the navbar's Services mega menu. Clicking a
 *  card opens the menu on that role's tab (see SERVICES_MENU_EVENT).
 *
 *  Labels live in landing.roles.* — this file only holds structure:
 *    services  [{ k, badge? }]   → landing.roles.services.<k>
 *    tools     [{ k, badge? }]   → landing.roles.tools.<k>
 *    badge     'soon' | 'extra'  → landing.roles.badges.<badge>
 *    free      'free' | 'freeFirst' — the green pill on the card
 *    more      { available, soon } → landing.roles.allMore.items.<k> —
 *              the menu's «عرض كل الخدمات والأدوات» dropdown
 *    soon      the whole role isn't open yet (suppliers)
 *    menuOnly  a tab in the Services menu with no landing card —
 *              engineering offices share the contractors' card
 *    menuTitle the menu reads landing.roles.items.<key>.menuTitle
 *              instead of .title — contractors are «المقاولين» on the
 *              tab, «المقاولين والمكاتب الهندسية» on the card
 * ============================================================ */

export const SERVICES_MENU_EVENT = 'taahud:open-services-menu';

export const ROLES = [
  {
    key: 'contractors',
    icon: CraneIcon,
    menuTitle: true,
    services: [
      { k: 'projects' },
      { k: 'arena' },
      { k: 'offers' },
      { k: 'trackingCreate' },
      { k: 'import' },
      { k: 'profile', badge: 'soon' },
    ],
    tools: [{ k: 'contractGen' }, { k: 'calculator' }],
    more: {
      available: [
        'escrow', 'dashContractor', 'supervision', 'appointments', 'verifiedId', 'clients',
        'wallet', 'stageApproval', 'accountManager', 'billing', 'brokerDrafts', 'esign',
        'fit', 'prioritySupport', 'badgeContractor', 'approvals', 'rfq', 'analyzer',
        'execAssistant', 'templates',
      ],
      soon: [
        'reviews', 'store', 'documents', 'messages', 'notifications', 'stats', 'export',
        'cashback',
      ],
    },
  },
  {
    key: 'engineering',
    icon: CraneIcon,
    menuOnly: true,
    services: [
      { k: 'projects' },
      { k: 'arena' },
      { k: 'offers' },
      { k: 'trackingCreate' },
      { k: 'drawingsApproval' },
      { k: 'import' },
      { k: 'profile', badge: 'soon' },
    ],
    tools: [{ k: 'contractGen' }],
    more: {
      available: [
        'escrow', 'dashEngineering', 'supervision', 'appointments', 'wallet', 'verifiedId',
        'clients', 'stageApproval', 'accountManager', 'billing', 'brokerDrafts', 'esign',
        'fit', 'prioritySupport', 'badgeEngineering', 'rfis', 'rfq', 'analyzer',
        'templates', 'engAssistant',
      ],
      soon: ['reviews', 'drawingsDocs', 'store', 'messages', 'notifications', 'stats', 'export'],
    },
  },
  {
    key: 'developers',
    icon: TowerIcon,
    services: [
      { k: 'arena' },
      { k: 'trackingAll' },
      { k: 'import' },
      { k: 'profile', badge: 'soon' },
    ],
    tools: [
      { k: 'contractGen' },
      { k: 'calculator' },
      { k: 'assets' },
      { k: 'investment', badge: 'soon' },
      { k: 'investorReports' },
    ],
    more: {
      available: [
        'postDev', 'escrow', 'dashDeveloper', 'appointments', 'wallet', 'accountManager',
        'billing', 'brokerDrafts', 'esign', 'badgeDeveloper', 'prioritySupport', 'promote',
        'rfq', 'devAdvisor', 'offerCompare',
      ],
      soon: [
        'reviews', 'store', 'clients', 'documents', 'messages', 'notifications', 'stats',
        'export', 'salePosts', 'investPosts', 'cashback',
      ],
    },
  },
  {
    key: 'individuals',
    icon: HouseIcon,
    free: 'freeFirst',
    services: [
      { k: 'postProject' },
      { k: 'tracking' },
      { k: 'contractorOffers' },
      { k: 'stagedPayments' },
      { k: 'inspection', badge: 'extra' },
    ],
    tools: [
      { k: 'contractCheck', badge: 'extra' },
      { k: 'calculator', badge: 'extra' },
      { k: 'investment', badge: 'extra' },
    ],
  },
  {
    key: 'brokers',
    icon: CheckCircleIcon,
    free: 'free',
    services: [{ k: 'registerOpp' }, { k: 'commission' }, { k: 'verifiedBroker' }],
    tools: [],
  },
  {
    key: 'suppliers',
    icon: TruckIcon,
    soon: true,
    services: [],
    tools: [],
  },
];

/** Dictionary key for a role's label inside the Services menu. */
export function roleMenuTitleKey(role) {
  return `landing.roles.items.${role.key}.${role.menuTitle ? 'menuTitle' : 'title'}`;
}

/** Ask the navbar to open the Services menu on one role's tab. */
export function openServicesMenu(role) {
  window.dispatchEvent(new CustomEvent(SERVICES_MENU_EVENT, { detail: { role } }));
}
