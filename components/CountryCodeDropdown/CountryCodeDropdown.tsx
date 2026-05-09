import React from 'react';

interface CountryCodeDropdownProps {
  value: string;
  options: Array<{
    value: string;
    label: string;
    iso2: string;
  }>;
  onChange: (value: string) => void;
}

const CountryCodeDropdown: React.FC<CountryCodeDropdownProps> = ({
  value,
  options,
  onChange,
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-700"
      style={{ width: '200px' }}
    >
      <option value="">United States</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.iso2 === 'us' ? 'United States' : option.label}
        </option>
      ))}
    </select>
  );
};

export default CountryCodeDropdown;
