"use client";

const NEON = "#0A84FF";
const TRACK_OFF = "#1b3a63";

export default function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative h-6 w-11 shrink-0 rounded-full border-0 p-0 transition-colors duration-200"
      style={{ background: checked ? NEON : TRACK_OFF }}
    >
      <span
        className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform duration-200"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}
