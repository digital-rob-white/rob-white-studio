// RWS Glyphs — Labor
// Generated from the Rob White Studio glyph sheet. Do not hand-edit.
export default function LaborGlyph({ size = 48, title = "Labor", ...props }) {
  const titleId = "rws-labor-title";
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
      <defs><filter id="labor-grain" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.019" numOctaves="3" seed="59" result="warp"/><feDisplacementMap in="SourceGraphic" in2="warp" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="paint"/><feTurbulence type="fractalNoise" baseFrequency="0.075" numOctaves="3" seed="64" result="mottle"/><feColorMatrix in="mottle" type="matrix" result="mottleA" values="0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.08  0.30 0 0 0 -0.09"/><feComposite in="mottleA" in2="paint" operator="in" result="mottleIn"/><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="72" result="fine"/><feColorMatrix in="fine" type="matrix" result="dark" values="0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.08  0.26 0 0 0 -0.09"/><feComposite in="dark" in2="paint" operator="in" result="darkIn"/><feTurbulence type="fractalNoise" baseFrequency="1.05" numOctaves="2" seed="88" result="fleck"/><feColorMatrix in="fleck" type="matrix" result="light" values="0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0 0.85  1.9 0 0 0 -1.45"/><feComposite in="light" in2="paint" operator="in" result="lightIn"/><feMerge><feMergeNode in="paint"/><feMergeNode in="mottleIn"/><feMergeNode in="darkIn"/><feMergeNode in="lightIn"/></feMerge></filter><clipPath id="labor-clip"><path d="M23,84 L18,30 L45,13 L82,22 L84,68 L59,88 Z"/></clipPath></defs><g filter="url(#labor-grain)"><g clipPath="url(#labor-clip)"><path d="M-6,-6 H106 V106 H-6 Z" fill="#D79A24"/><path d="M58,4 L80,9 L30,98 L8,86 Z" fill="#E5DAC2"/><path d="M80,9 L98,14 L98,100 L30,98 Z" fill="#1D5875"/><path d="M78,6 L98,11 L98,28 Z" fill="#E5DAC2"/></g></g>
    </svg>
  );
}
