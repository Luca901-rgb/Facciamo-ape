import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

export default function CityAutocomplete({
  value,
  onChange,
  testId,
  className = "",
  inputClassName = "",
  placeholder = "Cerca città…",
  required = false,
}) {
  const [cities, setCities] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    api.get("/cities").then(({ data }) => setCities(data.map((c) => c.name))).catch(() => {});
  }, []);

  const suggestions = useMemo(() => {
    const q = (value || "").trim().toLowerCase();
    if (!q) return cities.slice(0, 10);
    return cities
      .filter((name) => name.toLowerCase().includes(q))
      .sort((a, b) => {
        const al = a.toLowerCase();
        const bl = b.toLowerCase();
        const aStarts = al.startsWith(q) ? 0 : 1;
        const bStarts = bl.startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return al.localeCompare(bl, "it");
      })
      .slice(0, 10);
  }, [cities, value]);

  const pick = (name) => {
    onChange(name);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && suggestions[highlight]) {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  useEffect(() => {
    setHighlight(0);
  }, [value, suggestions.length]);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        data-testid={testId}
        type="text"
        required={required}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="address-level2"
        className={inputClassName}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-ape-border bg-ape-surface shadow-lg py-1"
          role="listbox"
        >
          {suggestions.map((name, i) => (
            <li key={name} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(name);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  i === highlight ? "bg-ape-primary/20 text-ape-text" : "text-ape-text hover:bg-ape-bg/80"
                }`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function isKnownCity(city, cities) {
  const q = (city || "").trim().toLowerCase();
  return cities.some((name) => name.toLowerCase() === q);
}

export async function fetchCityNames() {
  const { data } = await api.get("/cities");
  return data.map((c) => c.name);
}
