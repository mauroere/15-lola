type BrandLogoProps = {
  className?: string;
  tone?: "wine" | "silver";
  decorative?: boolean;
};

// The canonical SVG also supplies the favicon and social preview.
export default function BrandLogo({
  className = "",
  tone = "wine",
  decorative = false,
}: BrandLogoProps) {
  return (
    <img
      src="/brand/lola-escudo.svg"
      alt={decorative ? "" : "Escudo de Lola con corona y letra L"}
      width={120}
      height={170}
      className={`brand-logo brand-logo--${tone} ${className}`}
    />
  );
}
