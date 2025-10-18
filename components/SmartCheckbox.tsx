import { forwardRef, useMemo } from "react";
import clsx from "clsx";

type SmartCheckboxAccent = "green" | "cyan" | "brand";

interface SmartCheckboxProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  ariaLabel: string;
  accent?: SmartCheckboxAccent;
  disabled?: boolean;
}

const accentClasses: Record<SmartCheckboxAccent, string> = {
  brand: "data-[checked=true]:bg-brand",
  green: "data-[checked=true]:bg-green-500",
  cyan: "data-[checked=true]:bg-cyan-400",
};

export const SmartCheckbox = forwardRef<HTMLButtonElement, SmartCheckboxProps>(
  ({ checked, onChange, ariaLabel, accent = "brand", disabled = false }, ref) => {
    const accentClass = useMemo(() => accentClasses[accent], [accent]);

    const handleToggle = () => {
      if (disabled) {
        return;
      }

      onChange(!checked);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        handleToggle();
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={clsx(
          "group relative flex h-7 w-7 items-center justify-center rounded-lg border border-white/70 bg-white/20",
          "backdrop-blur-sm shadow-inner transition-all duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
          "enabled:active:scale-95",
          "disabled:cursor-not-allowed disabled:opacity-60",
          accentClass
        )}
        data-checked={checked}
      >
        <span
          aria-hidden
          className={clsx(
            "pointer-events-none absolute inset-0 rounded-lg",
            "bg-white/10 opacity-0 transition-opacity duration-200",
            "group-data-[checked=true]:opacity-20"
          )}
        />
        <svg
          className={clsx(
            "pointer-events-none h-4 w-4 text-white transition-transform duration-150",
            checked ? "scale-100 opacity-100" : "scale-75 opacity-0"
          )}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4.5 10.5 8.5 14.5 15.5 5.5" />
        </svg>
      </button>
    );
  }
);

SmartCheckbox.displayName = "SmartCheckbox";

export default SmartCheckbox;
