import SelectOption from "../components/common/SelectOption";

export const IndustryHouses = [
  {
    value: "",
    label: (
      <SelectOption label="All Industry Houses" color="#82DD3A" source="all" />
    ),
  },
  {
    value: "💰 Alternative Economics",
    label: (
      <SelectOption
        label="Alternative Economics"
        color="#BD7B38"
        source="AlternativeE"
      />
    ),
  },
  {
    value: "☀️ Alternative Energy",
    label: (
      <SelectOption
        label="Alternative Energy"
        color="#FFC629"
        source="AlternativeEn"
      />
    ),
  },
  {
    value: "🏘 Community Development",
    label: (
      <SelectOption
        label="Community Development"
        color="#FBEAB4"
        source="CommDev"
      />
    ),
  },
  {
    value: "Environmental Justice/Advocacy",
    label: (
      <div className="flex items-center space-x-2 ">
        <span
          className={`w-[26px] h-[26px] rounded-full  bg-[#00FF00]`}
          style={{ backgroundColor: `#00FF00` }}
        ></span>
        <img
          src={`/png/climate.png`}
          alt="icon"
          className="w-[26px] h-[26px] rounded-full"
        />
        <span className="text-sm text-[#242424] font-lexend capitalize ">
          Environmental Justice/Advocacy
        </span>
      </div>
    ),
  },
  {
    value: "🧑🏾‍🏫 Education & Cultural Preservation",
    label: (
      <SelectOption
        label="Cultural Preservation and Education"
        color="#6D1199"
        source="Edu"
      />
    ),
  },
  {
    value: "🛖 Eco-friendly Building",
    label: (
      <SelectOption
        label="Eco-friendly Building"
        color="#CBE170"
        source="eco"
      />
    ),
  },
  {
    value: "♻️ Green Lifestyle",
    label: (
      <SelectOption label="Green Lifestyle" color="#009845" source="green" />
    ),
  },
  {
    value: "🆘 Survival/Preparedness",
    label: (
      <SelectOption
        label="Preparedness"
        color="#C4391D"
        source="preparedness"
      />
    ),
  },
  {
    value: "🌾 Agriculture/Sustainable Food Production / Land Management",
    label: (
      <SelectOption
        label="Sustainable Agriculture and Land Management"
        color="#82DD3A"
        source="agric"
      />
    ),
  },
  {
    value: "🗑 Waste",
    label: <SelectOption label="Waste" color="#2C4F40" source="waste" />,
  },
  {
    value: "💧Water",
    label: <SelectOption label="Water" color="#8CB1CF" source="water" />,
  },
  {
    value: "🧘🏿‍♀️ Wholistic Health",
    label: (
      <SelectOption
        label="Wholistic Health"
        color="#ED751C"
        source="wholistic"
      />
    ),
  },
  {
    value: "❓ Other",
    label: <SelectOption label="Other" color="#FF0000" source="all" />,
  },
];
