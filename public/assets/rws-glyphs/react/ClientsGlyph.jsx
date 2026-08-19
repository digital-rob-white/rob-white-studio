// RWS Glyphs — Clients
// Generated from the Rob White Studio glyph sheet. Do not hand-edit.
export default function ClientsGlyph({ size = 48, title = "Clients", ...props }) {
  const titleId = "rws-clients-title";
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
      <defs><filter id="clients-grain" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.019" numOctaves="3" seed="38" result="warp"/><feDisplacementMap in="SourceGraphic" in2="warp" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="paint"/><feTurbulence type="fractalNoise" baseFrequency="0.075" numOctaves="3" seed="43" result="mottle"/><feColorMatrix in="mottle" type="matrix" result="mottleA" values="0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.08  0.30 0 0 0 -0.09"/><feComposite in="mottleA" in2="paint" operator="in" result="mottleIn"/><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="51" result="fine"/><feColorMatrix in="fine" type="matrix" result="dark" values="0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.08  0.26 0 0 0 -0.09"/><feComposite in="dark" in2="paint" operator="in" result="darkIn"/><feTurbulence type="fractalNoise" baseFrequency="1.05" numOctaves="2" seed="67" result="fleck"/><feColorMatrix in="fleck" type="matrix" result="light" values="0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0 0.85  1.9 0 0 0 -1.45"/><feComposite in="light" in2="paint" operator="in" result="lightIn"/><feMerge><feMergeNode in="paint"/><feMergeNode in="mottleIn"/><feMergeNode in="darkIn"/><feMergeNode in="lightIn"/></feMerge></filter><clipPath id="clients-clip"><path d="M50,8 C73,8 92,27 92,50 C92,73 73,92 50,92 C27,92 8,73 8,50 C8,27 27,8 50,8 Z"/></clipPath></defs><g filter="url(#clients-grain)"><g clipPath="url(#clients-clip)"><path d="M-6,-6 H106 V106 H-6 Z" fill="#1D5875"/><path d="M50,50 L50,-4 L104,-4 L104,46 Z" fill="#5C6B3C"/><path d="M50,50 L104,48 L104,104 L54,104 Z" fill="#164A63"/><path d="M50,50 L52,104 L-4,104 L-4,54 Z" fill="#D79A24"/><path d="M50,3 L50,97 M6,53 L96,46" fill="none" stroke="#E5DAC2" strokeWidth="4.5" strokeLinecap="round"/></g></g>
    </svg>
  );
}
