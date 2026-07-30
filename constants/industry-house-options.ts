export const INDUSTRY_HOUSE_NAMES = [
  "☀️ Alternative Energy",
  "🌾 Reparative Agriculture",
  "💰 Alternative Economics",
  "🏘 Community Development",
  "🛖 Eco-friendly Building",
  "🧑🏾‍🏫 Education & Cultural Preservation",
  "Climate/Environmental Justice",
  "♻️ Green Lifestyle",
  "🆘 Survival/Preparedness",
  "💻 Technology",
  "🗑 Waste",
  "💧Water",
  "🧘🏿‍♀️ Wholistic Health",
  "❓ Other",
] as const;

export const FALLBACK_INDUSTRY_OPTIONS = INDUSTRY_HOUSE_NAMES.map((name) => ({
  id: name,
  name,
}));

export const FALLBACK_INDUSTRY_FIELD_METADATA = {
  fieldName: "PRIMARY INDUSTRY HOUSE",
  fieldType: "singleSelect",
  options: FALLBACK_INDUSTRY_OPTIONS.map((option) => ({
    ...option,
    icon: null,
  })),
};
