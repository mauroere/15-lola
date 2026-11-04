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
export function Crest({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`crest ${className}`}>
      <svg viewBox="0 0 100 118" fill="none" aria-hidden="true">
        <path
          d="M50 5c14 13 29 16 40 15v47c0 24-23 36-40 47-17-11-40-23-40-47V20c11 1 26-2 40-15Z"
          stroke="currentColor"
        />
        <path
          d="M50 13c11 10 23 13 33 13v40c0 19-17 30-33 40-16-10-33-21-33-40V26c10 0 22-3 33-13Z"
          stroke="currentColor"
          strokeWidth=".5"
        />
        <path d="M35 21h30M35 90h30" stroke="currentColor" strokeWidth=".5" />
      </svg>
      <span>{children || "XV"}</span>
    </div>
  );
}
