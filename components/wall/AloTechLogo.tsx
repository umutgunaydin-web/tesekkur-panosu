import { cn } from "@/lib/utils";

type AloTechLogoProps = {
  className?: string;
  tone?: "light" | "dark";
};

/**
 * AloTech kelime markası. Gerçek logo dosyası eklendiğinde burayı
 * <Image src="/alotech.svg" /> ile değiştirmek yeterli.
 */
export function AloTechLogo({ className, tone = "light" }: AloTechLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-start font-extrabold tracking-tight",
        tone === "light" ? "text-white" : "text-brand-900",
        className,
      )}
    >
      <span>AloTech</span>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        strokeLinecap="round"
        className="-mt-[0.1em] ml-[0.12em] h-[0.62em] w-[0.62em]"
      >
        <path d="M13 3 L20 9" stroke="#FBC93D" strokeWidth={3} />
        <path d="M6 7 L11 11" stroke="#FBC93D" strokeWidth={3} />
        <path d="M15 15 L21 19" stroke="#FBC93D" strokeWidth={3} />
      </svg>
    </span>
  );
}
