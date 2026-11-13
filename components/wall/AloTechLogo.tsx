import { cn } from "@/lib/utils";

type AloTechLogoProps = {
  className?: string;
  /** Logo hem açık hem lacivert zeminde okunur; ayrım ileride gerekirse diye tutuluyor. */
  tone?: "light" | "dark";
};

/** AloTech kurumsal logosu (kırmızı "ALO", gri "TECH", "A CLOUD COMPANY"). Boyu yazı boyutuna göre ölçeklenir. */
export function AloTechLogo({ className }: AloTechLogoProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- küçük, sabit marka görseli */}
      <img
        src="/alotech-logo.png"
        alt="AloTech"
        width={1006}
        height={170}
        className="h-[1.1em] w-auto max-w-full"
      />
    </span>
  );
}
