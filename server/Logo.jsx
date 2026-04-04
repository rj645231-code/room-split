export default function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="12" fill="url(#logoGrad)" />
      <path d="M12 20C12 15.6 15.6 12 20 12C22.2 12 24.2 12.9 25.7 14.3L28 12C25.9 10.1 23.1 9 20 9C13.9 9 9 13.9 9 20C9 26.1 13.9 31 20 31C23.1 31 25.9 29.9 28 28L25.7 25.7C24.2 27.1 22.2 28 20 28C15.6 28 12 24.4 12 20Z"
        fill="white" fillOpacity="0.9" />
      <path d="M20 15V25M15 20H25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="31" cy="12" r="4" fill="#34d399" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
