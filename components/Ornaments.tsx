import BrandLogo from "./BrandLogo";

export function Flourish({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="300"
      height="38"
      viewBox="0 0 300 38"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 19h108l13 10 26-22 26 22 13-10h108M24 24h82l18 10 26-22 26 22 18-10h82"
        stroke="currentColor"
        strokeWidth=".8"
      />
      <path
        d="m150 10 8 9-8 9-8-9 8-9ZM3 19l6-4v8l-6-4Zm294 0-6-4v8l6-4Z"
        fill="currentColor"
      />
      <path
        d="M48 19c-8-12-20-9-17-2 3 5 12 2 8-2m213 4c8-12 20-9 17-2-3 5-12 2-8-2"
        stroke="currentColor"
        strokeWidth=".8"
      />
    </svg>
  );
}
export function Corner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 94V9h85M15 82V15h67M9 41C38 38 41 9 41 9M9 19c30 2 48 20 45 34-3 13-20 12-19 2 1-8 14-8 12 0M19 9c2 30 20 48 34 45M15 15C1-5 33 2 28 18 23 32 5 22 9 16M55 9c4 10 16 15 23 6-9 0-9-4-11-7M9 55c10 4 15 16 6 23 0-9-4-9-7-11"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="m31 31 4 7-4 7-4-7 4-7ZM49 22l3 5-3 5-3-5 3-5ZM22 49l5 3-5 3-5-3 5-3Z"
        fill="currentColor"
      />
    </svg>
  );
}
export function Star({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="26"
      viewBox="0 0 18 26"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 1c0 8-3 11-8 12 5 1 8 4 8 12 0-8 3-11 8-12-5-1-8-4-8-12Z"
        fill="currentColor"
      />
    </svg>
  );
}
export function QuillArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 330 34"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 17h297M18 17 38 8l-8 9 8 9-20-9Zm278 0-16-9h15l17 9-17 9h-15l16-9Z"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="m284 10 9 7-9 7m9-14 9 7-9 7M75 13h51m-37 8h53m48-8h30m-18 8h52"
        stroke="currentColor"
        strokeWidth=".6"
      />
      <path d="m165 10 6 7-6 7-6-7 6-7Z" fill="currentColor" />
      <circle cx="165" cy="17" r="10" stroke="currentColor" strokeWidth=".6" />
    </svg>
  );
}
export function GothicArch() {
  return (
    <svg
      className="gothic-arch"
      viewBox="0 0 360 580"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M35 560V220C35 120 91 65 180 15c89 50 145 105 145 205v340M47 560V220c0-92 53-145 133-191 80 46 133 99 133 191v340M23 560h40m234 0h40M23 550h40m234 0h40M35 237h12m266 0h12M35 250h12m266 0h12"
        stroke="currentColor"
      />
      <path
        d="M98 79c26 6 61 9 82-50 21 59 56 56 82 50M131 53c17 24 35 34 49 51 14-17 32-27 49-51M180 29v75M147 82l33 22 33-22"
        stroke="currentColor"
        strokeWidth=".7"
      />
      <path d="m180 108 6 9-6 9-6-9 6-9Z" fill="currentColor" />
    </svg>
  );
}
export function Pennant() {
  return (
    <div className="pennant" aria-hidden="true">
      <svg viewBox="0 0 64 118" fill="none">
        <path
          d="M5 1h54v112L32 96 5 113V1Z"
          fill="var(--wine)"
          stroke="currentColor"
        />
        <path
          d="M11 7h42v95L32 89l-21 13V7Z"
          stroke="currentColor"
          strokeWidth=".6"
        />
        <path d="M1 1h62M1 5h62" stroke="currentColor" strokeWidth=".8" />
        <path d="m32 73 3 5-3 5-3-5 3-5Z" fill="currentColor" />
      </svg>
      <BrandLogo className="pennant-logo" tone="silver" decorative />
    </div>
  );
}
