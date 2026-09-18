import type { SVGProps } from "react";

/** Vector outline of the supplied Castline fish, without its background tile. */
export function FishIcon({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="60 125 430 250" fill="none" aria-hidden="true" focusable="false" {...props}>
      <path d="M85 249C85 218 161 180 237 180C276 180 300 187 325 195C359 208 397 168 433 153C453 143 465 170 465 190C465 214 452 232 442 244C437 251 453 264 460 288C469 313 465 333 451 344C436 359 398 322 365 307C345 297 332 298 317 304C288 315 266 318 238 318C163 318 86 283 85 249Z" stroke="currentColor" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="189" cy="223" r="15.5" fill="currentColor" />
    </svg>
  );
}
