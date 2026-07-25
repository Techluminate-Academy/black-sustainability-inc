export const INDUSTRY_HOUSE_NAMES = [
  "💰 Alternative Economics",
  "☀️ Alternative Energy",
  "🏘 Community Development",
  "Environmental Justice/Advocacy",
  "🧑🏾‍🏫 Education & Cultural Preservation",
  "🛖 Eco-friendly Building",
  "♻️ Green Lifestyle",
  "🆘 Survival/Preparedness",
  "🌾 Agriculture/Sustainable Food Production / Land Management",
  "🌾 Reparative Agriculture",
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
