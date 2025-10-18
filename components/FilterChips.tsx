import clsx from "clsx";

interface FilterChipsProps {
  label: string;
  options: string[];
  value?: string | null;
  onSelect: (value: string | null) => void;
}

export function FilterChips({ label, options, value, onSelect }: FilterChipsProps) {
  const handleSelect = (option: string | null) => () => onSelect(option);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium uppercase tracking-wide text-white/70">
        {label}
      </span>
      <button
        type="button"
        onClick={handleSelect(null)}
        className={clsx(
          "rounded-full border border-white/40 px-3 py-1 text-sm font-medium uppercase tracking-wide transition",
          value == null
            ? "bg-white/40 text-brand shadow-sm"
            : "bg-white/10 text-white/80 hover:bg-white/20"
        )}
      >
        Sve
      </button>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={handleSelect(isActive ? null : option)}
              className={clsx(
                "rounded-full px-3 py-1 text-sm font-medium uppercase tracking-wide transition",
                "border border-white/40",
                isActive
                  ? "bg-white text-brand shadow-sm"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FilterChips;
