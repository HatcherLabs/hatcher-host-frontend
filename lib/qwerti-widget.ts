export const QWERTI_WIDGET_ORIGIN = 'https://widget.qwerti.ai';

// Qwerti core v0.1.339. Keep the content-addressed URL and SRI hash in sync.
// Updating the widget is intentionally a reviewed source change instead of a
// runtime manifest lookup.
export const QWERTI_WIDGET_SCRIPT_SRC =
  `${QWERTI_WIDGET_ORIGIN}/widget/v1/core.C_GhHoeT.js`;
export const QWERTI_WIDGET_SCRIPT_INTEGRITY =
  'sha384-51mt8gjyrrEPYn9Wembpcw0/TCi59jYmDquyWUdzCUgJdDWT5IaggdWSw8RiGMWH';
export const QWERTI_WIDGET_SCRIPT_CSP_HASH =
  `'${QWERTI_WIDGET_SCRIPT_INTEGRITY}'`;
