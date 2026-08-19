// RWS Glyphs — Dashboard
// Generated from the Rob White Studio glyph sheet. Do not hand-edit.
export default function DashboardGlyph({ size = 48, title = "Dashboard", ...props }) {
  const titleId = "rws-dashboard-title";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={title ? "img" : "presentation"}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <defs><filter id="dashboard-grain" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.019" numOctaves="3" seed="3" result="warp"/><feDisplacementMap in="SourceGraphic" in2="warp" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="paint"/><feTurbulence type="fractalNoise" baseFrequency="0.075" numOctaves="3" seed="8" result="mottle"/><feColorMatrix in="mottle" type="matrix" result="mottleA" values="0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.08  0.30 0 0 0 -0.09"/><feComposite in="mottleA" in2="paint" operator="in" result="mottleIn"/><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="16" result="fine"/><feColorMatrix in="fine" type="matrix" result="dark" values="0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.08  0.26 0 0 0 -0.09"/><feComposite in="dark" in2="paint" operator="in" result="darkIn"/><feTurbulence type="fractalNoise" baseFrequency="1.05" numOctaves="2" seed="32" result="fleck"/><feColorMatrix in="fleck" type="matrix" result="light" values="0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0 0.85  1.9 0 0 0 -1.45"/><feComposite in="light" in2="paint" operator="in" result="lightIn"/><feMerge><feMergeNode in="paint"/><feMergeNode in="mottleIn"/><feMergeNode in="darkIn"/><feMergeNode in="lightIn"/></feMerge></filter><clipPath id="dashboard-clip"><path d="M20,13 L80,9 Q85,9 85,15 L87,80 Q87,87 81,87 L18,84 Q12,84 12,78 L14,19 Q14,13 20,13 Z"/></clipPath></defs><g filter="url(#dashboard-grain)"><g clipPath="url(#dashboard-clip)"><path d="M-6,-6 H106 V106 H-6 Z" fill="#5C6B3C"/><path d="M8,90 L54,92 L22,40 L8,48 Z" fill="#D79A24"/><path d="M54,4 L96,4 L96,96 L48,96 Q24,50 54,4 Z" fill="#E5DAC2"/><path d="M70,17 L96,11 L96,80 L63,69 Q52,44 70,17 Z" fill="#C4402F"/></g></g>
    </svg>
  );
}
