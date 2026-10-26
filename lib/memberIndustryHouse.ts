/** Display both legacy array fields and current Mighty industry strings. */
export function memberIndustryHouse(value: unknown): string {
  const values = (Array.isArray(value) ? value : [value])
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item && !/^(none|n\/a|no industry(?: house)?|not (?:yet )?(?:provided|updated)|general member)$/i.test(item));
  return values.join(", ") || "General member";
}
