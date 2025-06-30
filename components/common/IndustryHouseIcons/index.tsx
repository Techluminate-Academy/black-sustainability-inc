import Image from "next/image";
import React from "react";

interface IProps {
  iconTag: string;
}

export const industries = [
  { label: "🌾 Agriculture/Sustainable Food Production / Land Management", value: "🌾 Agriculture/Sustainable Food Production / Land Management", source: "agric" },
  { label: "💰 Alternative Economics", value: "💰 Alternative Economics", source: "AlternativeEp" },
  { label: "☀️ Alternative Energy", value: "☀️ Alternative Energy", source: "AlternaiveEnergy" },
  { label: "Business", value: "Business", source: "default" },
  { label: "Climate", value: "Climate", source: "default" },
  { label: "🏘 Community Development", value: "🏘 Community Development", source: "CommDevP" },
  { label: "🛖 Eco-friendly Building", value: "🛖 Eco-friendly Building", source: "EcoP" },
  { label: "🏡 Eco-Tourism", value: "🏡 Eco-Tourism", source: "EcoPP" },
  { label: "📚 Education & Cultural Preservation", value: "📚 Education & Cultural Preservation", source: "EduP" },
  { label: "⚖️ Environmental Justice/Policy", value: "⚖️ Environmental Justice/Policy", source: "Preparedness" },
  { label: "♻️ Green Infrastructure", value: "♻️ Green Infrastructure", source: "Green" },
  { label: "🗑️ Waste Management", value: "🗑️ Waste Management", source: "waste" },
  { label: "💧 Water Resources", value: "💧 Water Resources", source: "water" },
  { label: "🧘🏾‍♀️ Wholistic Health", value: "🧘🏾‍♀️ Wholistic Health", source: "wholistic" },
  { label: "Other", value: "Other", source: "default" },
  { label: "All", value: "All", source: "default" },
];

const IndustryHouseIcons: React.FC<IProps> = ({ iconTag }) => {
  const selectedIcon = industries.find((item) => item.label === iconTag);
  if (!selectedIcon) return null;
  const source = selectedIcon.source;

  return (
    <Image
      src={`/png/${source}.png`}
      width={46}
      height={45}
      alt={`${iconTag} icon`}
      loading="lazy"
    />
  );
};

export default IndustryHouseIcons;
