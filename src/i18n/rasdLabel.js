/* ============================================================
 *  rasdLabels — display labels for the RASD enums.
 *  ----------------------------------------------------------------
 *  Every RASD response carries `<field>_label` beside `<field>`, but
 *  only in Arabic — the module ships one language and the platform
 *  ships four. So the label is resolved from the VALUE through our
 *  own dictionaries, and the API's Arabic label is the fallback for
 *  a value our dictionary hasn't got (a stage added backend-side
 *  before the FE catches up).
 *
 *  Note the direction: value → label. We never read a value out of a
 *  label, so an Arabic label edited on the backend can't drift a
 *  filter — which is the trap RASD_API_1.md §4.1 warns about.
 *
 *  Usage (inside a component with useTranslation):
 *    const { t } = useTranslation();
 *    const labels = useMemo(() => rasdLabels(t), [t]);
 *    labels.stage('tendering', project.stage_label)
 * ============================================================ */

function resolver(t, group) {
  /**
   * @param {string} value     the BE enum value — what filters send
   * @param {string} apiLabel  the Arabic label the API sent with it
   */
  return function label(value, apiLabel) {
    if (!value) return apiLabel || '';
    const key = `rasd.${group}.${value}`;
    const hit = t(key);
    // t() falls back to Arabic and then returns the key itself on a
    // total miss — that's the signal to use the backend's own label.
    if (hit && hit !== key) return hit;
    return apiLabel || value;
  };
}

export function rasdLabels(t) {
  return {
    stage: resolver(t, 'stage'),
    sector: resolver(t, 'sector'),
    role: resolver(t, 'role'),
    confidence: resolver(t, 'confidence'),
    contactRole: resolver(t, 'contactRole'),
    category: resolver(t, 'category'),
  };
}
