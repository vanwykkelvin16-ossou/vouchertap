const MASK: React.CSSProperties = {
  WebkitMaskImage: "url(/brand-heart.png)",
  maskImage: "url(/brand-heart.png)",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

/**
 * The So Love Krugersdorp brand heart — rendered from the official logo file
 * (public/brand-heart.png) via a CSS mask, so it takes the current text
 * colour: white inside primary chips, brand red on light surfaces.
 */
export function BrandHeart({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block bg-current shrink-0 ${className ?? ""}`}
      style={MASK}
    />
  );
}
