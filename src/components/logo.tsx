import logoAsset from "@/assets/logo.png.asset.json";

export function Logo({ className }: { className?: string }) {
  return <img src={logoAsset.url} alt="Banyamulenge Community Heritage" className={className} />;
}
