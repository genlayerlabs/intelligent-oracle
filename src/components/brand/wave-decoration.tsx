import type { SVGProps } from "react";

export function WaveDecoration({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1200 400"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9b6af6" stopOpacity="0" />
          <stop offset="50%" stopColor="#9b6af6" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#e37df7" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wave-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#110fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#9b6af6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#9b6af6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wave-grad-3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e37df7" stopOpacity="0" />
          <stop offset="50%" stopColor="#e37df7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#9b6af6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,200 C200,120 400,280 600,200 C800,120 1000,280 1200,200"
        fill="none"
        stroke="url(#wave-grad-1)"
        strokeWidth="1.5"
      />
      <path
        d="M0,220 C200,140 400,300 600,220 C800,140 1000,300 1200,220"
        fill="none"
        stroke="url(#wave-grad-2)"
        strokeWidth="1"
      />
      <path
        d="M0,180 C200,260 400,100 600,180 C800,260 1000,100 1200,180"
        fill="none"
        stroke="url(#wave-grad-3)"
        strokeWidth="1.25"
      />
      <path
        d="M0,240 C300,160 500,320 700,240 C900,160 1100,320 1200,240"
        fill="none"
        stroke="url(#wave-grad-1)"
        strokeWidth="0.75"
      />
    </svg>
  );
}
