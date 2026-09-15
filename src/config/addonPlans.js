/* ============================================================
 *  ADD-ON PLANS — plan code → localized copy block.
 *  ----------------------------------------------------------------
 *  Add-on plans are universal (account_type: null), so unlike base
 *  plans they can't be keyed by audience + tier. Each one has its
 *  own copy block under `landing.plans.*` in the dictionaries, and
 *  this map is the only place that says which block belongs to which
 *  backend plan code.
 *
 *  It exists because the mapping used to be written inline, twice,
 *  as:
 *
 *      plan.code === 'solidarity_addon' ? 'solidarityAddon' : 'addon'
 *
 *  — which quietly handed EVERY other add-on the Isnad copy. When the
 *  two رصد plans landed, both rendered as "إضافة إسناد — افتح ساحة
 *  إسناد" at رصد prices: three Isnad cards on one page, two of them
 *  lies. A lookup that returns null for an unknown code turns that
 *  failure into the harmless one — the card falls back to the plan's
 *  own name and description from the backend.
 *
 *  Adding an add-on: add its code here and its copy block to all four
 *  dictionaries. Miss the second step and the card still reads
 *  correctly, just in the backend's ar/en only.
 * ============================================================ */

export const ADDON_COPY_KEY = {
  isnad_addon: 'addon',
  solidarity_addon: 'solidarityAddon',
  // رصد ships as two plans that differ only in price and in whether
  // the buyer already pays for a base plan. Separate copy blocks, so
  // each card can say which one it is.
  rasd_addon: 'rasdAddon', // standalone — 11,999 / 12 months
  rasd_addon_bundled: 'rasdAddonBundled', // with a plan — 6,999 / 12 months
};

/**
 * The dictionary key holding this add-on's copy, or null when we
 * don't have localized copy for it. Null means "use the backend's own
 * name and description" — never another add-on's.
 */
export function addonCopyKey(code) {
  return ADDON_COPY_KEY[code] || null;
}
