import logoHorizontal from "@/assets/logo-horizontal.png";
import logoStacked from "@/assets/logo-stacked.png";

type Variant = "horizontal" | "stacked";

export function Logo({
  className,
  variant = "horizontal",
}: {
  className?: string;
  variant?: Variant;
}) {
  const src = variant === "stacked" ? logoStacked : logoHorizontal;
  return (
    <img
      src={src}
      alt="Banyamulenge Heritage Hub"
      className={className}
    />
  );
}
