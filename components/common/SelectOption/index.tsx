import React from "react";

interface Iprops {
  label: string;
  source: string;
  color: string;
}

const SelectOption: React.FC<Iprops> = ({ label, source, color }) => {
  return (
    <div className="flex items-center space-x-2 ">
      <span className={`w-[26px] h-[26px] rounded-full  bg-[${color}]`} style={{ backgroundColor: `${color}`}}></span>
      <img
        src={`/svg/${source}.svg`}
        alt="icon"
        className="w-[26px] h-[26px] rounded-full"
      />
      <span className="text-sm text-[#242424] font-lexend capitalize ">
        {label}
      </span>
    </div>
  );
};

export default SelectOption;
