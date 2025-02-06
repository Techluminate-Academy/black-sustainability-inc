// types for options
export type OptionType = {
  value: string;
  label: string;
  color: string;
  icons: string;
};
// Custom option component
export const CustomOption: React.FC<{ data: OptionType }> = ({
  data,
  ...props
}) => {
  return (
    <div className="flex items-center gap-x-3 py-3" {...props}>
      <div className={`w-[25px] h-[25px] mr-[5px] ${data.color}`}></div>
      <img src={`/svg/${data.icons}`} alt="industry icons" />
      <span>{data.label}</span>
    </div>
  );
};

// Custom styles
export const customStyles = {
  control: (provided: any) => ({
    ...provided,
    maxWidth: "100%",
    marginBottom: "5px",
  }),
};
