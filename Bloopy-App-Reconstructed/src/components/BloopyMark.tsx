import Image from "next/image";

type BloopyMarkProps = {
  className?: string;
  size?: number;
  priority?: boolean;
};

export default function BloopyMark({
  className = "",
  size = 120,
  priority = true,
}: BloopyMarkProps) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
      aria-label="Bloopy"
    >
      <Image
        src="/bloopy_logo_flat_no_lighting_transparent.png"
        alt="Bloopy"
        width={size}
        height={size}
        priority={priority}
        className="h-full w-full object-contain"
      />
    </div>
  );
}
