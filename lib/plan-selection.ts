/** Purchase choices must reflect the account entitlement, not just the price list. */
export function planSelection(
  current: string | undefined,
  target: string,
  order: string[],
) {
  if (!current || current === "banned" || !order.includes(current))
    return "manage";
  if (current === target)
    return current === "founding_member" ? "lifetime" : "renew";
  if (order.indexOf(target) < order.indexOf(current)) return "included";
  return "upgrade";
}
