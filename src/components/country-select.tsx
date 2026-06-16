// src/components/country-select.tsx
"use client";

import ReactSelect, { type StylesConfig, type SingleValue } from "react-select";
import { COUNTRIES } from "@/lib/countries";

type Option = { value: string; label: string };

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  hasError?: boolean;
  inputId?: string;
}

const customStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "36px",
    height: "36px",
    borderRadius: "6px",
    borderColor: state.isFocused ? "#6366f1" : "#e5e7eb",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(99,102,241,0.2)" : "none",
    "&:hover": { borderColor: "#6366f1" },
    fontSize: "14px",
    backgroundColor: state.isDisabled ? "#f9fafb" : "#fff",
    cursor: state.isDisabled ? "not-allowed" : "default",
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 10px",
    height: "36px",
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: "14px",
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: "0 8px",
    color: "#9ca3af",
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: "0 4px",
    color: "#9ca3af",
    "&:hover": { color: "#6b7280" },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    zIndex: 50,
    fontSize: "14px",
  }),
  menuList: (base) => ({
    ...base,
    padding: "4px",
    maxHeight: "220px",
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: "6px",
    padding: "7px 10px",
    backgroundColor: state.isSelected
      ? "#6366f1"
      : state.isFocused
      ? "#f0f0ff"
      : "transparent",
    color: state.isSelected ? "#fff" : "#111827",
    cursor: "pointer",
    "&:active": { backgroundColor: "#4f46e5" },
  }),
  placeholder: (base) => ({
    ...base,
    color: "#9ca3af",
    fontSize: "14px",
  }),
  singleValue: (base) => ({
    ...base,
    fontSize: "14px",
    color: "#111827",
  }),
  noOptionsMessage: (base) => ({
    ...base,
    fontSize: "13px",
    color: "#9ca3af",
    padding: "10px",
  }),
};

// Error override — red border when invalid
function errorStyles(hasError: boolean): StylesConfig<Option, false> {
  if (!hasError) return customStyles;
  return {
    ...customStyles,
    control: (base, state) => ({
      ...(customStyles.control?.(base, state) ?? base),
      borderColor: "#f87171",
      "&:hover": { borderColor: "#f87171" },
    }),
  };
}

export function CountrySelect({
  value,
  onChange,
  onBlur,
  disabled,
  hasError,
  inputId,
}: CountrySelectProps) {
  const selected = COUNTRIES.find((c) => c.value === value) ?? null;

  function handleChange(option: SingleValue<Option>) {
    onChange(option?.value ?? "");
  }

  return (
    <ReactSelect<Option, false>
      inputId={inputId}
      options={COUNTRIES as unknown as Option[]}
      value={selected}
      onChange={handleChange}
      onBlur={onBlur}
      isDisabled={disabled}
      isClearable
      isSearchable
      placeholder="Select country..."
      noOptionsMessage={() => "No country found"}
      styles={errorStyles(hasError ?? false)}
      classNamePrefix="country-select"
    />
  );
}