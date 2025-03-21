import { useState, useRef, useEffect } from "react";

export interface CountryOption {
  code: string;
  country: string;
  iso2: string;
}

interface CountryCodeDropdownProps {
  value: string;
  options: CountryOption[];
  onChange: (newValue: string) => void;
}

/**
 * A custom dropdown that displays a wide button
 * and an absolutely positioned dropdown menu.
 */
const CountryCodeDropdown: React.FC<CountryCodeDropdownProps> = ({
  value,
  options,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => setOpen((prev) => !prev);

  // Find the selected option for display
  const selectedOption = options.find(
    (opt) => `${opt.code}-${opt.iso2}` === value
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Full-width button */}
      <button
        type="button"
        onClick={toggleDropdown}
        className="
          w-full
          px-3
          py-2
          bg-gray-50
          text-left
          text-gray-700
          hover:bg-gray-100
          focus:outline-none
          focus:ring-1
          focus:ring-blue-500
          rounded-md
        "
      >
        {selectedOption
          ? `${selectedOption.code} (${selectedOption.country})`
          : "Select Country Code"}
      </button>

      {open && (
        <div
          className="
            absolute
            left-0
            mt-1
            bg-white
            border
            border-gray-300
            rounded-md
            shadow-lg
            z-50
            max-h-48
            overflow-auto
            w-full
          "
        >
          {options.map((option) => (
            <div
              key={`${option.code}-${option.iso2}`}
              onClick={() => {
                onChange(`${option.code}-${option.iso2}`);
                setOpen(false);
              }}
              className="
                px-4
                py-2
                hover:bg-blue-100
                cursor-pointer
                text-sm
              "
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
