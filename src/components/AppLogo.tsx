/** Marca simple: ciclo + actividad (SVG inline, sin dependencias). */
export function AppLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      width={48}
      height={48}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="appLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#appLogoGrad)" opacity="0.15" />
      <path
        d="M24 8c-6 0-11 4.5-11 10 0 4 2.5 7 6 9v15h10V27c3.5-2 6-5 6-9 0-5.5-5-10-11-10z"
        fill="none"
        stroke="url(#appLogoGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 32h12M21 36h6"
        stroke="url(#appLogoGrad)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
