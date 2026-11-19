export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 rounded-xl theme-btn-primary"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4.2" ry="9" opacity="0.82" />
        <path d="M3.5 12h17M5.5 7.2h13M5.5 16.8h13" opacity="0.65" />
      </svg>
    </span>
  );
}
