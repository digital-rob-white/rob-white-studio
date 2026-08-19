// RWS Glyphs — CNC
// Generated from the Rob White Studio glyph sheet. Do not hand-edit.
export default function CncGlyph({ size = 48, title = "CNC", ...props }) {
  const titleId = "rws-cnc-title";
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
      <defs><filter id="cnc-grain" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.019" numOctaves="3" seed="87" result="warp"/><feDisplacementMap in="SourceGraphic" in2="warp" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="paint"/><feTurbulence type="fractalNoise" baseFrequency="0.075" numOctaves="3" seed="92" result="mottle"/><feColorMatrix in="mottle" type="matrix" result="mottleA" values="0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.08  0.30 0 0 0 -0.09"/><feComposite in="mottleA" in2="paint" operator="in" result="mottleIn"/><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="100" result="fine"/><feColorMatrix in="fine" type="matrix" result="dark" values="0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.08  0.26 0 0 0 -0.09"/><feComposite in="dark" in2="paint" operator="in" result="darkIn"/><feTurbulence type="fractalNoise" baseFrequency="1.05" numOctaves="2" seed="116" result="fleck"/><feColorMatrix in="fleck" type="matrix" result="light" values="0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0 0.85  1.9 0 0 0 -1.45"/><feComposite in="light" in2="paint" operator="in" result="lightIn"/><feMerge><feMergeNode in="paint"/><feMergeNode in="mottleIn"/><feMergeNode in="darkIn"/><feMergeNode in="lightIn"/></feMerge></filter><clipPath id="cnc-clip"><path d="M22,88 L22,44 C22,23 34,9 50,9 C66,9 78,23 78,44 L78,88 Z"/></clipPath></defs><g filter="url(#cnc-grain)"><g clipPath="url(#cnc-clip)"><path d="M-6,-6 H106 V106 H-6 Z" fill="#D79A24"/><path d="M32,94 L32,46 C32,32 40,23 50,23 C60,23 68,32 68,46 L68,94 Z" fill="#E5DAC2"/><path d="M50,32 C57,32 62,38 62,44 C62,49 58,51 57,56 L58,90 L42,90 L43,56 C42,51 38,49 38,44 C38,38 43,32 50,32 Z" fill="#211F1C"/></g></g>
    </svg>
  );
}
