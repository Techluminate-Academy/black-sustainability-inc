import { useState, useRef, useEffect } from "react";

interface CountryOption {
  code: string;
  country: string;
  iso2: string;
}

interface CountryCodeDropdownProps {
  value: string;
  options: CountryOption[];
  onChange: (newValue: string) => void;
}

const CountryCodeDropdown: React.FC<CountryCodeDropdownProps> = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const toggleDropdown = () => setOpen((prev) => !prev);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find the selected option for display
  const selectedOption = options.find(
    (option) => `${option.code}-${option.iso2}` === value
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="mr-2 border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 w-1/3"
      >
        {selectedOption
          ? `${selectedOption.code} (${selectedOption.country})`
          : "Select Country Code"}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-auto w-full">
          {options.map((option) => (
            <div
              key={`${option.code}-${option.iso2}`}
              onClick={() => {
                onChange(`${option.code}-${option.iso2}`);
                setOpen(false);
              }}
              className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
            >
              {option.code} ({option.country})
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CountryCodeDropdown;
