import Image from "next/image";
import React from "react";

interface IProps {
  iconTag: string;
}

const IndustryHouseIcons: React.FC<IProps> = ({ iconTag }) => {
  const industryProps = [
    {
      label: "💰 Alternative Economics",
      source: "AlternativeEp",
      bgColor: "#177621",
    },
    {
      label: "☀️ Alternative Energy",
      source: "AlternaiveEnergy",
      bgColor: "#FFBF23",
    },
    {
      label: "🏘 Community Development",
      source: "CommDevP",
      bgColor: "#D86800",
    },
    {
      label: "🧑🏾‍🏫 Education & Cultural Preservation",
      source: "EduP",
      bgColor: "#1A1A1A",
    },
    {
      label: "Environmental Justice/Advocacy",
      source: "AlternativeEnP",
      bgColor: "#00FF00",
    },

    { label: "🛖 Eco-friendly Building", source: "EcoP", bgColor: "#D2CA00" },
    { label: "♻️ Green Lifestyle", source: "Green", bgColor: "#FF902B" },
    {
      label: "🆘 Survival/Preparedness",
      source: "Preparedness",
      bgColor: "#FF2B2B",
    },
    {
      label: "🌾 Agriculture/Sustainable Food Production / Land Management",
      source: "agric",
      bgColor: "#82DD3A",
    },
    { label: "🗑 Waste", source: "waste", bgColor: "#AC7F55" },
    { label: "💧Water", source: "water", bgColor: "#4D64FF" },
    { label: "🧘🏿‍♀️ Wholistic Health", source: "wholistic", bgColor: "#7B1EF2" },
    { label: "❓ Other", source: "EcoPP", bgColor: "#7B1EF2" },
  ];

  // Find the item with the matching label
  const selectedIcon = industryProps.find((item) => item.label === iconTag);

  // If a matching item is found, use its source and bgColor
  const source = selectedIcon ? selectedIcon.source : "";
  const bgColor = selectedIcon ? selectedIcon.bgColor : "";

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
