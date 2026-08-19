// RWS Glyphs — Projects
// Generated from the Rob White Studio glyph sheet. Do not hand-edit.
export default function ProjectsGlyph({ size = 48, title = "Projects", ...props }) {
  const titleId = "rws-projects-title";
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
      <defs><filter id="projects-grain" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.019" numOctaves="3" seed="45" result="warp"/><feDisplacementMap in="SourceGraphic" in2="warp" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="paint"/><feTurbulence type="fractalNoise" baseFrequency="0.075" numOctaves="3" seed="50" result="mottle"/><feColorMatrix in="mottle" type="matrix" result="mottleA" values="0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.08  0.30 0 0 0 -0.09"/><feComposite in="mottleA" in2="paint" operator="in" result="mottleIn"/><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="58" result="fine"/><feColorMatrix in="fine" type="matrix" result="dark" values="0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.08  0.26 0 0 0 -0.09"/><feComposite in="dark" in2="paint" operator="in" result="darkIn"/><feTurbulence type="fractalNoise" baseFrequency="1.05" numOctaves="2" seed="74" result="fleck"/><feColorMatrix in="fleck" type="matrix" result="light" values="0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0 0.85  1.9 0 0 0 -1.45"/><feComposite in="light" in2="paint" operator="in" result="lightIn"/><feMerge><feMergeNode in="paint"/><feMergeNode in="mottleIn"/><feMergeNode in="darkIn"/><feMergeNode in="lightIn"/></feMerge></filter><clipPath id="projects-clip"><path d="M18,86 L18,44 L52,14 L84,42 L84,86 Z"/></clipPath></defs><g filter="url(#projects-grain)"><g clipPath="url(#projects-clip)"><path d="M-6,-6 H106 V106 H-6 Z" fill="#E5DAC2"/><path d="M12,52 L52,11 L52,55 Z" fill="#1D5875"/><path d="M52,11 L92,44 L88,58 L52,50 Z" fill="#5C6B3C"/><path d="M10,96 L10,55 L52,96 Z" fill="#D79A24"/></g></g>
    </svg>
  );
}
