import { useId } from "react";

export default function BrandMark({ className = "", compact = false }) {
  const gradientId = `anathel-holo-${useId().replace(/:/g, "")}`;

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}
      aria-label="ANATHEL Design"
    >
      <svg
        aria-hidden="true"
        className={`shrink-0 ${compact ? "h-8 w-8" : "h-11 w-11"}`}
        viewBox="0 0 64 64"
        fill="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="7" y1="8" x2="57" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C7D0DC" />
            <stop offset=".34" stopColor="#54C9DC" />
            <stop offset=".68" stopColor="#8B76D8" />
            <stop offset="1" stopColor="#D99BBC" />
          </linearGradient>
        </defs>
        <path
          d="M32 4.5 55.8 18.2v27.6L32 59.5 8.2 45.8V18.2L32 4.5Z"
          fill="white"
          fillOpacity=".86"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="m18.7 43.5 12.6-25 14 25M23.7 34.2h17.1"
          stroke={`url(#${gradientId})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="flex min-w-0 flex-col leading-none">
        <span className={`anathel-wordmark ${compact ? "text-[15px]" : "text-[19px]"}`}>
          ANATHEL
        </span>
        <span className="mt-1 text-[8px] font-bold tracking-[0.42em] text-slate-500">
          DESIGN
        </span>
      </span>
    </span>
  );
}
